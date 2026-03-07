import React, { useEffect, useState } from "react";
import { Sparkles, Brain, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePoeStore } from "@/store/useStore";

export function AiReflectionCard() {
    const { executionLogs, activities, exp, level, aiReflectionText, aiReflectionDate, setAiReflection } = usePoeStore();
    const [reflection, setReflection] = useState<string | null>(aiReflectionText);
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
                    executionLogs: executionLogs.slice(-30), // Kirim 30 block terakhir 
                    activities: activities.slice(0, 30)
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.reflectionText) {
                    setReflection(data.reflectionText);
                    setAiReflection(data.reflectionText, now.toISOString());
                } else {
                    const fallback = "Belum ada insight kuat dari AI minggu ini, terus semangat berprogres!";
                    setReflection(fallback);
                    setAiReflection(fallback, now.toISOString());
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

    return (
        <Card className="bg-gradient-to-br from-[#fffbfa] dark:from-[#1e1e24] to-[#fff5f2] dark:to-[#2d2d35] border-2 border-[#ffab91]/50 dark:border-[#ff8a65]/20 shadow-md shadow-[#ffab91]/10 dark:shadow-none overflow-hidden mb-8 relative rounded-3xl transition-colors">
            {/* Decorative Gradient Blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#ffab91]/20 dark:from-[#ff8a65]/10 to-transparent blur-3xl pointer-events-none rounded-bl-full transition-colors"></div>

            <CardContent className="p-6 md:p-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#ffab91] to-[#ffccbc] text-white rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            {isLoading ? <Loader2 className="w-7 h-7 text-white animate-spin drop-shadow-sm" /> : <Image src="/icon.png" alt="Chroniq Logo" width={32} height={32} className="drop-shadow-sm group-hover:scale-110 transition-transform" />}
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-[#8d6e63] dark:text-[#e4d8cd] flex items-center gap-2 mb-1 tracking-tight transition-colors">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e64a19] dark:from-[#ffb74d] to-[#f57c00] dark:to-[#ff8a65]">Chroniq</span> AI Insight
                                <Sparkles className="w-5 h-5 text-[#ffab91] dark:text-[#ff8a65] animate-pulse" />
                            </h3>
                            <p className="text-xs font-bold text-[#ff8a65] dark:text-[#ffab91] uppercase tracking-wider transition-colors">Weekly Reflection Protocol</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleManualRegenerate}
                        disabled={isLoading || executionLogs.length < 3}
                        className="bg-white/60 dark:bg-[#1e1e24]/60 backdrop-blur-sm text-[#ff8a65] dark:text-[#ffab91] hover:bg-[#fff5f2] dark:hover:bg-[#ff8a65]/20 hover:text-[#e64a19] dark:hover:text-[#ffccbc] border border-[#ffccbc] dark:border-[#ff8a65]/30 rounded-xl self-start text-xs font-semibold px-4 h-9 shadow-sm transition-colors"
                        variant="outline"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Meracik...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Perbarui Manual
                            </>
                        )}
                    </Button>
                </div>

                <div className="bg-white/60 dark:bg-[#2d2d35]/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 dark:border-white/10 shadow-sm relative transition-colors">
                    {/* Quotation Marks Decoration */}
                    <div className="absolute -top-3 -left-2 text-6xl text-[#ffab91] dark:text-[#ff8a65] opacity-20 font-serif leading-none pointer-events-none">&quot;</div>

                    {isLoading && !reflection ? (
                        <div className="space-y-3 relative z-10">
                            <div className="h-4 bg-[#ffccbc]/40 rounded-full animate-pulse w-3/4"></div>
                            <div className="h-4 bg-[#ffccbc]/40 rounded-full animate-pulse w-5/6"></div>
                            <div className="h-4 bg-[#ffccbc]/40 rounded-full animate-pulse w-2/3"></div>
                        </div>
                    ) : (
                        <div className="text-sm md:text-base text-[#5d4037] dark:text-[#e4d8cd] leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                            {reflection}
                        </div>
                    )}
                </div>

                {!isLoading && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-bold text-[#a1887f] dark:text-[#a19d9b] uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#fffdf5] dark:bg-[#1e1e24] px-2.5 py-1 rounded-md border border-[#efebe9] dark:border-white/10">Chroniq Lv. {level}</span>
                            <span className="bg-[#fffdf5] dark:bg-[#1e1e24] px-2.5 py-1 rounded-md border border-[#efebe9] dark:border-white/10">{exp} EXP</span>
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
