import React, { useEffect, useState } from "react";
import { Sparkles, Brain, RefreshCw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePoeStore } from "@/store/useStore";
import { EnergySlot } from "@/types";
import { ChroniqAiLoader } from "@/components/ui/ChroniqAiLoader";

interface ReflectionResponse {
    reflectionText?: string;
    suggestedEnergySlots?: EnergySlot[];
}

export function AiReflectionCard() {
    const { 
        executionLogs, 
        activities, 
        exp, 
        level, 
        user,
        aiReflectionText, 
        aiReflectionDate, 
        aiSuggestedEnergySlots,
        energySlots,
        setAiReflection,
        setAiSuggestedEnergySlots,
        setEnergySlots,
        resetTimeline
    } = usePoeStore();
    const [reflection, setReflection] = useState<string | null>(aiReflectionText);
    const [suggestedSlots, setSuggestedSlots] = useState<EnergySlot[] | null>(aiSuggestedEnergySlots || null);
    const [isLoading, setIsLoading] = useState(false);

    const checkAndFetchReflection = async (force: boolean = false) => {
        // Only fetch if there's enough execution data (e.g., at least 3 logs)
        if (executionLogs.length < 3) {
            setReflection(
                "Chroniq AI membutuhkan setidaknya 3 hari data eksekusi untuk menganalisis pola produktivitasmu. Semangat kumpulkan log!"
            );
            return;
        }

        const now = new Date();
        const lastFetchDate = aiReflectionDate ? new Date(aiReflectionDate) : null;

        // Cache valid for 7 days (7 * 24 * 60 * 60 * 1000 ms = 604800000 ms)
        const isCacheValid = lastFetchDate && (now.getTime() - lastFetchDate.getTime() < 604800000);

        if (!force && isCacheValid && aiReflectionText) {
            setReflection(aiReflectionText);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/reflection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    executionLogs: executionLogs.slice(-30),
                    activities: activities.slice(0, 30),
                    energySlots: energySlots,
                    // BUG FIX #2: Send user for personalized coaching (name in reflection text)
                    user: user ? { name: user.name } : null
                })
            });

            if (response.ok) {
                const data = await response.json() as ReflectionResponse;
                if (data.reflectionText) {
                    setReflection(data.reflectionText);
                    setSuggestedSlots(data.suggestedEnergySlots || null);
                    setAiReflection(data.reflectionText, now.toISOString(), data.suggestedEnergySlots || null);
                } else {
                    const fallback = "Belum ada insight kuat dari AI minggu ini, terus semangat berprogres!";
                    setReflection(fallback);
                    setSuggestedSlots(null);
                    setAiReflection(fallback, now.toISOString(), null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch reflection:", error);
            if (!reflection) {
                setReflection("Koneksi ke Chroniq AI sedang gangguan. Coba lagi besok ya.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAndFetchReflection(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [executionLogs, activities]);

    const handleManualRegenerate = () => {
        checkAndFetchReflection(true);
    };

    const handleApplySuggestion = () => {
        if (!suggestedSlots) return;
        setEnergySlots(suggestedSlots);
        setAiSuggestedEnergySlots(null); // Clear suggestion after applying
        setSuggestedSlots(null);
        resetTimeline(); // Force scheduler to re-run based on new energy map
    };

    return (
        <Card className="overflow-hidden border-[#c7d2fe]/70 bg-white/82 shadow-sm dark:border-[#818cf8]/20 dark:bg-[#111827]/75">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#ff8a65] to-[#34d399]" />

            <CardContent className="relative z-10 p-5 sm:p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#4f46e5] to-[#ff8a65] text-white rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            {isLoading ? <ChroniqAiLoader size="md" compact /> : <Image src="/icon.png" alt="Chroniq Logo" width={32} height={32} className="drop-shadow-sm group-hover:scale-110 transition-transform" />}
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-[#1f2937] dark:text-[#e5edf8] flex items-center gap-2 mb-1 tracking-tight transition-colors">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4f46e5] to-[#ff8a65]">Chroniq</span> AI Insight
                                <Sparkles className="w-5 h-5 text-[#818cf8] animate-pulse" />
                            </h3>
                            <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider transition-colors">Weekly Reflection Protocol</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleManualRegenerate}
                        disabled={isLoading || executionLogs.length < 3}
                        className="self-start border-[#c7d2fe] bg-white/70 px-4 text-xs font-semibold text-[#4f46e5] shadow-sm hover:bg-[#eef2ff] dark:border-[#818cf8]/30 dark:bg-[#1e1b4b]/30 dark:text-[#c7d2fe] dark:hover:bg-[#312e81]/35"
                        variant="outline"
                    >
                        {isLoading ? (
                            <>
                                <ChroniqAiLoader size="sm" compact /> Meracik...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Perbarui Manual
                            </>
                        )}
                    </Button>
                </div>

                <div className="bg-[#f8fafc]/85 dark:bg-[#0f172a]/70 backdrop-blur-md rounded-xl p-5 border border-[#e2e8f0] dark:border-[#1e293b] shadow-sm relative transition-colors">
                    {/* Quotation Marks Decoration */}
                    <div className="absolute -top-3 -left-2 text-6xl text-[#818cf8] opacity-20 font-serif leading-none pointer-events-none">&quot;</div>

                    {isLoading && !reflection ? (
                        <div className="relative z-10 rounded-xl border border-[#818cf8]/25 bg-[#eef2ff]/65 dark:bg-[#1e1b4b]/35 p-4">
                            <ChroniqAiLoader
                                size="md"
                                label="Chroniq AI membaca pola mingguan"
                                sublabel="Menggabungkan log fokus, energi, distraksi, dan ritme eksekusi."
                            />
                        </div>
                    ) : (
                        <div className="text-sm md:text-base text-[#334155] dark:text-[#cbd5e1] leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                            {reflection}
                        </div>
                    )}
                </div>

                {/* --- AI AUTO TUNING SUGGESTION ALERT --- */}
                {suggestedSlots && suggestedSlots.length > 0 && !isLoading && (
                    <div className="mt-4 p-4 rounded-xl bg-[#eef2ff]/80 dark:bg-[#1e1b4b]/35 border border-[#c7d2fe] dark:border-[#818cf8]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#4f46e5] dark:text-[#c7d2fe] flex items-center gap-2 mb-1">
                                <Brain className="w-4 h-4" /> Saran Tuning Jam Biologis
                            </h4>
                            <p className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                                AI merekomendasikan perubahan jam energi untuk optimisasi otomatis. 
                                Peak: {suggestedSlots.find(s => s.energy_level === 'peak')?.start_time} - {suggestedSlots.find(s => s.energy_level === 'peak')?.end_time}.
                            </p>
                        </div>
                        <Button
                            onClick={handleApplySuggestion}
                            className="w-full md:w-auto text-xs font-bold px-5 h-9"
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-2" /> Terapkan Saran AI
                        </Button>
                    </div>
                )}

                {!isLoading && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#f8fafc] dark:bg-[#0f172a] px-2.5 py-1 rounded-md border border-[#e2e8f0] dark:border-[#1e293b]">Chroniq Lv. {level}</span>
                            <span className="bg-[#f8fafc] dark:bg-[#0f172a] px-2.5 py-1 rounded-md border border-[#e2e8f0] dark:border-[#1e293b]">{exp} EXP</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-right">
                            <span>Siklus Data: {Math.min(executionLogs.length, 30)} Log Terakhir</span>
                            {aiReflectionDate && (
                                <span className="text-[#ff8a65]">Diperbarui: {new Date(aiReflectionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
