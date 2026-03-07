"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface KpiDashboardProps {
    disciplineScore: number;
    priorityAlign: number;
    tpi: string;
    energyRel: number;
    burnoutRisk: number;
    isBurnoutWarning: boolean;
}

export function KpiDashboard({
    disciplineScore,
    priorityAlign,
    tpi,
    energyRel,
    burnoutRisk,
    isBurnoutWarning
}: KpiDashboardProps) {
    return (
        <div className="space-y-5 pb-2 transition-colors">
            {isBurnoutWarning && (
                <div className="bg-[#ffebee]/60 dark:bg-[#c62828]/20 backdrop-blur-md border-2 border-[#ffcdd2]/60 dark:border-[#c62828]/40 p-4 rounded-2xl flex items-center gap-3 text-[#c62828] dark:text-[#ff8a80] shadow-sm transition-colors">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <div>
                        <h3 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-5 h-5" /> Burnout Warning Triggered!</h3>
                        <p className="text-sm dark:text-[#ffcdd2]">Sistem mendeteksi risiko kelelahan ekstrem. Rekomendasi mandatori: Kosongkan sebagian jadwal hari ini untuk recovery (Recovery Day) atau perbanyak waktu santai minimal 2 jam.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Discipline", value: `${disciplineScore}%`, baseColor: "bg-white/95 dark:bg-[#2d2d35]/95 shadow-sm border-0 dark:border-white/5", textColor: "text-[--foreground]" },
                    { label: "Priority Align", value: `${priorityAlign}%`, baseColor: "bg-white/95 dark:bg-[#2d2d35]/95 shadow-sm border-0 dark:border-white/5", textColor: "text-[--foreground]" },
                    { label: "Prod. Index", value: tpi, baseColor: "bg-white/95 dark:bg-[#2d2d35]/95 shadow-sm border-0 dark:border-white/5", textColor: "text-[--foreground]" },
                    { label: "Energy Rel", value: `${energyRel}%`, baseColor: "bg-white/95 dark:bg-[#2d2d35]/95 shadow-sm border-0 dark:border-white/5", textColor: "text-[--foreground]" },
                    { label: "Burnout Risk", value: `${burnoutRisk}/100`, baseColor: isBurnoutWarning ? "bg-[#ffebee]/60 dark:bg-[#c62828]/20 backdrop-blur-md border-[#ffcdd2]/60 dark:border-[#c62828]/40 border-2" : "bg-white/95 dark:bg-[#2d2d35]/95 shadow-sm border-0 dark:border-white/5", textColor: isBurnoutWarning ? "text-[#c62828] dark:text-[#ff8a80]" : "text-[--foreground]" },
                ].map((k, i) => (
                    <Card key={i} className={`transition-colors ${k.baseColor}`}>
                        <CardHeader className="pb-2">
                            <CardDescription className={`uppercase tracking-wider font-semibold ${isBurnoutWarning && i === 4 ? '' : 'dark:text-[--text-muted]'} ${k.textColor}`}>{k.label}</CardDescription>
                            <CardTitle className={`text-3xl font-bold ${k.textColor}`}>{k.value}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}
