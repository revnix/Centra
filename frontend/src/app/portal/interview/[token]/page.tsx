"use client";

import { useState, useRef, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Send,
    Clock,
    CheckCircle2,
    Brain,
    Loader2,
    AlertCircle,
    Video,
    Mic,
    MicOff
} from "lucide-react";

/**
 * Candidate Interview Page
 * AI-powered chat interview interface
 */

interface Message {
    id: string;
    role: "ai" | "candidate";
    content: string;
    timestamp: Date;
}

// Mock interview questions
const interviewQuestions = [
    "Welcome! I'm your AI interviewer today. Let's start with an introduction. Can you tell me about yourself and your background?",
    "Great! Can you describe a challenging technical problem you solved recently? What was your approach?",
    "How do you stay updated with the latest technologies and industry trends?",
    "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
    "What interests you most about this role and our company?",
    "Do you have any questions for me about the role or the team?",
];

export default function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
    const [isStarted, setIsStarted] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Timer countdown
    useEffect(() => {
        if (!isStarted || isCompleted) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitInterview();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isStarted, isCompleted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const startInterview = () => {
        setIsStarted(true);
        // Add first AI message
        const firstMessage: Message = {
            id: "1",
            role: "ai",
            content: interviewQuestions[0],
            timestamp: new Date(),
        };
        setMessages([firstMessage]);
    };

    const sendMessage = async () => {
        if (!input.trim() || isTyping) return;

        // Add candidate message
        const candidateMessage: Message = {
            id: Date.now().toString(),
            role: "candidate",
            content: input.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, candidateMessage]);
        setInput("");

        // Simulate AI thinking
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Check if more questions
        const nextIndex = questionIndex + 1;
        if (nextIndex < interviewQuestions.length) {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: interviewQuestions[nextIndex],
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            setQuestionIndex(nextIndex);
        } else {
            // Interview complete
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: "Thank you for your responses! You've answered all the questions. When you're ready, please click 'Submit Interview' to complete your session.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        }

        setIsTyping(false);
    };

    const handleSubmitInterview = async () => {
        setIsSubmitting(true);
        // Simulate API call to save interview
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setShowSubmitDialog(false);
        // Redirect directly to coding challenge
        window.location.href = `/portal/coding/${token}`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Pre-interview screen
    if (!isStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                            <Brain className="h-10 w-10 text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl">AI Interview Session</CardTitle>
                        <CardDescription>
                            Senior Frontend Engineer Position
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-blue-50 border-blue-200">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Duration: 30 minutes</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                Once you start, a timer will begin. Take your time to answer thoughtfully.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <h4 className="font-semibold">Before you begin:</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    Find a quiet place with stable internet
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    Have your resume and notes ready for reference
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    Answer honestly - there are no trick questions
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    You can pause between questions, but the timer continues
                                </li>
                            </ul>
                        </div>

                        <div className="flex justify-center pt-4">
                            <Button size="lg" onClick={startInterview} className="px-8">
                                <Video className="mr-2 h-5 w-5" />
                                Start Interview
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Completed screen
    if (isCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-100 flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full text-center">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="mx-auto p-4 bg-green-100 rounded-full w-fit">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Interview Submitted!</h2>
                            <p className="text-slate-500 mt-2">
                                Thank you for completing your interview. We'll review your responses and get back to you soon.
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                            <p><strong>Questions answered:</strong> {questionIndex + 1}</p>
                            <p><strong>Time used:</strong> {formatTime(30 * 60 - timeRemaining)}</p>
                        </div>
                        <Button variant="outline" onClick={() => window.location.href = "/portal/status"}>
                            View Application Status
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Interview chat interface
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-slate-900">AI Interview</h1>
                        <p className="text-sm text-slate-500">Senior Frontend Engineer</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Progress */}
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        Question {questionIndex + 1} of {interviewQuestions.length}
                    </Badge>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono font-bold ${timeRemaining < 300 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                        }`}>
                        <Clock className="h-4 w-4" />
                        {formatTime(timeRemaining)}
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "candidate" ? "justify-end" : ""}`}
                        >
                            {message.role === "ai" && (
                                <Avatar className="h-9 w-9 flex-shrink-0">
                                    <AvatarFallback className="bg-blue-100 text-blue-700">
                                        <Brain className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "ai"
                                    ? "bg-white border border-slate-200 text-slate-800"
                                    : "bg-blue-600 text-white"
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                <p className={`text-xs mt-2 ${message.role === "ai" ? "text-slate-400" : "text-blue-200"
                                    }`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>

                            {message.role === "candidate" && (
                                <Avatar className="h-9 w-9 flex-shrink-0">
                                    <AvatarFallback className="bg-slate-200 text-slate-700">
                                        You
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                    <Brain className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="bg-white border-t border-slate-200 p-4">
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-3">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your response..."
                            className="min-h-[60px] max-h-[150px] resize-none"
                            disabled={isTyping}
                        />
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={sendMessage}
                                disabled={!input.trim() || isTyping}
                                size="icon"
                                className="h-[60px] w-[60px]"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <p className="text-xs text-slate-500">
                            Press Enter to send, Shift+Enter for new line
                        </p>
                        <Button
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setShowSubmitDialog(true)}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Submit
                        </Button>
                    </div>
                </div>
            </footer>

            {/* Submit Confirmation Dialog */}
            <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Proceed to Coding Challenge?</DialogTitle>
                        <DialogDescription>
                            You'll move to the coding challenge next. Your interview responses will be saved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm">
                        <p><strong>Questions answered:</strong> {questionIndex + 1} of {interviewQuestions.length}</p>
                        <p><strong>Time remaining:</strong> {formatTime(timeRemaining)}</p>
                    </div>
                    {questionIndex + 1 < interviewQuestions.length && (
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700">
                                You haven't answered all questions yet. Consider completing them first.
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                            Continue Interview
                        </Button>
                        <Button
                            onClick={handleSubmitInterview}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
