"use client";

import { use, useState, useEffect } from "react";
import { interviewsApi } from "@/lib/api/interviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Card primitive might export specific parts
import { Loader2, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Standard Card import assumption - depending on how shadcn/ui was installed
// If Card is simple export: import { Card } from ...
// Checking file list, card.tsx usually has named exports.

export default function CodingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();

    // Cleanup any leftover audio from previous phase
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    // State
    const [question, setQuestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [code, setCode] = useState("");
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds = 1 minute
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Fetch Question
    useEffect(() => {
        const fetchQuestion = async () => {
            try {
                const res = await interviewsApi.getCodingQuestion(token);
                setQuestion(res.question);
                setIsTimerActive(true);
            } catch (error) {
                console.error("Failed to load question", error);
                // Fallback for demo if API fails locally
                // setQuestion("Write a function to reverse a string in Python.");
                // setIsTimerActive(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuestion();
    }, [token]);

    // Timer Logic
    useEffect(() => {
        if (!isTimerActive) return;

        const storageKey = `interview_timer_${token}`;
        let targetTime = parseInt(localStorage.getItem(storageKey) || '0', 10);

        if (!targetTime) {
            targetTime = Date.now() + 60 * 1000;
            localStorage.setItem(storageKey, targetTime.toString());
        }

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = Math.ceil((targetTime - now) / 1000);

            if (diff <= 0) {
                setTimeLeft(0);
                clearInterval(timer);
                setIsTimerActive(false);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isTimerActive, token]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await interviewsApi.submitCoding(token, code);
            localStorage.removeItem(`interview_timer_${token}`);
            setIsSubmitted(true);
            setTimeout(() => {
                router.push("/portal/jobs");
            }, 3000);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
            alert("Failed to submit. Please try again.");
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground animate-pulse">Preparing your assessment...</p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-border max-w-md mx-4"
                >
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Heads up!</h2>
                    <p className="text-muted-foreground">Thank you. We will contact you shortly.</p>
                    <p className="text-xs text-muted-foreground animate-pulse pt-4">Redirecting you to jobs...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 flex flex-col gap-6">
            {/* Header with Timer */}
            <div className="flex items-center justify-between max-w-5xl mx-auto w-full bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <h1 className="font-bold text-foreground">Technical Challenge</h1>
                        <p className="text-xs text-muted-foreground">Phase 2 of 2</p>
                    </div>
                </div>

                <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full font-mono text-xl font-bold border transition-colors ${timeLeft <= 30
                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:border-red-900 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                    }`}>
                    <Clock className={`w-5 h-5 ${timeLeft <= 30 ? 'animate-bounce' : ''}`} />
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full grid md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
                {/* Question */}
                <Card className="flex flex-col h-full overflow-hidden border-border/60 shadow-md">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border py-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-indigo-500" />
                            Problem Statement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-6 overflow-y-auto">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                            {question || "No question generated."}
                        </div>
                    </CardContent>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs">
                        <strong>Note:</strong> You have 1 minute. The code editor will lock when time is up.
                    </div>
                </Card>

                {/* Editor */}
                <Card className="flex flex-col h-full overflow-hidden border-border/60 shadow-md bg-[#1e1e1e] text-white border-0 ring-1 ring-border/50">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333]">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-slate-400">solution.py</span>
                            <Button
                                onClick={handleSubmit}
                                size="sm"
                                disabled={isSubmitting || isSubmitted || timeLeft === 0}
                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                            >
                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Submit Interview
                            </Button>
                        </div>
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-[#fa5252]" />
                            <span className="w-3 h-3 rounded-full bg-[#fab005]" />
                            <span className="w-3 h-3 rounded-full bg-[#40c057]" />
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            className="w-full h-full bg-[#1e1e1e] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed selection:bg-indigo-500/30"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="# Write your solution here..."
                            spellCheck={false}
                            disabled={timeLeft === 0 && !isSubmitted}
                        />

                        {/* Overlay when time is up */}
                        {timeLeft === 0 && !isSubmitted && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-xs"
                                >
                                    <div className="mb-4 text-center">
                                        <h3 className="text-xl font-bold text-white mb-1">Time's Up!</h3>
                                        <p className="text-slate-300 text-sm">Please submit your solution now.</p>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg shadow-xl shadow-emerald-900/20"
                                        size="lg"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                        Submit Interview
                                    </Button>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
