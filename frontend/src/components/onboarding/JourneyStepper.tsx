"use client";

import React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <nav aria-label="Progress" className="w-full">
            <ol role="list" className="flex flex-col md:flex-row md:space-x-8 md:space-y-0 space-y-4">
                {steps.map((step, stepIdx) => {
                    const isCompleted = stepIdx < currentStep;
                    const isCurrent = stepIdx === currentStep;

                    return (
                        <li key={step.name} className="flex-1">
                            <div className="group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors duration-200 border-slate-200"
                                 style={{ 
                                     borderColor: isCompleted ? 'var(--blue-600)' : isCurrent ? 'var(--blue-600)' : 'var(--slate-200)' 
                                 }}>
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700">
                                    Step {step.id}
                                </span>
                                <span className="text-sm font-medium">{step.name}</span>
                                <span className="text-xs text-slate-400 mt-1 hidden md:block">
                                    {step.description}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
