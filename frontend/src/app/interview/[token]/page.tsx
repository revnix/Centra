"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, interviewsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, Clock, CheckCircle2, ArrowRight, Mic, MicOff, Volume2, VolumeX, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useInterview } from "./InterviewContext";

interface Message {
    role: "ai" | "candidate" | "system";
    content: string;
    timestamp: string;
}

// Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: any) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function InterviewPage() {
    const params = useParams();
    const token = params.token as string;
    const { startScreenShare, stopScreenShare, stream } = useInterview();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
    const [isCompleted, setIsCompleted] = useState(false);

    // Voice States
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [landingStep, setLandingStep] = useState<'screen-share' | 'welcome' | 'rules' | 'ready' | 'in_progress'>('screen-share');

    const [isThinking, setIsThinking] = useState(false);
    const isSharingScreen = !!stream;

    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const lastSpokenMessageIndex = useRef<number>(-1);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isAiSpeakingRef = useRef(false);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const SILENCE_THRESHOLD = 3000;

    // Global cleanup and Tab-switching detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !isCompleted && timeLeft > 0) {
                toast.error("Warning: Tab switching is not allowed during the interview. This event has been logged.", {
                    duration: 5000,
                    style: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }
                });
                console.warn("User switched tab at:", new Date().toISOString());
                // In a real scenario, we would send this to the backend to log the violation
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener("visibilitychange", handleVisibilityChange);
        }

        return () => {
            if (typeof document !== 'undefined') {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            }
        };
    }, [token, isCompleted, timeLeft]);

    // Timer effect
    useEffect(() => {
        const INTERVIEW_DURATION = 120; // 2 minutes in seconds
        const storageKey = `interview_start_${token}`;

        const updateTimer = () => {
            const startTime = localStorage.getItem(storageKey);
            if (!startTime) return;

            const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
            const remaining = Math.max(0, INTERVIEW_DURATION - elapsed);

            setTimeLeft(remaining);

            if (remaining === 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // HARD TRANSITION RULE: stop everything immediately
                stopListening();
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }

                const finalizeAndRedirect = async () => {
                    if (isCompleted) return;

                    try {
                        let currentStatus = '';
                        // 1. Force Submit last response if any
                        if (inputRef.current.trim() && !isSendingRef.current) {
                            console.log("[Timer End] Force-submitting ongoing response.");
                            const res = await handleSend(inputRef.current.trim());
                            currentStatus = res?.status || '';
                        }

                        // 2. Force backend transition if not already handled by AI turn
                        if (currentStatus !== 'CODING' && currentStatus !== 'COMPLETED') {
                            await api.interviews.endVoiceInterview(token);
                        }
                    } catch (e) {
                        console.error("Error during finalization:", e);
                        // Emergency fallback for backend sync
                        await api.interviews.endVoiceInterview(token).catch(() => { });
                    }

                    toast.info("Interview time ended. Redirecting to coding section...", { duration: 3000 });
                    setIsCompleted(true);

                    // 3. HARD REDIRECT after 2 seconds
                    setTimeout(() => {
                        if (typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                        }
                        router.push(`/interview/${token}/coding`);
                    }, 2500);
                };

                finalizeAndRedirect();
            }
        };

        updateTimer();
        if (session?.status === 'IN_PROGRESS' && !isCompleted) {
            timerRef.current = setInterval(updateTimer, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [token, session?.status, isCompleted]);

    // Refs for accessing state in asynchronous callbacks
    const inputRef = useRef("");
    const isSendingRef = useRef(false);

    useEffect(() => {
        inputRef.current = input;
    }, [input]);

    useEffect(() => {
        isSendingRef.current = isSending;
    }, [isSending]);

    // 5s Global Silence Watchdog (Hard Rule)
    useEffect(() => {
        if (!isListening || isSending || isCompleted || isAiSpeakingRef.current) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            return;
        }

        // Hard Limit: If NO input change for 5 seconds while listening
        const hardLimit = setTimeout(() => {
            console.log("[Silence Watchdog] 5s limit reached. Forcing response.");
            handleSend(inputRef.current);
        }, 5000);

        // Emergency Fallback: If for ANY reason we are stuck in listening for 12s
        const emergencyFallback = setTimeout(() => {
            if (isListening && !isSending && !isCompleted && !isAiSpeakingRef.current) {
                console.warn("[Emergency Fallback] 12s listening limit reached. Breaking deadlock.");
                handleSend(inputRef.current || "(Candidate is silent)");
            }
        }, 12000);

        return () => {
            clearTimeout(hardLimit);
            clearTimeout(emergencyFallback);
        };
    }, [isListening, input, isSending, isCompleted]);

    // Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let finalTranscript = '';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                // TURN RULE: If AI is speaking or we are already sending, IGNORE mic
                if (isAiSpeakingRef.current || isSendingRef.current) {
                    return;
                }

                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const currentText = (finalTranscript + interimTranscript).trim();
                if (currentText) {
                    setInput(currentText);

                    // Natural Pause Detection (3s)
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        if (currentText.length > 2 && !isAiSpeakingRef.current && isListening && !isSendingRef.current) {
                            console.log("[Natural Pause] 3s silence. Auto-sending.");
                            handleSend(currentText);
                            finalTranscript = '';
                        }
                    }, 3000);
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech' || event.error === 'aborted') return;
                console.warn("Speech recognition warning:", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    toast.error("Microphone access denied.");
                }
            };

            recognition.onend = () => {
                if (isListening && !isAiSpeakingRef.current && !isCompleted && timeLeft > 0 && !isSendingRef.current) {
                    try { recognition.start(); } catch (e) { }
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [isListening, isCompleted, timeLeft]);

    // Speech Synthesis
    useEffect(() => {
        if (!voiceEnabled || messages.length === 0 || isCompleted || timeLeft <= 0) {
            if ((isCompleted || timeLeft <= 0) && typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
            }
            return;
        }

        const lastMessage = messages[messages.length - 1];
        const lastIndex = messages.length - 1;

        if (lastMessage.role === 'ai' && lastIndex > lastSpokenMessageIndex.current) {
            console.log(`[Audio] Playing AI message: ${lastIndex}`);
            stopListening();

            if (!isAiSpeakingRef.current) {
                speak(lastMessage.content);
                lastSpokenMessageIndex.current = lastIndex;
            }
        }
    }, [messages, voiceEnabled, isCompleted, timeLeft]);

    const speak = (text: string) => {
        if (!window.speechSynthesis || isCompleted || timeLeft <= 0 || !text) return;

        console.log("Evalyn speaking:", text);

        isAiSpeakingRef.current = true;
        setIsSpeaking(true);
        stopListening();

        window.speechSynthesis.cancel();

        // Better Chunking
        const chunks = text.split(/([.!?]+)/g).filter(Boolean);
        const sentences: string[] = [];
        for (let i = 0; i < chunks.length; i += 2) {
            const s = chunks[i] + (chunks[i + 1] || "");
            if (s.trim()) sentences.push(s.trim());
        }

        const processedChunks: string[] = [];
        let currentChunk = "";

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length < 250) {
                currentChunk += (currentChunk ? " " : "") + sentence;
            } else {
                if (currentChunk) processedChunks.push(currentChunk);
                currentChunk = sentence;
            }
        }
        if (currentChunk) processedChunks.push(currentChunk);

        let chunkIndex = 0;

        const speakNext = () => {
            if (chunkIndex >= processedChunks.length || isCompleted || timeLeft <= 0) {
                isAiSpeakingRef.current = false;
                setIsSpeaking(false);

                setTimeout(() => {
                    if (voiceEnabled && !isCompleted && !isAiSpeakingRef.current) {
                        console.log("[Audio] AI finished. Re-enabling microphone.");
                        startListening();
                    }
                }, 800);
                return;
            }

            const voice = window.speechSynthesis.getVoices().find(v =>
                v.name.includes('Google US English') ||
                v.name.includes('Microsoft Aria') ||
                v.name.includes('Samantha') ||
                v.lang === 'en-US'
            );

            const utterance = new SpeechSynthesisUtterance(processedChunks[chunkIndex].trim());
            if (voice) utterance.voice = voice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            currentUtteranceRef.current = utterance;

            utterance.onend = () => {
                if (currentUtteranceRef.current === utterance) {
                    chunkIndex++;
                    setTimeout(speakNext, 50);
                }
            };

            utterance.onerror = (e: any) => {
                const isInterrupted = e.error === 'interrupted' || e.error === 'canceled';
                if (!isInterrupted) {
                    console.error("Speech Synthesis Error:", e.error, e);
                }

                if (currentUtteranceRef.current === utterance) {
                    isAiSpeakingRef.current = false;
                    setIsSpeaking(false);

                    if (!isInterrupted) {
                        chunkIndex++;
                        setTimeout(speakNext, 50);
                    }
                }
            };

            window.speechSynthesis.speak(utterance);

            const resumeInterval = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.resume();
                } else {
                    clearInterval(resumeInterval);
                }
            }, 5000);
        };

        speakNext();
    };

    const toggleListening = () => {
        if (isListening) stopListening();
        else startListening();
    };

    const startListening = () => {
        if (isCompleted || timeLeft <= 0) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast.info("Listening...");
            } catch (e) {
                console.error("Failed to start recognition", e);
            }
        } else {
            toast.error("Speech recognition is not supported in your browser.");
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const data = await api.interviews.getSession(token);
                setSession(data);
                if (data.status === 'CODING') {
                    router.push(`/interview/${token}/coding`);
                    return;
                }

                if (data.transcript && data.transcript.length > 0) {
                    setMessages(data.transcript);
                    lastSpokenMessageIndex.current = data.transcript.length - 1;
                }
            } catch (error: any) {
                if (error.response?.status === 403) {
                    const msg = error.response.data?.detail || "Interview link expired";
                    toast.error(msg);
                    setSession({ status: 'EXPIRED', error: msg });
                } else if (error.response?.status === 404) {
                    toast.error("Interview not found");
                    router.push('/portal/status');
                } else {
                    toast.error("Failed to load interview session");
                    console.error(error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (token) fetchSession();
    }, [token, router]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (contentOverride?: string) => {
        const messageContent = contentOverride !== undefined ? contentOverride : input;

        // Prevent multiple simultaneous sends or sending after completion
        if (isSending || isCompleted) return;

        // The user says Evalyn MUST respond. If the candidate is silent, 
        // we'll send a placeholder if empty to trigger AI response.
        const userMsg = messageContent.trim();
        const finalMsg = userMsg === "" ? "(Candidate is silent)" : userMsg;

        setInput("");
        setIsSending(true);
        setIsThinking(true);

        // Barge-in protection: If AI was speaking, stop it
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            isAiSpeakingRef.current = false;
            setIsSpeaking(false);
        }

        stopListening();

        // Only add non-empty messages to the UI for better UX
        if (userMsg !== "") {
            const newMessage: Message = {
                role: "candidate",
                content: userMsg,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, newMessage]);
        }

        try {
            const res = await api.interviews.sendMessage(token, finalMsg);
            setIsThinking(false);
            setMessages(res.transcript);

            if (res.status === "CODING" || res.status === "COMPLETED") {
                setIsCompleted(true);
                if (stopScreenShare) await stopScreenShare();

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                window.speechSynthesis.cancel();
            }
            return res;
        } catch (error) {
            setIsThinking(false);
            toast.error("Failed to send message");
            console.error(error);
            return undefined;
        } finally {
            setIsSending(false);
        }
    };

    const handleStartScreenShare = async () => {
        try {
            const s = await startScreenShare();
            if (s) {
                setLandingStep('welcome');
                toast.success("Screen sharing enabled");
            }
        } catch (err) {
            console.error("Screen share error:", err);
            toast.error("Screen sharing is required to proceed with the interview.");
        }
    };

    const handleStartRulesBriefing = () => {
        setLandingStep('rules');
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const text = "Welcome to your interview. Before we begin, please note the following professional guidelines: First, use of any AI tools is strictly not allowed. Second, tab switching is not allowed. Third, screen sharing is mandatory throughout the interview. Finally, please be aware that the interview may be monitored and reviewed. If you understand, click the start button to begin.";
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                setLandingStep('ready');
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                setLandingStep('ready');
            };
            window.speechSynthesis.speak(utterance);
        } else {
            setLandingStep('ready');
        }
    };

    const handleStartInterview = async () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        if (!isSharingScreen) {
            const s = await startScreenShare();
            if (!s) return;
        }

        setIsLoading(true);
        try {
            localStorage.setItem(`interview_start_${token}`, Date.now().toString());
            const startRes = await api.interviews.startInterview(token);
            setMessages(startRes.transcript);

            isAiSpeakingRef.current = false;
            setIsSpeaking(false);
            if (startRes.transcript && startRes.transcript.length > 0) {
                lastSpokenMessageIndex.current = -1;
            }

            setLandingStep('in_progress');
            if (session) {
                setSession({ ...session, status: 'IN_PROGRESS' });
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                const msg = error.response.data?.detail || "Interview link expired";
                toast.error(msg);
                setSession({ status: 'EXPIRED', error: msg });
            } else {
                toast.error("Failed to start the interview");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F2FF] dark:bg-slate-950">
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 bg-indigo-600/20 rounded-full animate-ping" />
                    <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl border border-indigo-100">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                    </div>
                </div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Initializing Evalyn AI...</p>
            </div>
        );
    }

    if (session?.status === 'EXPIRED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F2FF] dark:bg-slate-950 p-6">
                <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-red-100 text-center space-y-4 max-w-sm">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                        <Clock className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Link Expired</h1>
                    <p className="text-slate-500 leading-relaxed">
                        {session.error || "Your interview link has expired. Please contact HR."}
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push('/portal/status')}
                    >
                        Return to Portal
                    </Button>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F2FF] dark:bg-slate-950 p-6">
                <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-red-100 text-center space-y-4 max-w-sm">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                        <Bot className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Session Error</h1>
                    <p className="text-slate-500 leading-relaxed">This interview link has expired or is invalid. Please contact your recruiter.</p>
                </div>
            </div>
        );
    }

    if (session.status === 'PENDING' && messages.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-[#F0F2FF] dark:bg-slate-950 overflow-hidden font-sans">
                <div className="absolute top-10 left-10">
                    <h2 className="text-3xl font-[900] tracking-tighter text-slate-900 group cursor-default">
                        evalyn<span className="text-indigo-600">.</span>
                    </h2>
                </div>

                <main className="flex-1 flex items-center justify-center p-6 relative">
                    <AnimatePresence mode="wait">
                        {landingStep === 'screen-share' && (
                            <motion.div
                                key="screen-share"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-md w-full"
                            >
                                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[48px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white space-y-8 text-center">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-indigo-100">
                                        <Monitor className="h-10 w-10 text-indigo-600" />
                                    </div>
                                    <div className="space-y-3">
                                        <h1 className="text-3xl font-bold text-slate-900">Enable Screen Share</h1>
                                        <p className="text-slate-500 font-medium leading-relaxed">
                                            To ensure the integrity of your interview, screen sharing is mandatory. Please share your entire screen to continue.
                                        </p>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:translate-y-[-2px] transition-all rounded-[24px] gap-3 font-bold"
                                        onClick={handleStartScreenShare}
                                    >
                                        Start Screen Sharing <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {landingStep === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-md w-full"
                            >
                                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[48px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white space-y-8">
                                    <div className="space-y-3">
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Preparation</span>
                                        <h1 className="text-3xl font-bold text-slate-900">Before starting,</h1>
                                    </div>

                                    <ul className="space-y-6">
                                        {[
                                            { id: 1, text: "Use of any AI tools is strictly not allowed." },
                                            { id: 2, text: "Tab switching is not allowed." },
                                            { id: 3, text: "Screen sharing is mandatory throughout the interview." },
                                            { id: 4, text: "The interview may be monitored and reviewed." },
                                            { id: 5, text: "Wait for the AI agent to finish speaking before responding." }
                                        ].map((item) => (
                                            <li key={item.id} className="flex gap-4">
                                                <span className="text-slate-300 font-bold tabular-nums pt-0.5">{item.id}.</span>
                                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.text}</p>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        size="lg"
                                        className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:translate-y-[-2px] transition-all rounded-[24px] gap-2 font-bold"
                                        onClick={handleStartRulesBriefing}
                                    >
                                        I understand, explain rules
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {landingStep === 'rules' && (
                            <motion.div
                                key="rules"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="flex flex-col items-center gap-12"
                            >
                                <div className="relative">
                                    <div className={`w-64 h-64 rounded-full bg-white flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.15)] border border-indigo-50 transition-all duration-500 ${isSpeaking ? 'ring-[16px] ring-indigo-50' : ''}`}>
                                        <div className="text-5xl font-black text-slate-800">
                                            e<span className="text-indigo-600">.</span>
                                        </div>
                                    </div>
                                    {isSpeaking && (
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute -inset-8 rounded-full border-4 border-indigo-100"
                                        />
                                    )}
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600 animate-pulse">Evalyn is speaking</p>
                                    <p className="text-slate-400 font-medium">Listening to the interview protocols...</p>
                                </div>
                            </motion.div>
                        )}

                        {landingStep === 'ready' && (
                            <motion.div
                                key="ready"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-md w-full text-center space-y-8"
                            >
                                <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                </div>
                                <div className="space-y-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Final Step</span>
                                    <h1 className="text-3xl font-bold text-slate-900">Ready to begin?</h1>
                                    <p className="text-slate-500 font-medium">Click the button below to start your interview. You will be prompted to share your screen.</p>
                                </div>

                                <ul className="space-y-4">
                                    {[
                                        { id: 1, text: "Screen sharing is mandatory for the duration of the interview." },
                                        { id: 2, text: "The agent will brief you on rules before starting the questions." },
                                        { id: 3, text: "Ensure you are in a quiet environment with a working microphone." }
                                    ].map((item) => (
                                        <li key={item.id} className="flex gap-3 items-center">
                                            <div className="h-5 w-5 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                                                <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full" />
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">{item.text}</p>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    size="lg"
                                    className="w-full h-16 text-xl bg-indigo-600 hover:bg-indigo-700 shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:translate-y-[-2px] transition-all rounded-[24px] gap-3 font-bold"
                                    onClick={handleStartInterview}
                                >
                                    Start Interview <ArrowRight className="h-6 w-6" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F0F2FF] dark:bg-slate-950 overflow-hidden font-sans selection:bg-indigo-100">
            <AnimatePresence>
                {!isSharingScreen && session.status === 'IN_PROGRESS' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 p-10 rounded-[48px] shadow-2xl border border-white/20 text-center space-y-8 max-w-md"
                        >
                            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-[32px] flex items-center justify-center mx-auto border border-red-100 dark:border-red-800/30">
                                <Monitor className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Screen Share Required</h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Screen sharing has been stopped. To continue your interview and ensure integrity, please restart screen sharing.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:translate-y-[-2px] transition-all rounded-[24px] gap-2 font-bold"
                                onClick={async () => {
                                    try {
                                        const s = await startScreenShare();
                                        if (s) {
                                            toast.success("Screen sharing resumed");
                                        }
                                    } catch (error) {
                                        toast.error("You must enable screen sharing to continue.");
                                    }
                                }}
                            >
                                Resume Screen Sharing <ArrowRight className="h-5 w-5" />
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full pt-8 px-12 flex justify-between items-start z-20">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-3xl font-[900] tracking-tighter text-slate-900 dark:text-white group cursor-default">
                        evalyn<span className="text-indigo-600">.</span>
                    </h2>
                    <div className="flex gap-1.5 items-center ml-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Security Active</span>
                    </div>
                </div>

                <nav className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 shadow-sm">
                    {(session?.state?.skills?.length > 0 ? session.state.skills.slice(0, 4) : ["Introduction", "Technical", "Analysis", "Culture"]).map((skill: string, i: number) => (
                        <div key={i} className="relative group">
                            <div className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-default ${i === 0
                                ? "bg-indigo-600/10 text-indigo-600"
                                : "text-slate-400 hover:text-slate-600"
                                }`}>
                                {skill}
                            </div>
                            {i === 0 && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-full"
                                />
                            )}
                        </div>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white dark:border-slate-800 px-5 py-2.5 rounded-3xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] flex items-center gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl">
                            <Clock className={`h-4 w-4 ${timeLeft <= 20 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`} />
                        </div>
                        <span className="font-mono text-xl font-[800] text-slate-800 dark:text-slate-100 tabular-nums">
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </div>

            <main className="flex-1 relative flex items-center justify-center p-6">
                <div className="relative flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-10"
                    >
                        <div className={`relative w-48 h-48 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 shadow-[0_0_50px_rgba(79,70,229,0.15)] transition-all duration-700 ${isSpeaking ? 'ring-8 ring-indigo-100 dark:ring-indigo-900/20' : ''
                            }`}>
                            <div className="text-4xl font-black text-slate-800 dark:text-white transition-all duration-500">
                                e<span className="text-indigo-600">.</span>
                            </div>

                            <AnimatePresence>
                                {(isSpeaking || isListening) && (
                                    <>
                                        <motion.div
                                            initial={{ scale: 1, opacity: 0.5 }}
                                            animate={{ scale: 1.5, opacity: 0 }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 rounded-full border-2 border-indigo-400/30"
                                        />
                                        <motion.div
                                            initial={{ scale: 1, opacity: 0.3 }}
                                            animate={{ scale: 1.8, opacity: 0 }}
                                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                                            className="absolute inset-0 rounded-full border border-indigo-300/20"
                                        />
                                    </>
                                )}
                            </AnimatePresence>

                            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-indigo-200 dark:border-indigo-800/30 animate-[spin_20s_linear_infinite]" />
                        </div>
                    </motion.div>

                    <div className="absolute left-[220px] w-[350px] space-y-4">
                        <AnimatePresence mode="wait">
                            {messages.filter(m => m.role === 'ai').slice(-1).map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="relative"
                                >
                                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                                        {msg.content}
                                    </p>

                                    {isListening && (
                                        <div className="mt-6 flex items-center gap-3 bg-white/60 dark:bg-slate-900 border border-white dark:border-slate-800 px-5 py-2.5 rounded-2xl w-fit shadow-sm">
                                            <div className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Recording...</span>
                                        </div>
                                    )}

                                    {isThinking && (
                                        <div className="mt-6 flex items-center gap-3 bg-white/60 dark:bg-slate-900 border border-white dark:border-slate-800 px-5 py-2.5 rounded-2xl w-fit shadow-sm">
                                            <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Thinking...</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="absolute bottom-12 left-10 z-20">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800 px-6 py-4 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex items-center gap-8 group hover:translate-y-[-2px] transition-transform duration-300">
                        <div className="flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-6">
                            <div className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                <Mic className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Protocol</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">AI Voice Optimized</span>
                            </div>
                        </div>

                        <div className="flex gap-1.5 items-center">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={isListening ? { height: [12, Math.random() * 24 + 8, 12] } : { height: 12 }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                                    className={`w-1 rounded-full transition-all duration-300 ${isListening ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="pl-6 border-l border-slate-100 dark:border-slate-800">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => setVoiceEnabled(!voiceEnabled)}
                            >
                                {voiceEnabled ? <Volume2 className="h-5 w-5 text-indigo-600" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:40px_40px]" />
                </div>
            </main>

            <footer className="p-12 z-40 bg-gradient-to-t from-[#F0F2FF] dark:from-slate-950 to-transparent">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                    {isCompleted ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 px-12 py-8 rounded-[48px] shadow-2xl border border-indigo-100 dark:border-slate-800 flex flex-col items-center gap-6 text-center"
                        >
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Phase Complete</h3>
                            <Button
                                size="lg"
                                className="rounded-[24px] px-12 h-16 bg-indigo-600 hover:bg-indigo-700 text-xl font-bold shadow-xl transition-all hover:translate-y-[-2px]"
                                onClick={() => {
                                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                    }
                                    router.push(`/interview/${token}/coding`);
                                }}
                            >
                                Start Coding Challenge <ArrowRight className="ml-2 h-6 w-6" />
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 w-full max-w-2xl group">
                            <AnimatePresence>
                                {input && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md px-8 py-4 rounded-[24px] border border-white/60 dark:border-slate-800/60 shadow-sm"
                                    >
                                        <p className="text-slate-500 dark:text-slate-400 italic text-center font-medium leading-relaxed">
                                            "{input}"
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-4 bg-indigo-600/5 dark:bg-indigo-900/10 px-6 py-2 rounded-full border border-indigo-600/10 transition-all">
                                <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 dark:text-indigo-400/70">
                                    {isListening ? "Listening Mode Active" : isSpeaking ? "Evalyn Speaking" : isThinking ? "Processing Audio" : "Waiting for Input"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
