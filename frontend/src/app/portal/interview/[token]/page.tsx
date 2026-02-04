"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { ChatInterface } from "@/components/interview/chat-interface";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [showContext, setShowContext] = useState(true);

    const { data: session, isLoading, error } = useQuery({
        queryKey: ["interview", token],
        queryFn: () => api.interviews.getSession(token),
    });

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !session) {
        if (error instanceof ApiError && error.status === 404) notFound();
        return (
            <div className="h-screen flex items-center justify-center text-red-500">
                Error loading interview session.
            </div>
        );
    }

    const job = session.application?.job;

    return (
        <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">

            {/* Top Nav (Mobile/Desktop) */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href={`/portal/jobs`}>
                        {/* Changed back link to generic jobs since guest might not have direct job link access easily without persistent state */}
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ChevronLeft className="w-4 h-4" /> Exit
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-border mx-2" />
                    <h1 className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-none">
                        Interview: {job?.title || "Unknown Position"}
                    </h1>
                    <Badge variant="secondary" className="hidden md:flex">Live Session</Badge>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setShowContext(!showContext)}
                >
                    {showContext ? "Hide Details" : "Show Details"}
                </Button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden p-2 md:p-4 gap-4">

                {/* Left Side: Context (Job Desc) - Hidden on mobile if toggle off */}
                <aside className={cn(
                    "bg-white dark:bg-slate-900 rounded-2xl border border-border w-full md:w-1/3 lg:w-1/4 flex-col shadow-sm transition-all duration-300 absolute md:relative z-20 h-[calc(100%-2rem)] md:h-full",
                    showContext ? "flex translate-x-0" : "hidden md:flex md:w-16 -translate-x-full md:translate-x-0"
                )}>
                    {/* Collapsed State for Desktop (Optional, skipping for simplicity, always open on desktop) */}

                    <div className="p-4 border-b border-border flex items-center gap-2 font-medium bg-slate-50/50">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        Job Context
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {job ? (
                            <div className="space-y-6 text-sm text-foreground/80">
                                <div>
                                    <h3 className="font-semibold text-foreground mb-2">Description</h3>
                                    <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                                </div>

                                {job.requirements && (
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-2">Requirements</h3>
                                        <ul className="space-y-2">
                                            {job.requirements.map((req: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                                                    <span>{req}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-800">
                                    <strong>Tip:</strong> The AI will ask you questions based on these requirements. Be specific in your answers.
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-muted-foreground">Job details not available.</div>
                        )}
                    </ScrollArea>
                </aside>

                {/* Right Side: Chat Interface */}
                <main className="flex-1 h-full relative">
                    <ChatInterface
                        jobTitle={job?.title}
                        token={token}
                        initialMessages={session.transcript || []}
                        initialStatus={session.status}
                    />
                </main>

            </div>
        </div>
    );
}
