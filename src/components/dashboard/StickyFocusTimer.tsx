"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle2, XCircle, Headphones, Maximize2 } from "lucide-react";
import { usePoeStore } from "@/store/useStore";

import { ScheduleBlock } from "@/types";

interface StickyFocusTimerProps {
    activeBlock: ScheduleBlock | null | undefined;
    activeTimer: number;
    isTimerPaused: boolean;
    isLofiPlaying: boolean;
    onPause: () => void;
    onResume: () => void;
    onComplete: () => void;
    onSkip: () => void;
    onToggleLofi: () => void;
}

export function StickyFocusTimer({
    activeBlock,
    activeTimer,
    isTimerPaused,
    isLofiPlaying,
    onPause,
    onResume,
    onComplete,
    onSkip,
    onToggleLofi
}: StickyFocusTimerProps) {
    const { isZenModeActive, setZenMode, activities, fixedBlocks } = usePoeStore();

    if (!activeBlock || isZenModeActive) return null;

    const blockName = (() => {
        if (activeBlock.type === "fixed") return fixedBlocks.find(b => b.id === activeBlock.activity_id)?.title || "Jadwal Tetap";
        if (activeBlock.type === "activity") return activities.find(a => a.id === activeBlock.activity_id)?.name || "Tugas";
        if (activeBlock.type === "sleep") return "Waktu Tidur";
        if (activeBlock.type === "break") return "Break / Istirahat";
        return "Focus Session";
    })();

    const getFormatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-full duration-500">
            <div className="container md:max-w-4xl mx-auto">
                <div className="bg-white/50 backdrop-blur-xl border border-[#ffccbc]/60 shadow-[0_-10px_40px_rgba(255,171,145,0.15)] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">

                    <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full md:w-auto">
                        <div className="relative group">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffab91] to-[#ffccbc] flex items-center justify-center shadow-inner overflow-hidden">
                                <div className={`absolute inset-0 bg-white/20 transition-transform duration-1000 ${!isTimerPaused ? 'animate-spin-slow' : ''}`} />
                                <span className="relative text-white font-black text-lg">
                                    {Math.floor(activeTimer / 60)}
                                </span>
                            </div>

                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#ffe0b2] to-[#ffccbc] text-[#bf360c] uppercase tracking-wider">
                                    Active Execution
                                </span>
                                {isTimerPaused && (
                                    <span className="text-xs font-bold text-[#ff8a65] animate-pulse">PAUSED</span>
                                )}
                            </div>
                            <h3 className="font-bold text-[#5d4037] text-base sm:text-lg leading-tight mt-0.5 line-clamp-1">
                                {blockName}
                            </h3>
                        </div>
                    </div>

                    <div className="font-mono text-2xl sm:text-3xl font-black text-[#8d6e63] tracking-tighter w-auto md:w-24 text-center">
                        {getFormatTime(activeTimer)}
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 justify-center scrollbar-hide">
                        {!isTimerPaused ? (
                            <Button onClick={onPause} className="bg-white/50 text-[#5d4037] border-2 border-white/60 hover:bg-[#ffe0b2]/80 hover:border-[#ffccbc]" size="icon">
                                <Pause className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button onClick={onResume} className="bg-white/50 text-[#5d4037] border-2 border-white/60 hover:bg-[#ffe0b2]/80 hover:border-[#ffccbc]" size="icon">
                                <Play className="w-5 h-5 ml-0.5" />
                            </Button>
                        )}
                        <Button
                            onClick={() => setZenMode(true)}
                            variant="outline"
                            className="bg-white/50 text-[#8d6e63] border-white/60 hover:bg-[#ffe0b2]/80 hover:border-[#ffccbc]"
                            size="icon"
                            title="Masuk Zen Mode (Fullscreen)"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={onToggleLofi}
                            variant="outline"
                            className={`border-2 ${isLofiPlaying ? 'bg-[#ffab91]/80 border-[#ffab91]/80 text-white animate-pulse' : 'bg-white/50 text-[#8d6e63] border-white/60 hover:bg-[#ffe0b2]/80 hover:border-[#ffccbc]'}`}
                            size="icon"
                            title="Lofi Focus Space"
                        >
                            <Headphones className="w-5 h-5" />
                        </Button>
                        <Button onClick={onComplete} className="bg-gradient-to-r from-[#a5d6a7] to-[#81c784] hover:bg-gradient-to-r hover:from-[#81c784] hover:to-[#66bb6a] text-white font-bold shadow-md relative overflow-hidden group flex-1 md:flex-none">
                            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                            <CheckCircle2 className="w-5 h-5 sm:mr-1 relative z-10" />
                            <span className="relative z-10 hidden sm:inline">Selesai</span>
                        </Button>
                        <Button onClick={onSkip} variant="outline" className="text-[#8d6e63] border-[#efebe9] hover:bg-[#fff5f2] hover:text-[#ffab91]" size="icon">
                            <XCircle className="w-5 h-5" />
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}
