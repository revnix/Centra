"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User as UserIcon, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { interviewsApi } from "@/lib/api/interviews";

interface Message {
    role: "assistant" | "user" | "ai"; // Backend uses 'ai' sometimes? schemas say 'role' string
    content: string;
    timestamp?: string;
}

interface ChatInterfaceProps {
    jobTitle?: string;
    token: string;
    initialMessages?: any[];
    initialStatus?: string;
}

export function ChatInterface({ jobTitle = "Software Engineer", token, initialMessages = [], initialStatus }: ChatInterfaceProps) {
    const router = useRouter();
    const [isCompleted, setIsCompleted] = useState(initialStatus === "CODING" || initialStatus === "COMPLETED");
    const [messages, setMessages] = useState<Message[]>(
        initialMessages.length > 0 ? initialMessages : [
            {
                role: "assistant", // "ai" in backend, mapping might be needed
                content: `Hi there! I'm Evalyn, the AI interviewer for the ${jobTitle} position. I'm here to learn more about your experience and skills. \n\nTo get started, could you briefly introduce yourself and highlight your most relevant experience?`,
                timestamp: new Date().toISOString()
            }
        ]
    );
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const currentInput = input;
        setInput("");
        setIsTyping(true);

        const userMsg: Message = {
            role: "user",
            content: currentInput,
            timestamp: new Date().toISOString()
        };
        // Optimistic update
        setMessages(prev => [...prev, userMsg]);

        try {
            const response = await interviewsApi.sendMessage(token, currentInput);

            // Backend returns { reply, transcript }
            // We can append the reply
            const aiMsg: Message = {
                role: "assistant",
                content: response.reply,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);

            if (response.status === "CODING" || response.status === "COMPLETED") {
                setIsCompleted(true);
            }
        } catch (error) {
            console.error("Failed to send message", error);
            // Revert or show error
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I'm having trouble connecting. Please try again.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                            <Bot className="w-6 h-6" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Evalyn</h3>
                        <p className="text-xs text-muted-foreground">AI Recruiter • Online</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn(
                            "flex w-full",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={cn(
                            "flex max-w-[80%] md:max-w-[70%] gap-3",
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}>
                            <Avatar className="w-8 h-8 mt-1 border border-border">
                                {msg.role !== "user" ? (
                                    <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </Avatar>

                            <div className={cn(
                                "p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap",
                                msg.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-sm"
                                    : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-sm border border-border"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex w-full justify-start"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white opacity-80">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 border border-border flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-0" />
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input or Next Phase Actions */}
            <div className="p-4 border-t border-border bg-white dark:bg-slate-900">
                {isCompleted ? (
                    <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">Interview Phase Completed!</h3>
                            <p className="text-muted-foreground">Thank you for chatting with me. Please proceed to the coding challenge.</p>
                        </div>
                        <Button
                            size="lg"
                            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                            onClick={() => router.push(`/portal/interview/${token}/coding`)}
                        >
                            Next Phase <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your answer..."
                            className="pr-12 py-6 text-base rounded-full shadow-sm bg-slate-50 dark:bg-slate-950 border-input focus-visible:ring-indigo-500"
                            disabled={isTyping}
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                        </Button>
                    </div>
                )}
                {!isCompleted && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                )}
            </div>

        </div>
    );
}
