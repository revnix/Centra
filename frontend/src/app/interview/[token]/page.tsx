"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
    role: "ai" | "candidate" | "system";
    content: string;
    timestamp: string;
}

export default function InterviewPage() {
    const params = useParams();
    const token = params.token as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer effect with localStorage persistence
    useEffect(() => {
        const INTERVIEW_DURATION = 180; // 3 minutes in seconds
        const storageKey = `interview_start_${token}`;

        // Get or set the interview start time
        let startTime = localStorage.getItem(storageKey);
        if (!startTime) {
            startTime = Date.now().toString();
            localStorage.setItem(storageKey, startTime);
        }

        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - parseInt(startTime!)) / 1000);
            const remaining = Math.max(0, INTERVIEW_DURATION - elapsed);

            setTimeLeft(remaining);

            if (remaining === 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                toast.info("Interview time has ended");
            }
        };

        // Initial update
        updateTimer();

        // Set up interval
        timerRef.current = setInterval(updateTimer, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [token]);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const data = await api.interviews.getSession(token);
                setSession(data);
                if (data.transcript && data.transcript.length > 0) {
                    setMessages(data.transcript);
                } else {
                    // Start interview
                    const startRes = await api.interviews.startInterview(token);
                    setMessages(startRes.transcript);
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

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const userMsg = input.trim();
        setInput("");
        setIsSending(true);

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
        } catch (error) {
            toast.error("Failed to send message");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-muted-foreground animate-pulse">Initializing your AI interview...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <h1 className="text-2xl font-bold text-red-600">Invalid Interview Token</h1>
                <p className="text-muted-foreground">This interview link is invalid or has expired.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <Bot className="text-white h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">AI Interviewer</h1>
                            <p className="text-xs text-muted-foreground mt-1">
                                {session.application?.job?.title || "Technical Interview"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${timeLeft <= 30
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : timeLeft <= 60
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                            <Clock className={`h-4 w-4 ${timeLeft <= 30
                                    ? 'text-red-600 dark:text-red-400'
                                    : timeLeft <= 60
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-indigo-600'
                                }`} />
                            <span className={timeLeft <= 30 ? 'font-bold' : ''}>
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <div className="md:block hidden text-xs text-muted-foreground">
                            Session: <span className="font-mono">{token.slice(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-6 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'candidate' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <Avatar className={`h-8 w-8 mt-1 shrink-0 ${msg.role === 'candidate' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                    {msg.role === 'candidate' ? (
                                        <div className="flex items-center justify-center w-full h-full text-white text-xs font-bold">
                                            ME
                                        </div>
                                    ) : (
                                        <Bot className="h-5 w-5 text-indigo-600" />
                                    )}
                                </Avatar>

                                <div className={`flex flex-col gap-1 ${msg.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${msg.role === 'candidate'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-900 border border-border rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isSending && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white dark:bg-slate-900 border border-border px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                                </span>
                                <span className="text-xs text-muted-foreground">Evalyn is thinking...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <footer className="p-4 bg-white dark:bg-slate-900 border-t border-border">
                <div className="max-w-4xl mx-auto">
                    <div className="relative flex items-center gap-2">
                        <Input
                            placeholder={timeLeft <= 0 ? "Interview ended." : "Type your response here..."}
                            className="flex-1 py-6 pr-12 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-600"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isSending || timeLeft <= 0}
                        />
                        <Button
                            className="absolute right-1.5 h-9 w-9 p-0 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleSend}
                            disabled={!input.trim() || isSending || timeLeft <= 0}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mt-3">
                        Press Enter to send. This interview is recorded for assessment purposes.
                    </p>
                </div>
            </footer>
        </div>
    );
}
