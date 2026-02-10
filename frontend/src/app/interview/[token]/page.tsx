"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
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
    const { startScreenShare, stream } = useInterview();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(60); // 1 minute
    const [isCompleted, setIsCompleted] = useState(false);

    // Voice States
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [landingStep, setLandingStep] = useState<'screen-share' | 'welcome' | 'rules' | 'ready' | 'in_progress'>('screen-share');

    const isSharingScreen = !!stream;

    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const lastSpokenMessageIndex = useRef<number>(-1);
    const screenStreamRef = useRef<MediaStream | null>(null); // Keep this for local view binding if necessary, or just use context stream directly

    // Global cleanup for speech synthesis
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Timer effect with localStorage persistence
    useEffect(() => {
        const INTERVIEW_DURATION = 60; // 1 minute in seconds
        const storageKey = `interview_start_${token}`;

        const updateTimer = () => {
            const startTime = localStorage.getItem(storageKey);
            if (!startTime) {
                // Timer hasn't started yet
                return;
            }

            const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
            const remaining = Math.max(0, INTERVIEW_DURATION - elapsed);

            setTimeLeft(remaining);

            if (remaining === 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                toast.info("Interview time has ended");
                setIsCompleted(true);
                stopListening();
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
            }
        };

        // If session is already in progress, timer might have started
        updateTimer();
        if (session?.status === 'IN_PROGRESS') {
            timerRef.current = setInterval(updateTimer, 1000);
        }


        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [token, session?.status]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                // Auto-send voice input
                handleSend(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error !== 'no-speech') {
                    toast.error("Speech recognition failed. Please try typing.");
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Speech Synthesis Effect
    useEffect(() => {
        if (!voiceEnabled || messages.length === 0 || isCompleted || timeLeft <= 0) {
            if (isCompleted || timeLeft <= 0) {
                window.speechSynthesis.cancel();
            }
            return;
        }

        const lastMessage = messages[messages.length - 1];
        const lastIndex = messages.length - 1;

        if (lastMessage.role === 'ai' && lastIndex > lastSpokenMessageIndex.current) {
            speak(lastMessage.content);
            lastSpokenMessageIndex.current = lastIndex;
        }
    }, [messages, voiceEnabled, isCompleted, timeLeft]);

    const speak = (text: string) => {
        if (!window.speechSynthesis || isCompleted || timeLeft <= 0) return;

        window.speechSynthesis.cancel(); // Stop any current speech

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };



    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (isCompleted || timeLeft <= 0) return;

        // Stop speech if AI is talking
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
                    // Don't re-speak entire history on reload, only new messages
                    lastSpokenMessageIndex.current = data.transcript.length - 1;
                }
            } catch (error: any) {
                toast.error("Failed to load interview session");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) fetchSession();
    }, [token]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (contentOverride?: string) => {
        const messageContent = contentOverride || input;
        if (!messageContent.trim() || isSending || isCompleted) return;

        const userMsg = messageContent.trim();
        setInput("");
        setIsSending(true);
        stopListening();

        // Optimistic update
        const newMessage: Message = {
            role: "candidate",
            content: userMsg,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);

        try {
            const res = await api.interviews.sendMessage(token, userMsg);
            setMessages(res.transcript);

            if (res.status === "CODING" || res.status === "COMPLETED") {
                setIsCompleted(true);
                stopRecording();
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                window.speechSynthesis.cancel();
            }
        } catch (error) {
            toast.error("Failed to send message");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleStartScreenShare = async () => {
        const s = await startScreenShare();
        if (s) {
            setLandingStep('welcome');
            toast.success("Screen sharing started successfully");
        }
    };

    const handleStartInterview = async () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Screen sharing requirement check
        if (!isSharingScreen) {
            const s = await startScreenShare();
            if (!s) {
                // If failed or cancelled
                return;
            }
        }

        setIsLoading(true);
        try {
            // Start the timer
            localStorage.setItem(`interview_start_${token}`, Date.now().toString());

            const startRes = await api.interviews.startInterview(token);
            setMessages(startRes.transcript);

            // Transition UI
            setLandingStep('in_progress');
            if (session) {
                setSession({ ...session, status: 'IN_PROGRESS' });
            }
        } catch (error) {
            toast.error("Failed to start the interview");
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

    // New Session Landing
    if (session.status === 'PENDING' && messages.length === 0) {

        const handleStartRulesBriefing = () => {
            setLandingStep('rules');
            // Speak the rules
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const text = "Welcome to your interview. Before we begin, please note the following rules: First, no cheating is allowed. Second, the use of external AI tools is strictly prohibited. Third, screen sharing is mandatory for the entire session. If you understand, click the start button that appears shortly.";
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

        return (
            <div className="flex flex-col min-h-screen bg-[#F0F2FF] dark:bg-slate-950 overflow-hidden font-sans">
                {/* Branding */}
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
                                            { id: 1, text: "The recording of your AI interview will be saved and reviewed by hiring managers." },
                                            { id: 2, text: "Please remain on this tab and avoid using external tools during the session." },
                                            { id: 3, text: "Screen sharing must be active throughout the session for security." },
                                            { id: 4, text: "Feel free to ask clarifying questions out loud at any time." },
                                            { id: 5, text: "A long pause will indicate to Evalyn that you've finished your answer." }
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

            {/* Top Navigation / Progress Tabs */}
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

            {/* Main Content Area */}
            <main className="flex-1 relative flex items-center justify-center p-6">

                {/* Central Orb Element */}
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

                            {/* Outer Glow Circles */}
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

                            {/* Rotating Ring */}
                            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-indigo-200 dark:border-indigo-800/30 animate-[spin_20s_linear_infinite]" />
                        </div>
                    </motion.div>

                    {/* AI Message (Right Aligned) */}
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
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bottom Bar Info */}
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

                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:40px_40px]" />
                </div>
            </main>

            {/* Input Overlay (Minimized) */}
            <footer className="p-8 z-30">
                <div className="max-w-4xl mx-auto flex justify-center">
                    {isCompleted ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white p-6 rounded-[40px] shadow-2xl border border-indigo-100 flex flex-col items-center gap-4 text-center"
                        >
                            <h3 className="text-xl font-bold">Phase Complete</h3>
                            <Button
                                size="lg"
                                className="rounded-2xl px-10 h-14 bg-indigo-600 hover:bg-indigo-700 text-lg shadow-xl"
                                onClick={() => {
                                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                    }
                                    router.push(`/interview/${token}/coding`);
                                }}
                            >
                                Start Coding Challenge
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="relative flex items-center gap-4 w-full max-w-2xl group">
                            <Input
                                placeholder={isListening ? "Listening..." : "Type or speak your response..."}
                                className="h-16 pl-8 pr-32 rounded-[32px] border-transparent bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xl focus-visible:ring-indigo-600 text-lg font-medium placeholder:text-slate-300 transition-all group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={isSending || timeLeft <= 0}
                            />

                            <div className="absolute right-2 flex items-center gap-2">
                                {input.trim() && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-12 w-12 rounded-full hover:bg-indigo-50 text-indigo-600"
                                        onClick={() => handleSend()}
                                    >
                                        <Send className="h-6 w-6" />
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    className={`h-12 w-12 p-0 rounded-full shadow-lg transition-all ${isListening
                                        ? "bg-red-500 hover:bg-red-600"
                                        : "bg-indigo-600 hover:bg-indigo-700"
                                        }`}
                                    onClick={toggleListening}
                                    disabled={isSending || timeLeft <= 0}
                                >
                                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </footer>
            {/* Mandatory Screen Share Overlay (If interrupted during interview) */}
            <AnimatePresence>
                {session?.status === 'IN_PROGRESS' && !isSharingScreen && !isCompleted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
                    >
                        <div className="max-w-md w-full bg-white p-10 rounded-[48px] shadow-2xl text-center space-y-8">
                            <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto border border-red-100">
                                <Monitor className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-slate-900">Screen Sharing Required</h2>
                                <p className="text-slate-500 font-medium">
                                    Your interview has been paused because screen sharing was stopped. Please re-enable it to continue.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-700 rounded-[24px] font-bold"
                                onClick={async () => {
                                    try {
                                        await startScreenShare();
                                    } catch (e) {
                                        toast.error("Failed to re-enable sharing");
                                    }
                                }}
                            >
                                Resume Screen Sharing
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
