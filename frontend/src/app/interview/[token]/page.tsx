"use client";

import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F2FF] dark:bg-slate-950 p-6">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-indigo-100 text-center space-y-6 max-w-md">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto">
                    <Bot className="h-10 w-10 text-indigo-600" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900">Section Disabled</h1>
                    <p className="text-slate-500 leading-relaxed font-medium">
                        The AI interview feature is currently disabled. 
                        Our team is manually reviewing all shortlisted profiles for the next stage.
                    </p>
                </div>
                <div className="pt-4">
                    <Button 
                        onClick={() => router.push("/")}
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold shadow-lg text-white"
                    >
                        Return to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
