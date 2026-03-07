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
        <div className="space-y-5 pb-2">
            {isBurnoutWarning && (
                <div className="bg-[#ffebee]/60 backdrop-blur-md border-2 border-[#ffcdd2]/60 p-4 rounded-2xl flex items-center gap-3 text-[#c62828] shadow-sm">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <div>
                        <h3 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-5 h-5" /> Burnout Warning Triggered!</h3>
                        <p className="text-sm">Sistem mendeteksi risiko kelelahan ekstrem. Rekomendasi mandatori: Kosongkan sebagian jadwal hari ini untuk recovery (Recovery Day) atau perbanyak waktu santai minimal 2 jam.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Discipline", value: `${disciplineScore}%`, color: "" },
                    { label: "Priority Align", value: `${priorityAlign}%`, color: "" },
                    { label: "Prod. Index", value: tpi, color: "" },
                    { label: "Energy Rel", value: `${energyRel}%`, color: "" },
                    { label: "Burnout Risk", value: `${burnoutRisk}/100`, color: isBurnoutWarning ? "text-[#c62828] bg-[#ffebee]/60 backdrop-blur-md border-[#ffcdd2]/60" : "" },
                ].map((k, i) => (
                    <Card key={i} className={k.color ? k.color : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className={`uppercase tracking-wider font-semibold ${k.color ? 'text-[#c62828]' : ''}`}>{k.label}</CardDescription>
                            <CardTitle className="text-3xl font-bold">{k.value}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}
