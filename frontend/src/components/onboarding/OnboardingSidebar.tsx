"use client";

import React from "react";
import { Check, User, FileText, Shield, GraduationCap, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    icon: React.ElementType;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    { id: 1, title: "Personal Info", description: "Your basic details", icon: User },
    { id: 2, title: "Documents", description: "Upload ID & Degrees", icon: FileText },
    { id: 3, title: "Status", description: "Onboarding Progress", icon: CheckCircle },
];

interface OnboardingSidebarProps {
    currentStep: number;
    onStepClick?: (step: number) => void;
    completedSteps: number[];
}

export function OnboardingSidebar({ currentStep, onStepClick, completedSteps }: OnboardingSidebarProps) {
    return (
        <div className="w-full h-full gradient-sidebar text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex-1 py-8 px-4 space-y-2">
                {ONBOARDING_STEPS.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isActive = currentStep === step.id;
                    const Icon = step.icon;

                    return (
                        <button
                            key={step.id}
                            onClick={() => onStepClick?.(step.id)}
                            className={cn(
                                "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 relative group",
                                isActive ? "bg-white/10 shadow-lg" : "hover:bg-white/5"
                            )}
                        >
                            {/* Active Indicator Line */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-[#6366f1] rounded-l-full"
                                />
                            )}

                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                isCompleted ? "bg-green-500 border-green-500 text-white" : 
                                isActive ? "bg-[#6366f1] border-[#6366f1] text-white" : 
                                "border-white/20 text-white/40"
                            )}>
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <span className="text-sm font-bold">{step.id}</span>
                                )}
                            </div>

                            <div className="flex-1 text-left">
                                <h4 className={cn(
                                    "text-sm font-bold transition-colors",
                                    isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                                )}>
                                    {step.title}
                                </h4>
                                <p className={cn(
                                    "text-[10px] transition-colors",
                                    isActive ? "text-white/80" : "text-white/40 group-hover:text-white/60"
                                )}>
                                    {step.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
