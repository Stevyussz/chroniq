"use client";

import React from "react";
import { BrainCircuit, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/button";

interface ChroniqAiLoaderProps {
    label?: string;
    sublabel?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
    compact?: boolean;
}

export function ChroniqAiLoader({
    label = "Chroniq AI sedang berpikir",
    sublabel,
    size = "md",
    className,
    compact = false,
}: ChroniqAiLoaderProps) {
    const shellSize = {
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-20 w-20",
    }[size];

    const iconSize = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-9 w-9",
    }[size];

    const dotSize = size === "lg" ? "h-1.5 w-1.5" : "h-1 w-1";

    return (
        <div className={cn("flex items-center gap-3", compact ? "justify-center" : "", className)} role="status" aria-live="polite">
            <div className={cn("chroniq-ai-core relative shrink-0 rounded-2xl", shellSize)}>
                <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_180deg,#818cf8,#ff8a65,#facc15,#34d399,#818cf8)] opacity-90" />
                <div className="absolute inset-[2px] rounded-[0.9rem] bg-[#111827] dark:bg-[#020617]" />
                <div className="chroniq-ai-scan absolute inset-[3px] rounded-[0.8rem] opacity-80" />
                <BrainCircuit className={cn("relative z-10 m-auto h-full text-[#ffccbc] drop-shadow-[0_0_10px_rgba(255,138,101,0.55)]", iconSize)} />
                <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-[#facc15] chroniq-ai-spark" />
            </div>

            {!compact && (
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#e64a19] dark:text-[#ffb74d]">{label}</span>
                        <span className="flex items-center gap-1">
                            {[0, 1, 2].map((index) => (
                                <span
                                    key={index}
                                    className={cn("chroniq-ai-dot rounded-full bg-[#818cf8]", dotSize)}
                                    style={{ animationDelay: `${index * 140}ms` }}
                                />
                            ))}
                        </span>
                    </div>
                    {sublabel && (
                        <p className="mt-0.5 text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">{sublabel}</p>
                    )}
                </div>
            )}
        </div>
    );
}
