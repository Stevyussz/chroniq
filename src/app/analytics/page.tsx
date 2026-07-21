"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePoeStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { generateWeeklyInsights } from "@/lib/engine/adaptation";
import { AlertCircle, BarChart3, Brain, CheckCircle2, Clock3, Flame, Lightbulb, ListChecks, Target, Zap } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { calculateDisciplineScore, calculatePriorityAlignment, calculateTPI, calculateEnergyReliability } from "@/lib/engine/scoring";
import { AiReflectionCard } from "@/components/analytics/AiReflectionCard";

export default function AnalyticsPage() {
    const router = useRouter();
    const { user, executionLogs, currentSchedule, activities } = usePoeStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && !user) {
            router.push("/onboarding");
        }
    }, [isClient, user, router]);

    if (!isClient || !user) return <div className="p-8 text-center text-[#a1887f]">Loading Analytics...</div>;

    // BUG FIX #1: Pass currentSchedule so Spaced Repetition & Implementation Intentions insights activate
    const insights = generateWeeklyInsights(executionLogs, currentSchedule);

    // Calculate Scores for Radar
    const disciplineScore = calculateDisciplineScore(executionLogs, currentSchedule);
    const priorityAlign = calculatePriorityAlignment(currentSchedule, activities);
    // Normalize TPI for a 0-100 scale radar chart (assuming TPI usually sits between 0 and 200)
    const normalizedTpi = Math.min(100, Math.round((calculateTPI(executionLogs) / 100) * 100));
    const energyRel = calculateEnergyReliability(executionLogs, currentSchedule);

    const radarData = [
        { subject: 'Discipline', score: disciplineScore, fullMark: 100 },
        { subject: 'Priority', score: priorityAlign, fullMark: 100 },
        { subject: 'TPI', score: normalizedTpi, fullMark: 100 },
        { subject: 'Energy', score: energyRel, fullMark: 100 },
    ];

    const completedLogs = executionLogs.filter(log => log.status === "complete");
    const skippedLogs = executionLogs.filter(log => log.status === "skip");
    const plannedActivityCount = currentSchedule.filter(block => block.type === "activity").length;
    const totalFocusedMinutes = completedLogs.reduce((sum, log) => sum + log.actual_duration, 0);
    const averageFocus = completedLogs.length
        ? completedLogs.reduce((sum, log) => sum + log.focus_score, 0) / completedLogs.length
        : 0;
    const averageDistractions = completedLogs.length
        ? completedLogs.reduce((sum, log) => sum + log.distraction_count, 0) / completedLogs.length
        : 0;
    const skipRate = executionLogs.length ? Math.round((skippedLogs.length / executionLogs.length) * 100) : 0;
    const latestLogs = [...executionLogs].reverse().slice(0, 12);

    const scoreCards = [
        {
            label: "Discipline",
            value: `${disciplineScore}%`,
            detail: `${completedLogs.length}/${plannedActivityCount || currentSchedule.length || 0} blok selesai`,
            icon: ListChecks,
            tone: "text-[#4f46e5] bg-[#eef2ff] dark:bg-[#312e81]/35 dark:text-[#c7d2fe]",
        },
        {
            label: "Priority Sync",
            value: `${priorityAlign}%`,
            detail: "Tugas penting di jam energi tepat",
            icon: Target,
            tone: "text-[#db2777] bg-[#fce7f3] dark:bg-[#831843]/30 dark:text-[#fbcfe8]",
        },
        {
            label: "Focus Minutes",
            value: `${totalFocusedMinutes}m`,
            detail: `Rata-rata fokus ${averageFocus.toFixed(1)}/5`,
            icon: Clock3,
            tone: "text-[#047857] bg-[#d1fae5] dark:bg-[#064e3b]/35 dark:text-[#a7f3d0]",
        },
        {
            label: "Burnout Guard",
            value: `${skipRate}%`,
            detail: "Rasio sesi dilewati",
            icon: Flame,
            tone: skipRate >= 30
                ? "text-[#dc2626] bg-[#fee2e2] dark:bg-[#7f1d1d]/35 dark:text-[#fecaca]"
                : "text-[#d97706] bg-[#fef3c7] dark:bg-[#78350f]/35 dark:text-[#fde68a]",
        },
    ];

    const insightStyles = {
        positive: {
            Icon: CheckCircle2,
            className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] dark:border-[#22c55e]/25 dark:bg-[#052e16]/45 dark:text-[#bbf7d0]",
            badge: "Momentum",
        },
        warning: {
            Icon: AlertCircle,
            className: "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#f97316]/25 dark:bg-[#431407]/45 dark:text-[#fed7aa]",
            badge: "Perlu Atensi",
        },
        suggestion: {
            Icon: Lightbulb,
            className: "border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca] dark:border-[#818cf8]/25 dark:bg-[#1e1b4b]/45 dark:text-[#c7d2fe]",
            badge: "Saran",
        },
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#c7d2fe] bg-white/70 px-3 py-1 text-xs font-bold uppercase text-[#4f46e5] shadow-sm dark:border-[#818cf8]/30 dark:bg-[#1e1b4b]/35 dark:text-[#c7d2fe]">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Weekly Intelligence
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1f2937] dark:text-[#e5edf8] sm:text-4xl">Analytics</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#94a3b8]">
                        Ringkasan performa, kualitas fokus, dan sinyal adaptasi dari eksekusi harianmu.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#e2e8f0] bg-white/70 p-2 text-center shadow-sm dark:border-[#1e293b] dark:bg-[#111827]/70">
                    <div className="px-3 py-2">
                        <div className="text-lg font-black text-[#1f2937] dark:text-[#e5edf8]">{executionLogs.length}</div>
                        <div className="text-[11px] font-bold uppercase text-[#64748b]">Logs</div>
                    </div>
                    <div className="px-3 py-2">
                        <div className="text-lg font-black text-[#1f2937] dark:text-[#e5edf8]">{activities.length}</div>
                        <div className="text-[11px] font-bold uppercase text-[#64748b]">Tasks</div>
                    </div>
                    <div className="px-3 py-2">
                        <div className="text-lg font-black text-[#1f2937] dark:text-[#e5edf8]">{averageDistractions.toFixed(1)}</div>
                        <div className="text-[11px] font-bold uppercase text-[#64748b]">Distraksi</div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {scoreCards.map((metric) => (
                    <Card key={metric.label} className="overflow-hidden border-[#e2e8f0] bg-white/78 shadow-sm dark:border-[#1e293b] dark:bg-[#111827]/70">
                        <CardHeader className="p-4 pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CardDescription className="text-[11px] font-black uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8]">{metric.label}</CardDescription>
                                    <CardTitle className="mt-2 text-3xl font-black text-[#1f2937] dark:text-[#e5edf8]">{metric.value}</CardTitle>
                                </div>
                                <div className={`rounded-lg p-2.5 ${metric.tone}`}>
                                    <metric.icon className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="pt-2 text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">{metric.detail}</p>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <AiReflectionCard />

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <Card className="overflow-hidden border-[#e2e8f0] bg-white/80 shadow-sm dark:border-[#1e293b] dark:bg-[#111827]/75">
                    <CardHeader className="border-b border-[#e2e8f0]/70 pb-4 dark:border-[#1e293b]">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-[#eef2ff] p-2 text-[#4f46e5] dark:bg-[#312e81]/35 dark:text-[#c7d2fe]">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl text-[#1f2937] dark:text-[#e5edf8]">Execution Radar</CardTitle>
                                <CardDescription>Empat skor utama untuk membaca kualitas minggu ini.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[340px] p-3 sm:p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                                <PolarGrid stroke="rgba(148,163,184,0.35)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="rgba(148,163,184,0.25)" />
                                <Radar name="Skor" dataKey="score" stroke="#4f46e5" fill="#818cf8" fillOpacity={0.42} activeDot={{ r: 5 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', borderColor: '#c7d2fe', backgroundColor: '#ffffff', color: '#1f2937', fontWeight: 700, boxShadow: '0 10px 25px rgba(15,23,42,0.12)' }}
                                    itemStyle={{ color: '#4f46e5' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-[#1f2937] dark:text-[#e5edf8]">Chroniq AI Observations</h2>
                            <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">Insight singkat yang paling perlu kamu lihat.</p>
                        </div>
                        <Brain className="h-5 w-5 text-[#818cf8]" />
                    </div>
                    <div className="grid gap-3">
                        {insights.map((insight, idx) => {
                            const style = insightStyles[insight.type];
                            const Icon = style.Icon;

                            return (
                                <Card key={idx} className={`shadow-sm ${style.className}`}>
                                    <CardHeader className="flex flex-row items-start gap-3 p-4 pb-2">
                                        <div className="rounded-lg bg-white/65 p-2 shadow-sm dark:bg-white/10">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 text-[10px] font-black uppercase tracking-wide opacity-70">{style.badge}</div>
                                            <CardTitle className="text-base leading-snug text-inherit">{insight.title}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 pt-0">
                                        <p className="pl-12 text-sm leading-6 text-[#334155] dark:text-[#cbd5e1]">{insight.description}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-black text-[#1f2937] dark:text-[#e5edf8]">Riwayat Eksekusi</h2>
                    <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">12 log terbaru untuk audit cepat kualitas sesi.</p>
                </div>
            </div>
            <Card className="overflow-hidden border-[#e2e8f0] bg-white/80 shadow-sm dark:border-[#1e293b] dark:bg-[#111827]/75">
                <CardContent className="p-0">
                    {executionLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center text-[#64748b] dark:text-[#94a3b8]">
                            <ListChecks className="mb-3 h-9 w-9 text-[#cbd5e1]" />
                            <p className="font-bold text-[#334155] dark:text-[#e5edf8]">Belum ada riwayat aktivitas.</p>
                            <p className="mt-1 text-sm">Selesaikan satu blok fokus, lalu data analytics akan mulai hidup.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[660px] text-left text-sm">
                                <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] dark:border-[#1e293b] dark:bg-[#0f172a]/70">
                                    <tr>
                                        <th className="p-4 text-xs font-black uppercase tracking-wide text-[#64748b]">Status</th>
                                        <th className="p-4 text-xs font-black uppercase tracking-wide text-[#64748b]">Durasi</th>
                                        <th className="p-4 text-xs font-black uppercase tracking-wide text-[#64748b]">Fokus</th>
                                        <th className="p-4 text-xs font-black uppercase tracking-wide text-[#64748b]">Energi</th>
                                        <th className="p-4 text-xs font-black uppercase tracking-wide text-[#64748b]">Distraksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1e293b]">
                                    {latestLogs.map((log) => (
                                        <tr key={log.id} className="transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]/55">
                                            <td className="p-4">
                                                {log.status === "complete" ?
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-black text-[#166534] dark:bg-[#14532d]/45 dark:text-[#bbf7d0]"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span> :
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fee2e2] px-2.5 py-1 text-xs font-black text-[#b91c1c] dark:bg-[#7f1d1d]/45 dark:text-[#fecaca]"><AlertCircle className="h-3.5 w-3.5" /> Skipped</span>
                                                }
                                            </td>
                                            <td className="p-4 font-mono font-bold text-[#334155] dark:text-[#e5edf8]">{log.actual_duration}m</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-[#334155] dark:text-[#e5edf8]">{log.focus_score}/5</span>
                                                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e2e8f0] dark:bg-[#334155]">
                                                        <div className="h-full rounded-full bg-[#4f46e5]" style={{ width: `${(log.focus_score / 5) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 capitalize font-semibold text-[#334155] dark:text-[#cbd5e1]">{log.energy_after}</td>
                                            <td className="p-4 font-mono font-black text-[#dc2626]">{log.distraction_count > 0 ? log.distraction_count : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
