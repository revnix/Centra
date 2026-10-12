"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Question {
    id: number;
    question: string;
    options: string[];
    difficulty: string;
}

interface TestData {
    token: string;
    status: string;
    total_questions: number;
    time_limit_minutes: number;
    questions: Question[];
    candidate_name: string;
    job_title: string;
}

type PageState = "loading" | "error" | "recording-prompt" | "active" | "submitting" | "done";

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function ScreeningTestPage() {
    const params = useParams();
    const token = params?.token as string;

    const [pageState, setPageState] = useState<PageState>("loading");
    const [testData, setTestData] = useState<TestData | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [finalResult, setFinalResult] = useState<{ correct: number; total: number } | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recordingBlobRef = useRef<Blob | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const submittingRef = useRef(false);

    // ── fetch test ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        fetch(`/api/v1/screening/test/${token}`)
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.detail || "Failed to load test");
                }
                return res.json();
            })
            .then((data: TestData) => {
                setTestData(data);
                setAnswers(new Array(data.total_questions).fill(null));
                setTimeLeft(data.time_limit_minutes * 60);
                setPageState("recording-prompt");
            })
            .catch((err) => {
                setErrorMsg(err.message || "Could not load the screening test.");
                setPageState("error");
            });
    }, [token]);

    // ── submit logic (stable ref so timer can call it) ──────────────────────────
    const submitTest = useCallback(
        async (finalAnswers: (number | null)[]) => {
            if (submittingRef.current) return;
            submittingRef.current = true;
            if (timerRef.current) clearInterval(timerRef.current);
            setPageState("submitting");

            // Stop recording — use addEventListener so the original onstop (blob creation) still fires
            let recordingUrl: string | undefined;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                await new Promise<void>((resolve) => {
                    mediaRecorderRef.current!.addEventListener("stop", () => resolve(), { once: true });
                    mediaRecorderRef.current!.stop();
                });
                // Give the onstop handler a tick to finish creating the blob
                await new Promise<void>((resolve) => setTimeout(resolve, 100));
            }
            if (recordingBlobRef.current && recordingBlobRef.current.size > 0) {
                const blobType = recordingBlobRef.current.type || "video/webm";
                const ext = blobType.includes("mp4") ? ".mp4" : ".webm";
                console.log(`Recording blob ready: ${(recordingBlobRef.current.size / 1024 / 1024).toFixed(1)} MB, type: ${blobType}`);
                try {
                    // Step 1: get a short-lived Cloudinary signed-upload credential from backend.
                    // This is a tiny JSON request — backend restarts don't affect the large upload.
                    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "http://127.0.0.1:8123";
                    const sigRes = await fetch(`${backendBase}/api/v1/uploads/cloudinary-signature`);
                    if (!sigRes.ok) throw new Error("Failed to get upload signature");
                    const sig = await sigRes.json();

                    // Step 2: upload directly from browser to Cloudinary — zero backend involvement,
                    // so backend restarts / ECONNRESET cannot affect the file transfer.
                    const fd = new FormData();
                    fd.append("file", recordingBlobRef.current, `screening${ext}`);
                    fd.append("api_key", sig.api_key);
                    fd.append("timestamp", String(sig.timestamp));
                    fd.append("signature", sig.signature);
                    fd.append("folder", sig.folder);

                    const cloudRes = await fetch(
                        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
                        { method: "POST", body: fd }
                    );
                    if (cloudRes.ok) {
                        const cloudData = await cloudRes.json();
                        recordingUrl = cloudData.secure_url;
                        console.log("Recording uploaded to Cloudinary:", recordingUrl);
                    } else {
                        const errBody = await cloudRes.json().catch(() => ({}));
                        console.error("Cloudinary upload failed:", cloudRes.status, errBody);
                    }
                } catch (err) {
                    console.error("Recording upload error:", err);
                }
            } else {
                console.warn("Recording blob is empty or missing — skipping upload", {
                    blob: recordingBlobRef.current,
                    size: recordingBlobRef.current?.size,
                    chunks: chunksRef.current.length,
                });
            }

            // Submit answers
            try {
                const res = await fetch(`/api/v1/screening/submit/${token}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answers: finalAnswers, recording_url: recordingUrl ?? null }),
                });
                const data = await res.json();
                if (typeof data.correct_count === "number" && typeof data.total_questions === "number") {
                    setFinalResult({ correct: data.correct_count, total: data.total_questions });
                }
            } catch {
                // show done anyway
            }
            setPageState("done");
        },
        [token]
    );

    // ── countdown timer ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (pageState !== "active") return;
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    setAnswers((a) => {
                        submitTest(a);
                        return a;
                    });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [pageState, submitTest]);

    const [recordingError, setRecordingError] = useState("");

    // ── request screen share and start recording ─────────────────────────────────
    const startRecording = async () => {
        setRecordingError("");

        // Check if browser/environment context supports mediaDevices (requires HTTPS or localhost in modern browsers)
        if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            console.warn("navigator.mediaDevices or getDisplayMedia is not available (insecure context or unsupported browser). Bypassing screen recording for dev/testing.");
            setPageState("active");
            return;
        }

        try {
            let stream: MediaStream;
            try {
                // Try requesting both screen and audio
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } catch (mediaError) {
                console.warn("Failed to get display media with audio, retrying with video only...", mediaError);
                // Fallback to video only in case audio device is missing or sharing audio is unsupported
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            }

            // Pick the best supported mimeType across Chrome/Firefox/Edge/Safari
            const mimeType = [
                "video/webm;codecs=vp9,opus",
                "video/webm;codecs=vp8,opus",
                "video/webm;codecs=vp8",
                "video/webm",
                "video/mp4",
            ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            const blobType = mimeType || "video/webm";
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                recordingBlobRef.current = new Blob(chunksRef.current, { type: blobType });
                stream.getTracks().forEach((t) => t.stop());
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setPageState("active");
        } catch (err) {
            console.error("Screen recording setup failed:", err);

            // Check if we are running in local/development IP or localhost to allow bypass on permission refusal or hardware failure
            const isLocal = typeof window !== "undefined" && (
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1" ||
                window.location.hostname.startsWith("192.168.") ||
                window.location.hostname.startsWith("172.") ||
                window.location.hostname.startsWith("10.")
            );

            if (isLocal) {
                console.warn("Dev/testing mode detected: Proceeding to test without screen recording due to setup failure.");
                setPageState("active");
                return;
            }

            setRecordingError("Screen recording is required. Please click 'Allow' when your browser asks for permission, then try again.");
        }
    };

    const selectAnswer = (optionIndex: number) => {
        setAnswers((prev) => {
            const next = [...prev];
            next[currentIndex] = optionIndex;
            return next;
        });
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const isTimeLow = timeLeft < 120;
    const progress = testData ? ((currentIndex + 1) / testData.total_questions) * 100 : 0;
    const answered = answers.filter((a) => a !== null).length;

    // ── renders ─────────────────────────────────────────────────────────────────

    if (pageState === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500">Loading your screening test…</p>
                </div>
            </div>
        );
    }

    if (pageState === "error") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">✗</div>
                    <h1 className="text-xl font-bold text-slate-800">Unable to Load Test</h1>
                    <p className="text-slate-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    if (pageState === "recording-prompt") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full space-y-6">
                    <div className="text-center space-y-2">
                        <div className="text-5xl mb-4">🖥️</div>
                        <h1 className="text-2xl font-bold text-slate-800">Screen Recording Required</h1>
                        <p className="text-slate-500">
                            Hi <span className="font-semibold text-slate-700">{testData?.candidate_name}</span>! Screen
                            recording is <strong>mandatory</strong> for this test. You cannot proceed without it.
                        </p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700 space-y-1">
                        <p>📋 <strong>{testData?.total_questions} questions</strong> — {testData?.job_title}</p>
                        <p>⏱️ <strong>{testData?.time_limit_minutes} minutes</strong> time limit</p>
                        <p>🔴 Screen sharing is required — click <strong>Allow/Share</strong> when prompted</p>
                    </div>
                    {recordingError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                            ⚠️ {recordingError}
                        </div>
                    )}
                    <button
                        onClick={startRecording}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                    >
                        Share Screen &amp; Start Test
                    </button>
                </div>
            </div>
        );
    }

    if (pageState === "submitting") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500">Uploading recording and submitting your answers…</p>
                </div>
            </div>
        );
    }

    if (pageState === "done") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
                    <div className="text-6xl">🎉</div>
                    <h1 className="text-2xl font-bold text-slate-800">Test Completed!</h1>
                    <p className="text-slate-500">Your results have been submitted. Our team will review them and get back to you shortly.</p>
                    {finalResult !== null && (
                        <div className="bg-indigo-50 rounded-xl p-4">
                            <p className="text-sm text-indigo-600 font-medium">Your Score</p>
                            <p className="text-4xl font-bold text-indigo-700">{finalResult.correct}/{finalResult.total}</p>
                        </div>
                    )}
                    <p className="text-xs text-slate-400">You may close this window.</p>
                </div>
            </div>
        );
    }

    // ── active test ─────────────────────────────────────────────────────────────
    const question = testData!.questions[currentIndex];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{testData!.candidate_name}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm text-slate-500">{testData!.job_title}</span>
                </div>
                <div className={`text-lg font-bold tabular-nums px-4 py-1 rounded-full ${isTimeLow ? "bg-red-100 text-red-600 animate-pulse" : "bg-indigo-100 text-indigo-700"}`}>
                    ⏱ {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress */}
            <div className="bg-white border-b border-slate-100 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Question {currentIndex + 1} of {testData!.total_questions}</span>
                    <span>{answered} answered</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Question */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${question.difficulty === "advanced" ? "bg-red-100 text-red-700" : question.difficulty === "intermediate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                                {question.difficulty}
                            </span>
                            <span className="text-xs text-slate-400">Q{currentIndex + 1}</span>
                        </div>
                        <p className="text-slate-800 font-medium text-lg leading-relaxed">{question.question}</p>
                    </div>

                    <div className="space-y-3">
                        {question.options.map((option, i) => {
                            const selected = answers[currentIndex] === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => selectAnswer(i)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${selected ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"}`}
                                >
                                    <span className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 text-slate-500"}`}>
                                        {OPTION_LABELS[i]}
                                    </span>
                                    <span className="text-sm leading-relaxed">{option}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                            disabled={currentIndex === 0}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                            ← Previous
                        </button>

                        {currentIndex < testData!.total_questions - 1 ? (
                            <button
                                onClick={() => setCurrentIndex((i) => i + 1)}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={() => submitTest(answers)}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                            >
                                Submit Test ✓
                            </button>
                        )}
                    </div>

                    {/* Question palette */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500 mb-3 font-medium">Question Navigator</p>
                        <div className="flex flex-wrap gap-2">
                            {testData!.questions.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${i === currentIndex ? "bg-indigo-600 text-white" : answers[i] !== null ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
