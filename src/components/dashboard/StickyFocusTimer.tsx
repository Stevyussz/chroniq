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
                <div className="bg-white/50 dark:bg-[#1e1e24]/70 backdrop-blur-xl border border-[#ffccbc]/60 dark:border-[#ff8a65]/30 shadow-[0_-10px_40px_rgba(255,171,145,0.15)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 transition-colors">

                    <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full md:w-auto">
                        <div className="relative group">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffab91] dark:from-[#ff8a65] to-[#ffccbc] flex items-center justify-center shadow-inner overflow-hidden">
                                <div className={`absolute inset-0 bg-white/20 dark:bg-black/10 transition-transform duration-1000 ${!isTimerPaused ? 'animate-spin-slow' : ''}`} />
                                <span className="relative text-white font-black text-lg">
                                    {Math.floor(activeTimer / 60)}
                                </span>
                            </div>

                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#ffe0b2] dark:from-[#ffb74d]/30 to-[#ffccbc] dark:to-[#ff8a65]/30 text-[#bf360c] dark:text-[#ffab91] uppercase tracking-wider border border-transparent dark:border-[#ff8a65]/20">
                                    Active Execution
                                </span>
                                {isTimerPaused && (
                                    <span className="text-xs font-bold text-[#ff8a65] dark:text-[#ffab91] animate-pulse">PAUSED</span>
                                )}
                            </div>
                            <h3 className="font-bold text-[#5d4037] dark:text-[#e4d8cd] text-base sm:text-lg leading-tight mt-0.5 line-clamp-1 transition-colors">
                                {blockName}
                            </h3>
                        </div>
                    </div>

                    <div className="font-mono text-2xl sm:text-3xl font-black text-[#8d6e63] dark:text-[#d7ccc8] tracking-tighter w-auto md:w-24 text-center transition-colors">
                        {getFormatTime(activeTimer)}
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 justify-center scrollbar-hide">
                        {!isTimerPaused ? (
                            <Button onClick={onPause} className="bg-white/50 dark:bg-[#2d2d35]/60 text-[#5d4037] dark:text-[#d7ccc8] border-2 border-white/60 dark:border-white/10 hover:bg-[#ffe0b2]/80 dark:hover:bg-[#ff8a65]/20 hover:border-[#ffccbc] dark:hover:border-[#ff8a65]/30 transition-colors" size="icon">
                                <Pause className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button onClick={onResume} className="bg-white/50 dark:bg-[#2d2d35]/60 text-[#5d4037] dark:text-[#d7ccc8] border-2 border-white/60 dark:border-white/10 hover:bg-[#ffe0b2]/80 dark:hover:bg-[#ff8a65]/20 hover:border-[#ffccbc] dark:hover:border-[#ff8a65]/30 transition-colors" size="icon">
                                <Play className="w-5 h-5 ml-0.5" />
                            </Button>
                        )}
                        <Button
                            onClick={() => setZenMode(true)}
                            variant="outline"
                            className="bg-white/50 dark:bg-[#2d2d35]/60 text-[#8d6e63] dark:text-[#a19d9b] border-white/60 dark:border-white/10 hover:bg-[#ffe0b2]/80 dark:hover:bg-[#ff8a65]/20 hover:border-[#ffccbc] dark:hover:border-[#ff8a65]/30 transition-colors"
                            size="icon"
                            title="Masuk Zen Mode (Fullscreen)"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={onToggleLofi}
                            variant="outline"
                            className={`border-2 transition-colors ${isLofiPlaying ? 'bg-[#ffab91]/80 dark:bg-[#ff8a65]/80 border-[#ffab91]/80 dark:border-[#ff8a65]/80 text-white animate-pulse' : 'bg-white/50 dark:bg-[#2d2d35]/60 text-[#8d6e63] dark:text-[#a19d9b] border-white/60 dark:border-white/10 hover:bg-[#ffe0b2]/80 dark:hover:bg-[#ff8a65]/20 hover:border-[#ffccbc] dark:hover:border-[#ff8a65]/30'}`}
                            size="icon"
                            title="Lofi Focus Space"
                        >
                            <Headphones className="w-5 h-5" />
                        </Button>
                        <Button onClick={onComplete} className="bg-gradient-to-r from-[#a5d6a7] dark:from-[#81c784] to-[#81c784] dark:to-[#66bb6a] hover:bg-gradient-to-r hover:from-[#81c784] hover:to-[#66bb6a] text-white font-bold shadow-md relative overflow-hidden group flex-1 md:flex-none border-none">
                            <span className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                            <CheckCircle2 className="w-5 h-5 sm:mr-1 relative z-10" />
                            <span className="relative z-10 hidden sm:inline">Selesai</span>
                        </Button>
                        <Button onClick={onSkip} variant="outline" className="text-[#8d6e63] dark:text-[#a19d9b] border-[#efebe9] dark:border-white/10 bg-transparent hover:bg-[#fff5f2] dark:hover:bg-[#d32f2f]/20 hover:text-[#ffab91] dark:hover:text-[#ff8a80] transition-colors" size="icon">
                            <XCircle className="w-5 h-5" />
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}
