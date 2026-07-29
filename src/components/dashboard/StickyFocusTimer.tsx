"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle2, XCircle, Headphones, Maximize2, Timer } from "lucide-react";
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
    const {
        isZenModeActive, setZenMode, activities, fixedBlocks,
        timerMode, setTimerMode, pomodoroCount, pomodoroPhase,
    } = usePoeStore();

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

    // Compute target seconds for the progress ring in Pomodoro mode
    const pomodoroWorkSecs = 25 * 60;
    const pomodoroBreakSecs = 5 * 60;
    const pomodoroTargetSecs = pomodoroPhase === 'work' ? pomodoroWorkSecs : pomodoroBreakSecs;
    const pomodoroProgress = timerMode === 'pomodoro'
        ? Math.min(1, activeTimer / pomodoroTargetSecs)
        : 0;

    // SVG mini ring for Pomodoro
    const ringSize = 52;
    const stroke = 5;
    const r = (ringSize - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const ringOffset = circ - pomodoroProgress * circ;
    const ringColor = pomodoroPhase === 'break' ? '#81c784' : '#ff8a65';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-full duration-500">
            <div className="container md:max-w-4xl mx-auto">
                <div className="bg-white/50 dark:bg-[#1e1e24]/70 backdrop-blur-xl border border-[#ffccbc]/60 dark:border-[#ff8a65]/30 shadow-[0_-10px_40px_rgba(255,171,145,0.15)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)] rounded-2xl p-3 sm:p-4 flex flex-col gap-3 transition-colors">

                    {/* Pomodoro Phase Banner */}
                    {timerMode === 'pomodoro' && (
                        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            pomodoroPhase === 'work'
                                ? 'bg-[#fff3e0] dark:bg-[#ff8a65]/20 text-[#bf360c] dark:text-[#ffab91] border border-[#ffccbc] dark:border-[#ff8a65]/30'
                                : 'bg-[#e8f5e9] dark:bg-[#81c784]/20 text-[#1b5e20] dark:text-[#a5d6a7] border border-[#c8e6c9] dark:border-[#81c784]/30'
                        }`}>
                            <span>{pomodoroPhase === 'work' ? '🍅' : '☕'}</span>
                            <span>{pomodoroPhase === 'work' ? 'FASE FOKUS — 25 Menit' : 'FASE ISTIRAHAT — 5 Menit'}</span>
                            {/* Tomato counter */}
                            <span className="ml-auto opacity-70">
                                {Array.from({ length: Math.min(pomodoroCount, 4) }, (_, i) => '🍅').join('') || '—'}
                                {pomodoroCount > 0 && <span className="ml-1 text-[10px] font-black">{pomodoroCount}×</span>}
                            </span>
                        </div>
                    )}

                    {/* Main row */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">

                        <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full md:w-auto">
                            {/* Timer indicator — Pomodoro ring or classic circle */}
                            <div className="relative flex-none">
                                {timerMode === 'pomodoro' ? (
                                    // SVG Ring for Pomodoro
                                    <div className="relative w-[52px] h-[52px]">
                                        <svg width={ringSize} height={ringSize} className="rotate-[-90deg]">
                                            <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" strokeWidth={stroke} className="stroke-[#f5e6de] dark:stroke-[#2d2d35]" />
                                            <circle
                                                cx={ringSize/2} cy={ringSize/2} r={r} fill="none"
                                                strokeWidth={stroke} stroke={ringColor}
                                                strokeDasharray={circ} strokeDashoffset={ringOffset}
                                                strokeLinecap="round"
                                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[9px] font-black text-[#5d4037] dark:text-[#e4d8cd]">
                                                {getFormatTime(pomodoroTargetSecs - activeTimer > 0 ? pomodoroTargetSecs - activeTimer : 0)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    // Original Deep Work circle
                                    <div className="relative group">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffab91] dark:from-[#ff8a65] to-[#ffccbc] flex items-center justify-center shadow-inner overflow-hidden">
                                            <div className={`absolute inset-0 bg-white/20 dark:bg-black/10 transition-transform duration-1000 ${!isTimerPaused ? 'animate-spin-slow' : ''}`} />
                                            {/* BUG FIX #8: Previously showed only minutes, now shows MM:SS */}
                                            <span className="relative text-white font-black text-xs leading-none">
                                                {getFormatTime(activeTimer)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#ffe0b2] dark:from-[#ffb74d]/30 to-[#ffccbc] dark:to-[#ff8a65]/30 text-[#bf360c] dark:text-[#ffab91] uppercase tracking-wider border border-transparent dark:border-[#ff8a65]/20">
                                        {timerMode === 'pomodoro' ? (pomodoroPhase === 'work' ? '🍅 Pomodoro' : '☕ Break') : 'Active Execution'}
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

                        {/* Main elapsed timer display */}
                        <div className="font-mono text-2xl sm:text-3xl font-black text-[#8d6e63] dark:text-[#d7ccc8] tracking-tighter w-auto md:w-24 text-center transition-colors">
                            {getFormatTime(activeTimer)}
                        </div>

                        <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 justify-center scrollbar-hide">
                            {/* Mode Toggle: Deep Work / Pomodoro */}
                            <Button
                                onClick={() => setTimerMode(timerMode === 'deepwork' ? 'pomodoro' : 'deepwork')}
                                variant="outline"
                                size="icon"
                                title={timerMode === 'pomodoro' ? 'Mode: Pomodoro (25/5) — klik ganti Deep Work' : 'Mode: Deep Work (90 min) — klik ganti Pomodoro'}
                                className={`border-2 transition-colors ${
                                    timerMode === 'pomodoro'
                                        ? 'bg-[#fff3e0] dark:bg-[#ff8a65]/20 border-[#ffab91] dark:border-[#ff8a65]/60 text-[#e64a19] dark:text-[#ffab91]'
                                        : 'bg-white/50 dark:bg-[#2d2d35]/60 text-[#8d6e63] dark:text-[#a19d9b] border-white/60 dark:border-white/10 hover:bg-[#ffe0b2]/80 dark:hover:bg-[#ff8a65]/20 hover:border-[#ffccbc] dark:hover:border-[#ff8a65]/30'
                                }`}
                            >
                                {timerMode === 'pomodoro' ? <span className="text-base">🍅</span> : <Timer className="w-5 h-5" />}
                            </Button>

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
        </div>
    );
}
