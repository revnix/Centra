"use client";

import React from "react";
import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
    id: number;
    name: string;
    description: string;
}

interface JourneyStepperProps {
    steps: Step[];
    currentStep: number;
}

export function JourneyStepper({ steps, currentStep }: JourneyStepperProps) {
    return (
        <div className="w-full">
            <div className="relative flex justify-between">
                {/* Background Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-700/50 -z-0" />
                
                {/* Active Progress Line */}
                <motion.div 
                    className="absolute top-5 left-0 h-0.5 bg-blue-500 -z-0"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isUpcoming = index > currentStep;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            {/* Circle Indicator */}
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.2 : 1,
                                    backgroundColor: isCompleted ? "#3b82f6" : isCurrent ? "#ffffff" : "#1e293b",
                                    borderColor: isCompleted ? "#3b82f6" : isCurrent ? "#3b82f6" : "#475569"
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-shadow",
                                    isCurrent && "shadow-[0_0_20px_rgba(59,130,246,0.5)]",
                                    isCompleted && "text-white"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : isCurrent ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                ) : (
                                    <span className="text-xs font-bold text-slate-500">{step.id}</span>
                                )}
                            </motion.div>

                            {/* Label */}
                            <div className="mt-4 text-center">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest mb-1 transition-colors",
                                    isCompleted ? "text-blue-400" : isCurrent ? "text-white" : "text-slate-500"
                                )}>
                                    {step.name}
                                </p>
                                <p className={cn(
                                    "text-[10px] max-w-[100px] hidden md:block transition-opacity",
                                    isUpcoming ? "opacity-30 text-slate-400" : "opacity-70 text-slate-300"
                                )}>
                                    {step.description}
                                </p>
                            </div>

                            {/* Hover Tooltip Effect (Mobile/Tablet) */}
                            {isCurrent && (
                                <motion.div 
                                    layoutId="active-bg"
                                    className="absolute -top-12 bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-xl md:hidden"
                                >
                                    Current Phase
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
