"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Clock, Sparkles, RotateCcw } from "lucide-react";

interface DashboardHeaderProps {
    level: number;
    exp: number;
    nextLevelThreshold: number;
    progressPercent: number;
    currentTime: string;
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    handleReoptimize: () => void;
    isReoptimizing: boolean;
    handleResetTimeline: () => void;
}

export function DashboardHeader({
    level,
    exp,
    nextLevelThreshold,
    progressPercent,
    currentTime,
    showSettings,
    setShowSettings,
    handleReoptimize,
    isReoptimizing,
    handleResetTimeline
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-2">
            <div>
                <h1 className="text-2xl font-black flex items-center gap-3 text-[#5d4037] dark:text-[#e4d8cd] transition-colors">
                    Optimization Dashboard
                    <div className="flex items-center gap-2 bg-[#fff8e1]/60 dark:bg-[#fff8e1]/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#ffe082]/50 dark:border-[#ffe082]/20 shadow-sm text-sm transition-colors">
                        <span className="font-bold text-[#f57c00] dark:text-[#ffb74d]">Lv. {level}</span>
                        <div className="w-24 bg-[#ffecb3] dark:bg-[#795548]/30 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-[#fb8c00] dark:bg-[#ffa726] h-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-[#f57c00] dark:text-[#ffb74d]">
                            {exp}/{nextLevelThreshold}
                        </span>
                    </div>
                </h1>
                {currentTime && (
                    <p className="text-sm font-semibold text-[#8d6e63] dark:text-[#a19d9b] mt-1 flex items-center gap-2 transition-colors">
                        <Clock className="w-4 h-4 text-[#8d6e63] dark:text-[#a19d9b]" /> Kinerja Waktu Asli:
                        <span className="bg-[#ffebee] dark:bg-[#c62828]/20 text-[#c62828] dark:text-[#ff8a80] px-2 py-0.5 rounded-md font-mono">
                            {currentTime}
                        </span>
                    </p>
                )}
            </div>
            <div className="flex gap-2.5">
                <Button
                    variant="outline"
                    onClick={() => {
                        if (confirm("Yakin ingin mereset seluruh timeline hari ini? Semua tugas akan dihapus.")) {
                            handleResetTimeline();
                        }
                    }}
                    className="bg-white/50 dark:bg-[#2d2d35]/50 backdrop-blur-sm text-[#d9534f] dark:text-[#ff8a80] border-2 border-[#ffb7b2]/60 dark:border-[#d9534f]/30 hover:bg-[#ffebee]/80 dark:hover:bg-[#d9534f]/20 rounded-full shadow-sm hover:-translate-y-0.5 transition-all text-xs font-semibold px-3 hidden md:flex"
                >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Button
                    onClick={handleReoptimize}
                    disabled={isReoptimizing}
                    className="bg-white/50 dark:bg-[#2d2d35]/50 backdrop-blur-sm text-[#ff8a65] dark:text-[#ffab91] border-2 border-[#ffccbc]/60 dark:border-[#ff8a65]/30 hover:bg-[#fff3e0]/80 dark:hover:bg-[#ff8a65]/20 rounded-full shadow-sm hover:-translate-y-0.5 transition-all w-[180px]"
                >
                    {isReoptimizing ? (
                        <span className="flex items-center gap-2 animate-pulse"><Sparkles className="w-4 h-4" /> AI Meracik...</span>
                    ) : (
                        <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Re-Optimize & Evolve</span>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="rounded-full shadow-sm border-[#ffccbc] dark:border-[#ff8a65]/30 text-[#bf360c] dark:text-[#ffab91] hover:bg-[#ffebee] dark:hover:bg-[#ff8a65]/20 bg-transparent"
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
