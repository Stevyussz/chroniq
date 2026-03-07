"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePoeStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { generateWeeklyInsights } from "@/lib/engine/adaptation";
import { AlertCircle, Lightbulb, CheckCircle2 } from "lucide-react";
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

    const insights = generateWeeklyInsights(executionLogs);

    // Calculate Scores for Radar
    const disciplineScore = calculateDisciplineScore(executionLogs, currentSchedule);
    const priorityAlign = calculatePriorityAlignment(currentSchedule, activities);
    // Normalize TPI for a 0-100 scale radar chart (assuming TPI usually sits between 0 and 200)
    const normalizedTpi = Math.min(100, Math.round((calculateTPI(executionLogs) / 100) * 100));
    const energyRel = calculateEnergyReliability(executionLogs, currentSchedule);

    const radarData = [
        { subject: 'Discipline', score: disciplineScore, fullMark: 100 },
        { subject: 'Priority Sync', score: priorityAlign, fullMark: 100 },
        { subject: 'Prod. Index', score: normalizedTpi, fullMark: 100 },
        { subject: 'Energy Match', score: energyRel, fullMark: 100 },
    ];

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold mb-2">Weekly Radar & Insights</h1>
                <p className="text-[#a1887f]">Analisis Engine mendalam berdasarkan profil emosional dan eksekusi Anda.</p>
            </div>

            {/* AI Reflection Widget */}
            <AiReflectionCard />

            {/* RADAR CHART SECTION */}
            <Card className="border-4 border-[#ffccbc] shadow-[0_4px_20px_0_rgba(255,171,145,0.2)] bg-[#fffdf5]">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-[#bf360c]">Emotional & Execution Radar</CardTitle>
                    <CardDescription>Pemetaan kemampuan bertahan dan ketajaman fokus Anda minggu ini.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#efebe9" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#8d6e63', fontSize: 13, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#d7ccc8" />
                            <Radar name="Skor Anda" dataKey="score" stroke="#ff8a65" fill="#ffab91" fillOpacity={0.6} activeDot={{ r: 6 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', borderColor: '#ffccbc', backgroundColor: '#fff8e1', color: '#5d4037', fontWeight: 'bold' }}
                                itemStyle={{ color: '#bf360c' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <h2 className="text-2xl font-bold mt-12 mb-4">AI Observations</h2>
            <div className="grid gap-6">
                {insights.map((insight, idx) => {
                    let Icon = Lightbulb;
                    let colorClass = "text-[#1b5e20] bg-[#e8f5e9] border-[#a5d6a7]"; // Default/Info (Matcha)

                    if (insight.type === "positive") {
                        Icon = CheckCircle2;
                        colorClass = "text-[#bf360c] bg-[#fff5f2] border-[#ffab91]"; // Positive (Sakura)
                    } else if (insight.type === "warning") {
                        Icon = AlertCircle;
                        colorClass = "text-[#e65100] bg-[#fff8e1] border-[#ffe082]"; // Warning (Amber)
                    }

                    return (
                        <Card key={idx} className={`shadow-sm ${colorClass}`}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <Icon className="w-8 h-8" />
                                <div>
                                    <CardTitle className="text-xl">{insight.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-[#5d4037] ml-12">{insight.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Detail Riwayat */}
            <h2 className="text-2xl font-bold mt-12 mb-4">Riwayat Eksekusi (Log)</h2>
            <Card>
                <CardContent className="p-0">
                    {executionLogs.length === 0 ? (
                        <div className="p-8 text-center text-[#a1887f]">Belum ada riwayat aktivitas.</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#fffbfa] border-b-2 border-[#efebe9]">
                                <tr>
                                    <th className="p-4 font-bold text-[#8d6e63]">Status</th>
                                    <th className="p-4 font-bold text-[#8d6e63]">Durasi (m)</th>
                                    <th className="p-4 font-bold text-[#8d6e63]">Fokus (1-5)</th>
                                    <th className="p-4 font-bold text-[#8d6e63]">Energi</th>
                                    <th className="p-4 font-bold text-[#8d6e63]">Distraksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-[#efebe9]">
                                {[...executionLogs].reverse().map((log) => (
                                    <tr key={log.id} className="hover:bg-[#efebe9] transition-colors">
                                        <td className="p-4">
                                            {log.status === "complete" ?
                                                <span className="text-[#388e3c] font-bold">Complete</span> :
                                                <span className="text-[#d32f2f] font-bold">Skipped</span>
                                            }
                                        </td>
                                        <td className="p-4 font-mono font-medium">{log.actual_duration}</td>
                                        <td className="p-4 font-mono font-medium">{log.focus_score}</td>
                                        <td className="p-4 capitalize font-medium">{log.energy_after}</td>
                                        <td className="p-4 font-mono font-bold text-[#d32f2f]">{log.distraction_count > 0 ? log.distraction_count : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
