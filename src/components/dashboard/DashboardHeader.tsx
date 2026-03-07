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
                <h1 className="text-2xl font-black flex items-center gap-3 text-[#5d4037]">
                    Optimization Dashboard
                    <div className="flex items-center gap-2 bg-[#fff8e1]/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#ffe082]/50 shadow-sm text-sm">
                        <span className="font-bold text-[#f57c00]">Lv. {level}</span>
                        <div className="w-24 bg-[#ffecb3] h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-[#fb8c00] h-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-[#f57c00]">
                            {exp}/{nextLevelThreshold}
                        </span>
                    </div>
                </h1>
                {currentTime && (
                    <p className="text-sm font-semibold text-[#8d6e63] mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#8d6e63]" /> Kinerja Waktu Asli:
                        <span className="bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded-md font-mono">
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
                    className="bg-white/50 backdrop-blur-sm text-[#d9534f] border-2 border-[#ffb7b2]/60 hover:bg-[#ffebee]/80 rounded-full shadow-sm hover:-translate-y-0.5 transition-all text-xs font-semibold px-3 hidden md:flex"
                >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Button
                    onClick={handleReoptimize}
                    disabled={isReoptimizing}
                    className="bg-white/50 backdrop-blur-sm text-[#ff8a65] border-2 border-[#ffccbc]/60 hover:bg-[#fff3e0]/80 rounded-full shadow-sm hover:-translate-y-0.5 transition-all w-[180px]"
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
                    className="rounded-full shadow-sm border-[#ffccbc] text-[#bf360c] hover:bg-[#ffebee]"
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
