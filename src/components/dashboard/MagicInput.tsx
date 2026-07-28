"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, BrainCircuit, Keyboard } from "lucide-react";
import { type Activity } from "@/types";
import { ChroniqAiLoader } from "@/components/ui/ChroniqAiLoader";
import { fetchChroniqAiJson } from "@/lib/ai/client";
import TextareaAutosize from 'react-textarea-autosize';

interface MagicInputProps {
    onActivitiesParsed: (activities: Activity[]) => void;
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
}

export function MagicInput({ onActivitiesParsed, isProcessing, setIsProcessing }: MagicInputProps) {
    const [text, setText] = useState("");
    const [isBrainDump, setIsBrainDump] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const showError = (msg: string) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(""), 4000);
    };

    // Auto-focus when switching to brain dump mode
    useEffect(() => {
        if (isBrainDump && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isBrainDump]);

    const clampPriority = (priority?: number): 1 | 2 | 3 | 4 | 5 => {
        const normalized = Math.round(Number.isFinite(priority) ? Number(priority) : 3);
        return Math.min(5, Math.max(1, normalized)) as 1 | 2 | 3 | 4 | 5;
    };

    const clampDuration = (duration?: number): number => {
        const normalized = Math.round(Number.isFinite(duration) ? Number(duration) : 30);
        return Math.min(480, Math.max(5, normalized));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!text.trim() || isProcessing) return;

        setIsProcessing(true);
        try {
            const data = await fetchChroniqAiJson<{ activities?: Array<{ name: string; target_duration?: number; priority?: number; category?: string; preferred_start?: string; recurrence?: Activity["recurrence"]; scheduled_date?: string; deadline?: string }> }>('/api/ai/parse-nl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            }, isBrainDump ? 22_000 : 16_000);

            if (data.activities && Array.isArray(data.activities)) {
                const newActivities: Activity[] = data.activities.map((a) => ({
                    id: crypto.randomUUID(),
                    user_id: "u1",
                    name: a.name,
                    target_duration: clampDuration(a.target_duration),
                    priority: clampPriority(a.priority),
                    category: a.category || "Ad-Hoc (Dadakan)",
                    recurrence: a.recurrence || "none",
                    ...(a.preferred_start && { preferred_start: a.preferred_start }),
                    ...(a.scheduled_date && { scheduled_date: a.scheduled_date }),
                    ...(a.deadline && { deadline: a.deadline })
                }));

                onActivitiesParsed(newActivities);
                setText("");
                setIsBrainDump(false); // Reset mode after success
            } else {
                throw new Error("Chroniq AI belum menemukan tugas yang valid dari input itu.");
            }
        } catch (error) {
            console.error("AI NLP Error:", error);
            showError(error instanceof Error ? error.message : "Chroniq AI sedang sibuk. Coba lagi sebentar.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (if not holding Shift for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full relative">
            <div className={`relative flex flex-col w-full transition-all duration-500 rounded-3xl overflow-hidden ${
                isProcessing 
                    ? 'ring-4 ring-[#ffccbc] dark:ring-[#ff8a65]/40 shadow-[0_0_40px_rgba(255,171,145,0.3)] dark:shadow-[0_0_40px_rgba(255,138,101,0.15)] bg-[#fff3e0]/80 dark:bg-[#ff8a65]/10 backdrop-blur-xl' 
                    : isBrainDump
                        ? 'ring-2 ring-[#ffab91] dark:ring-[#ff8a65] shadow-[0_10px_40px_rgba(255,171,145,0.2)] dark:shadow-[0_10px_40px_rgba(255,138,101,0.1)] bg-white/80 dark:bg-[#2d2d35]/80 backdrop-blur-xl -translate-y-1'
                        : 'ring-1 ring-white/50 dark:ring-white/10 bg-white/50 dark:bg-[#1e1e24]/60 backdrop-blur-md hover:bg-white/70 dark:hover:bg-[#2d2d35]/70 hover:shadow-md'
            }`}>
                
                {/* Brain Dump Header (Only visible in Brain Dump Mode) */}
                {isBrainDump && !isProcessing && (
                    <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-[#ffccbc]/30 dark:border-[#ff8a65]/20 bg-gradient-to-r from-[#ffe0b2]/30 dark:from-[#ffb74d]/10 to-transparent">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-[#f57c00] dark:text-[#ffb74d] animate-pulse" />
                            <span className="text-sm font-black text-[#e65100] dark:text-[#ffccbc] tracking-tight">BRAIN DUMP MODE</span>
                        </div>
                        <span className="text-xs font-semibold text-[#8d6e63] dark:text-[#a19d9b]">
                            Tulis semua yang ada di kepalamu...
                        </span>
                    </div>
                )}

                <div className={`flex ${isBrainDump ? 'items-end' : 'items-center'} p-2`}>
                    <div className={`pl-3 pr-2 text-[#ff8a65] dark:text-[#ffab91] transition-colors ${isBrainDump ? 'pb-3' : ''}`}>
                        {isProcessing ? (
                            <ChroniqAiLoader size="sm" compact />
                        ) : (
                            <Sparkles className="w-5 h-5 opacity-80" />
                        )}
                    </div>

                    <TextareaAutosize
                        ref={textareaRef}
                        minRows={isBrainDump ? 4 : 1}
                        maxRows={8}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isProcessing ? "Menyusun jadwal dari pikiran Anda..." : 
                            isBrainDump ? "Besok ujian matkul AI jam 10, laporan lab fisika harus dikumpul jumat pagi, balikin buku perpus besok siang, mau ngerjain tugas coding malam ini prioritas 5..." : 
                            "Ketik 1 tugas atau Brain Dump..."
                        }
                        disabled={isProcessing}
                        className={`flex-1 w-full resize-none border-none shadow-none text-base focus-visible:ring-0 placeholder:text-stone-400 dark:placeholder:text-[#a19d9b] pl-1 pr-2 bg-transparent transition-colors py-3 ${
                            isProcessing ? 'text-[#e64a19] dark:text-[#ffab91] animate-pulse placeholder:text-[#ffab91] dark:placeholder:text-[#ffab91]/70' : 'text-stone-700 dark:text-[#e4d8cd]'
                        } ${isBrainDump ? 'leading-relaxed' : 'overflow-hidden'}`}
                        autoComplete="off"
                        spellCheck="false"
                    />

                    {/* Fix: use flex-row when single line to avoid vertical overflow getting cut off */}
                    <div className={`flex ${isBrainDump ? 'flex-col' : 'flex-row'} gap-1 pr-2 ${isBrainDump ? 'pb-1' : ''}`}>
                        <Button
                            type="button"
                            onClick={() => setIsBrainDump(!isBrainDump)}
                            disabled={isProcessing}
                            variant="ghost"
                            size="icon"
                            title="Toggle Brain Dump Mode"
                            className={`rounded-xl h-10 w-10 transition-colors ${
                                isBrainDump 
                                    ? 'bg-[#ffe0b2] dark:bg-[#ff8a65]/30 text-[#e65100] dark:text-[#ffccbc]' 
                                    : 'text-stone-400 dark:text-[#a19d9b] hover:text-[#f57c00] dark:hover:text-[#ffab91] hover:bg-[#fff3e0] dark:hover:bg-[#ff8a65]/20'
                            }`}
                        >
                            {isBrainDump ? <Keyboard className="w-5 h-5" /> : <BrainCircuit className="w-5 h-5" />}
                        </Button>

                        <Button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={isProcessing || !text.trim()}
                            variant="ghost"
                            size="icon"
                            className={`rounded-xl h-10 w-10 transition-all ${
                                text.trim() && !isProcessing 
                                    ? 'bg-gradient-to-br from-[#ffab91] to-[#ffccbc] dark:from-[#ff8a65] dark:to-[#ffb74d] text-white shadow-md hover:scale-105' 
                                    : 'text-stone-300 dark:text-[#5d4037]'
                            }`}
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-2.5 ml-3 flex items-center justify-between">
                <span className="text-[11px] text-stone-400 dark:text-[#a19d9b] flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff8a65] dark:text-[#ffab91]" /> Chroniq AI Input
                </span>
                {isBrainDump && (
                    <span className="text-[10px] text-stone-400 dark:text-[#a19d9b] font-medium mr-2">
                        Tekan <kbd className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1 rounded text-stone-500 dark:text-stone-400">Shift</kbd> + <kbd className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1 rounded text-stone-500 dark:text-stone-400">Enter</kbd> untuk baris baru
                    </span>
                )}
            </div>
            {errorMessage && (
                <div className="mt-2 mx-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ffebee] dark:bg-[#d32f2f]/20 border border-[#ffcdd2] dark:border-[#d32f2f]/40 text-[#c62828] dark:text-[#ef9a9a] text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                    <span>⚠️</span> {errorMessage}
                </div>
            )}
        </form>
    );
}
