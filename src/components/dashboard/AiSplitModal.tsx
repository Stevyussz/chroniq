"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Brain } from "lucide-react";

interface AiSplitModalProps {
    isOpen: boolean;
    pendingTask: { name: string; target_duration: number; } | null;
    isLoading: boolean;
    onConfirm: () => void;
    onReject: () => void;
}

export function AiSplitModal({ isOpen, pendingTask, isLoading, onConfirm, onReject }: AiSplitModalProps) {
    if (!isOpen || !pendingTask) return null;

    return (
        <Card className="border-2 border-[#ffab91]/50 shadow-md shadow-[#ffab91]/10 bg-gradient-to-br from-[#fffbfa] to-[#fff5f2] animate-in slide-in-from-top-4 rounded-3xl relative overflow-hidden">
            {/* Decorative Gradient Blob */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#e64a19]/10 to-transparent blur-2xl pointer-events-none rounded-bl-full"></div>

            <CardHeader className="relative z-10 pb-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#ffab91] to-[#ffccbc] text-white rounded-xl flex items-center justify-center shadow-inner">
                        <Brain className="w-5 h-5 drop-shadow-sm" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-[#8d6e63] flex items-center gap-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e64a19] to-[#f57c00]">Chroniq</span> AI Intervention
                        </CardTitle>
                    </div>
                </div>
                <CardDescription className="text-[#8d6e63] font-medium text-sm leading-relaxed mt-2">
                    Tugas <b className="text-[#bf360c]">&quot;{pendingTask.name}&quot;</b> menuntut fokus selama {pendingTask.target_duration} menit tanpa henti. Berdasarkan riset psikologi kerja, otak manusia rentan mengalami <i>burnout</i> jika dihadapkan pada satu blok melebihi 90 menit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm mx-6 mb-6 relative z-10">
                    <p className="text-sm mb-3 font-bold text-[#e64a19] flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#ffab91] animate-pulse" /> Strategi AI yang direkomendasikan:</p>
                    <div className="flex flex-col gap-2">
                        <ul className="list-disc pl-5 text-sm text-[#8d6e63] space-y-2">
                            <li>Biarkan sistem memotong tugas ini menjadi <b>{Math.ceil(pendingTask.target_duration / 60)} etape sprint</b> (maksimal 60 menit per sesi).</li>
                            <li>Ini akan memaksa masuknya blok <i>Deep Work Break</i> (Istirahat Wajib) di sela-sela etape.</li>
                            <li>Secara psikologis, ini menipu otak agar merasa tugas lebih ringan, meningkatkan probabilitas eksekusi hingga 40%.</li>
                        </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-5">
                        <Button onClick={onConfirm} disabled={isLoading} className="bg-gradient-to-r from-[#ff8a65] to-[#ff7043] rounded-xl font-bold text-white flex-1 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 border-none h-11">
                            {isLoading ? (
                                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-spin" /> Meracik sub-tugas...</span>
                            ) : (
                                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 fill-current" /> Pecah dengan AI & Sebarkan</span>
                            )}
                        </Button>
                        <Button onClick={onReject} variant="outline" className="border-2 border-[#ffccbc] text-[#bf360c] hover:bg-[#ffebee]/80 rounded-xl font-semibold h-11">
                            Tetap Paksa 1 Blok
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
