"use client";

import React from "react";
import { ScheduleBlock, ExecutionLog } from "@/types";

interface DailyProgressRingProps {
    currentSchedule: ScheduleBlock[];
    executionLogs: ExecutionLog[];
    pomodoroCount?: number;
    timerMode?: 'deepwork' | 'pomodoro';
}

export function DailyProgressRing({
    currentSchedule,
    executionLogs,
    pomodoroCount = 0,
    timerMode = 'deepwork',
}: DailyProgressRingProps) {
    const todayStr = new Date().toISOString().split("T")[0];

    const activityBlocks = currentSchedule.filter(b => b.type === "activity" && b.date === todayStr);
    const totalTasks = activityBlocks.length;

    const completedTaskIds = new Set(
        executionLogs
            .filter(log => log.status === "complete")
            .map(log => log.schedule_block_id)
    );
    const completedCount = activityBlocks.filter(b => completedTaskIds.has(b.id)).length;

    const pct = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

    // SVG ring params
    const size = 80;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (pct / 100) * circumference;

    // Colour based on progress
    const ringColor = pct >= 100
        ? "#81c784"   // green — all done!
        : pct >= 60
        ? "#ffb74d"   // amber — doing well
        : pct >= 30
        ? "#ff8a65"   // orange — in progress
        : "#ef9a9a";  // red — just started

    const ringColorDark = pct >= 100 ? "#66bb6a" : pct >= 60 ? "#ffa726" : pct >= 30 ? "#ff7043" : "#e57373";

    return (
        <div className="bg-white/40 dark:bg-[#1e1e24]/40 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-3xl px-5 py-4 flex items-center gap-5 shadow-sm transition-colors">

            {/* SVG Progress Ring */}
            <div className="relative flex-none">
                <svg width={size} height={size} className="rotate-[-90deg]">
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        className="stroke-[#f5e6de] dark:stroke-[#2d2d35]"
                    />
                    {/* Progress */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        stroke={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? ringColorDark : ringColor}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        style={{
                            transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)",
                            stroke: ringColor,
                        }}
                    />
                </svg>
                {/* Centre label */}
                <div className="absolute inset-0 flex items-center justify-center rotate-0">
                    <span className="text-lg font-black text-[#5d4037] dark:text-[#e4d8cd] leading-none">
                        {pct}%
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#5d4037] dark:text-[#e4d8cd] mb-0.5 tracking-tight">
                    {pct >= 100
                        ? "🎉 Semua tugas selesai!"
                        : pct >= 60
                        ? "💪 Tinggal sedikit lagi!"
                        : pct > 0
                        ? "⚡ Sedang berjalan..."
                        : "🌅 Mulai hari produktifmu!"}
                </p>
                <p className="text-xs text-[#a1887f] dark:text-[#a19d9b]">
                    <span className="font-bold text-[#8d6e63] dark:text-[#d7ccc8]">{completedCount}</span>
                    {" / "}
                    <span className="font-bold">{totalTasks}</span>
                    {" tugas selesai hari ini"}
                </p>
            </div>

            {/* Pomodoro Counter (only shown in Pomodoro mode) */}
            {timerMode === "pomodoro" && (
                <div className="flex-none flex flex-col items-center gap-0.5 border-l border-[#ffccbc]/50 dark:border-[#ff8a65]/20 pl-4">
                    <span className="text-2xl leading-none">{Array.from({ length: Math.min(pomodoroCount, 8) }).map((_, i) => i < pomodoroCount ? "🍅" : "⬜").join("")}</span>
                    <span className="text-[10px] font-bold text-[#a1887f] dark:text-[#a19d9b] uppercase tracking-wider">{pomodoroCount} Pomodoro</span>
                </div>
            )}
        </div>
    );
}
