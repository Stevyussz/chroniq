"use client";

import React, { useEffect } from "react";
import { usePoeStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Minimize2, Play, Pause, Headphones, Brain } from "lucide-react";
import { useExecutionTracker } from "@/hooks/useExecutionTracker";

interface ZenModeOverlayProps {
    tracker: ReturnType<typeof useExecutionTracker>;
}

export function ZenModeOverlay({ tracker }: ZenModeOverlayProps) {
    const { isZenModeActive, currentSchedule, activeBlockId, activities, setZenMode, isTimerPaused } = usePoeStore();
    const { activeTimer, isLofiPlaying, handleStart, handlePause, handleComplete, toggleLofi } = tracker;

    useEffect(() => {
        // Prevent scrolling on body when Zen Mode is active
        if (isZenModeActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isZenModeActive]);

    if (!isZenModeActive || !activeBlockId) return null;

    const activeBlock = currentSchedule.find((b) => b.id === activeBlockId);
    if (!activeBlock) return null;

    const getFormatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Calculate progress ring
    let targetMins = 30;
    let displayName = "Focus Session";

    if (activeBlock.type === "activity") {
        const act = activities.find((a) => a.id === activeBlock.activity_id);
        if (act) {
            targetMins = act.target_duration;
            displayName = act.name;
        }
    } else if (activeBlock.type === "break") {
        targetMins = 15;
        displayName = "Deep Work Break";
    }

    const targetSecs = targetMins * 60;
    const progressPerc = Math.min((activeTimer / targetSecs) * 100, 100);

    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#121212] via-[#2d211b] dark:via-[#1e1e24] to-[#1a110d] dark:to-[#121212] flex items-center justify-center animate-in fade-in duration-500 transition-colors">
            {/* Minimalist Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>

            {/* Glowing Pulse Orb */}
            {!isTimerPaused && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-[#ffab91] dark:bg-[#ff8a65] rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-pulse transition-colors"></div>
            )}

            {/* Top Bar Navigation */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 text-white/50 font-medium tracking-widest text-sm uppercase">
                    <Brain className="w-5 h-5 text-[#ffab91]" />
                    <span className="hidden sm:inline">Chroniq Zen Mode</span>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setZenMode(false)}
                    className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                    title="Exit Zen Mode (Minimize)"
                >
                    <Minimize2 className="w-6 h-6" />
                </Button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl px-6">

                {/* Visual Timer Progress Ring */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 mb-12 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background Track */}
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                        {/* Progress */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (283 * progressPerc) / 100}
                            className="transition-all duration-1000 ease-linear"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ffab91" />
                                <stop offset="100%" stopColor="#f57c00" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Timer Text */}
                    <div className="absolute flex flex-col items-center">
                        <span className={`font-mono text-5xl md:text-7xl font-black tracking-tighter transition-colors duration-500 ${isTimerPaused ? 'text-white/30 truncate' : 'text-white drop-shadow-[0_0_15px_rgba(255,171,145,0.4)] dark:drop-shadow-[0_0_15px_rgba(255,138,101,0.4)]'}`}>
                            {getFormatTime(activeTimer)}
                        </span>
                        {isTimerPaused && (
                            <span className="text-[#ffab91] dark:text-[#ff8a65] text-sm font-bold tracking-[0.2em] mt-2 uppercase animate-pulse transition-colors">Paused</span>
                        )}
                    </div>
                </div>

                {/* Task Info */}
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-white/90 leading-tight">
                        {displayName}
                    </h2>
                    <p className="text-white/40 tracking-wider uppercase text-sm font-medium">
                        Target: {targetMins} min
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    <Button
                        onClick={toggleLofi}
                        variant="ghost"
                        className={`w-14 h-14 rounded-full border-2 transition-all ${isLofiPlaying ? 'bg-[#ffab91]/20 dark:bg-[#ff8a65]/20 border-[#ffab91] dark:border-[#ff8a65] text-[#ffab91] dark:text-[#ff8a65] shadow-[0_0_20px_rgba(255,171,145,0.3)] dark:shadow-[0_0_20px_rgba(255,138,101,0.3)] animate-pulse' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                    >
                        <Headphones className="w-8 h-8" />
                    </Button>

                    <Button
                        onClick={isTimerPaused ? () => handleStart(activeBlockId) : handlePause}
                        className={`w-20 h-20 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center`}
                    >
                        {isTimerPaused ? (
                            <Play className="w-8 h-8 ml-1" fill="currentColor" />
                        ) : (
                            <Pause className="w-8 h-8" fill="currentColor" />
                        )}
                    </Button>

                    <Button
                        onClick={handleComplete}
                        variant="ghost"
                        className="w-14 h-14 rounded-full border-2 border-white/10 text-white/50 hover:bg-[#a5d6a7]/20 hover:border-[#a5d6a7] hover:text-[#a5d6a7] transition-all"
                        title="Tandai Selesai"
                    >
                        Selesai
                    </Button>
                </div>
            </div>

            {/* Secret Message (Bottom) */}
            <div className="absolute bottom-8 text-center w-full z-10">
                <p className="text-white/20 text-xs font-mono tracking-widest uppercase">
                    Jangan berpindah tab. Fokusmu adalah pedangmu.
                </p>
            </div>
        </div>
    );
}
