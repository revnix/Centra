"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
    score: number;
    size?: "sm" | "md" | "lg";
    className?: string;
    animate?: boolean;
}

export function ScoreRing({
    score,
    size = "md",
    className,
    animate = true
}: ScoreRingProps) {
    // Clamp score between 0 and 100
    const normalizedScore = Math.min(100, Math.max(0, score));

    // Dimensions
    const dimensions = {
        sm: { size: 40, stroke: 3, fontSize: "text-xs" },
        md: { size: 60, stroke: 4, fontSize: "text-sm" },
        lg: { size: 120, stroke: 8, fontSize: "text-3xl" },
    };

    const { size: width, stroke, fontSize } = dimensions[size];
    const center = width / 2;
    const radius = (width - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedScore / 100) * circumference;

    // Colors based on score
    const getColor = (s: number) => {
        if (s >= 80) return "text-emerald-500 stroke-emerald-500";
        if (s >= 50) return "text-amber-500 stroke-amber-500";
        return "text-rose-500 stroke-rose-500";
    };

    const colorClass = getColor(normalizedScore);

    return (
        <div className={cn("relative inline-flex items-center justify-center font-bold", fontSize, className)}>
            <motion.svg
                width={width}
                height={width}
                viewBox={`0 0 ${width} ${width}`}
                initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
                animate={animate ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {/* Background Ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className="text-muted/20"
                />
                {/* Progress Ring */}
                <motion.circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={animate ? circumference : offset}
                    animate={animate ? { strokeDashoffset: offset } : undefined}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className={cn("origin-center -rotate-90", colorClass)}
                />
            </motion.svg>
            <span className={cn("absolute", colorClass)}>
                {normalizedScore}
            </span>
        </div>
    );
}
