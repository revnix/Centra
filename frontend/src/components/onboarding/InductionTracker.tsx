"use client";

import React from "react";
import { OnboardingResponse } from "@/lib/api/onboarding";
import { CheckCircle2, Circle, Smartphone, Users, BookOpen, ShieldCheck, Coffee } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface InductionTrackerProps {
    onboarding: OnboardingResponse;
}

export function InductionTracker({ onboarding }: InductionTrackerProps) {
    const hrTasks = [
        { label: "Welcome Session", completed: onboarding.ind_hr_welcome_session, icon: Coffee },
        { label: "Handbook Shared", completed: onboarding.ind_hr_handbook_shared, icon: BookOpen },
        { label: "Policies Explained", completed: onboarding.ind_hr_policies_explained, icon: ShieldCheck },
    ];

    const itTasks = [
        { label: "System Credentials", completed: onboarding.ind_it_credentials_provided, icon: Smartphone },
        { label: "Security Induction", completed: onboarding.ind_it_security_induction, icon: ShieldCheck },
    ];

    const managerTasks = [
        { label: "Buddy Assigned", completed: onboarding.ind_manager_buddy_assigned, icon: Users },
        { label: "Team Introduction", completed: onboarding.ind_manager_team_intro, icon: Users },
    ];

    const allTasks = [...hrTasks, ...itTasks, ...managerTasks];
    const completedCount = allTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / allTasks.length) * 100);

    const TaskItem = ({ label, completed, icon: Icon }: any) => (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-white/50 transition-all">
            <div className={cn(
                "p-2 rounded-full",
                completed ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
            )}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={cn("text-sm font-medium", completed ? "text-slate-900" : "text-slate-500")}>
                {label}
            </span>
            <div className="ml-auto">
                {completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                    <Circle className="w-5 h-5 text-slate-200" />
                )}
            </div>
        </div>
    );

    return (
        <Card className="border-none shadow-xl bg-gradient-to-br from-slate-50 to-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl">Day 1 Induction</CardTitle>
                        <p className="text-slate-400 text-xs mt-1">Real-time status of your onboarding items</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{progress}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Complete</div>
                    </div>
                </div>
                <Progress value={progress} className="h-1.5 bg-slate-700 mt-4" />
            </CardHeader>
            <CardContent className="p-6 grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">HR & Operations</h4>
                    {hrTasks.map(t => <TaskItem key={t.label} {...t} />)}
                </div>
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">IT & Access</h4>
                    {itTasks.map(t => <TaskItem key={t.label} {...t} />)}
                </div>
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Team & Management</h4>
                    {managerTasks.map(t => <TaskItem key={t.label} {...t} />)}
                </div>
            </CardContent>
        </Card>
    );
}
