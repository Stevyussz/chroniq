"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardEdit, Minus, Plus } from "lucide-react";

interface MicroEvalModalProps {
    evalBlockId: string | null;
    focusScore: number;
    setFocusScore: (v: number) => void;
    energyAfter: "up" | "same" | "down";
    setEnergyAfter: (v: "up" | "same" | "down") => void;
    distractions: number;
    setDistractions: (v: number) => void;
    submitEval: () => void;
    // BUG FIX #6: onSkip allows dismissing without submitting (e.g., urgent situation)
    onSkip?: () => void;
}

export function MicroEvalModal({
    evalBlockId,
    focusScore,
    setFocusScore,
    energyAfter,
    setEnergyAfter,
    distractions,
    setDistractions,
    submitEval,
    onSkip
}: MicroEvalModalProps) {
    if (!evalBlockId) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-[#4a4a4a]/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-colors"
            onClick={(e) => { if (e.target === e.currentTarget && onSkip) onSkip(); }} // Click outside to dismiss
        >
            <Card className="w-full max-w-md border-2 border-[#81c784] dark:border-[#4caf50] shadow-[0_0_20px_rgba(129,199,132,0.2)] dark:shadow-[0_0_20px_rgba(76,175,80,0.1)] bg-[#e8f5e9] dark:bg-[#1b2620] transition-colors">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-[#5d4037] dark:text-[#e4d8cd]"><ClipboardEdit className="w-5 h-5 text-[#66bb6a] dark:text-[#81c784]" /> Micro Evaluation</CardTitle>
                        {onSkip && (
                            <button
                                onClick={onSkip}
                                className="text-[#a1887f] hover:text-[#5d4037] dark:text-[#a19d9b] dark:hover:text-[#e4d8cd] transition-colors p-1 rounded-lg hover:bg-[#efebe9] dark:hover:bg-white/10"
                                aria-label="Lewati evaluasi"
                                title="Lewati (tidak direkomendasikan)"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <CardDescription className="dark:text-[#a19d9b]">Beri rate singkat kualitas kerja kamu barusan.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 items-end text-[#5d4037] dark:text-[#d7ccc8]">
                    <div>
                        <label className="text-sm font-bold mb-2 block">Focus Score (1-5)</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <Button
                                    key={score}
                                    type="button"
                                    variant={focusScore === score ? "default" : "outline"}
                                    onClick={() => setFocusScore(score)}
                                    className="h-11 px-0"
                                    aria-pressed={focusScore === score}
                                >
                                    {score}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Energy After</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: "up", label: "Naik" },
                                { value: "same", label: "Tetap" },
                                { value: "down", label: "Turun" },
                            ].map((option) => (
                                <Button
                                    key={option.value}
                                    type="button"
                                    variant={energyAfter === option.value ? "secondary" : "outline"}
                                    onClick={() => setEnergyAfter(option.value as "up" | "same" | "down")}
                                    aria-pressed={energyAfter === option.value}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Jumlah Distraksi</label>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#cbd5e1] dark:border-[#4caf50]/30 bg-white dark:bg-[#25352c] p-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => setDistractions(Math.max(0, distractions - 1))}
                                aria-label="Kurangi distraksi"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-mono text-2xl font-bold min-w-12 text-center">{distractions}</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => setDistractions(distractions + 1)}
                                aria-label="Tambah distraksi"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardContent>
                    <Button onClick={submitEval} className="w-full bg-[#66bb6a] dark:bg-[#4caf50] hover:bg-[#4caf50] dark:hover:bg-[#388e3c] text-white transition-colors">Submit Evaluation</Button>
                </CardContent>
            </Card>
        </div>
    );
}
