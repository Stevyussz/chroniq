"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardEdit } from "lucide-react";

interface MicroEvalModalProps {
    evalBlockId: string | null;
    focusScore: number;
    setFocusScore: (v: number) => void;
    energyAfter: "up" | "same" | "down";
    setEnergyAfter: (v: "up" | "same" | "down") => void;
    distractions: number;
    setDistractions: (v: number) => void;
    submitEval: () => void;
}

export function MicroEvalModal({
    evalBlockId,
    focusScore,
    setFocusScore,
    energyAfter,
    setEnergyAfter,
    distractions,
    setDistractions,
    submitEval
}: MicroEvalModalProps) {
    if (!evalBlockId) return null;

    return (
        <div className="fixed inset-0 z-50 bg-[#4a4a4a]/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-colors">
            <Card className="w-full max-w-md border-2 border-[#81c784] dark:border-[#4caf50] shadow-[0_0_20px_rgba(129,199,132,0.2)] dark:shadow-[0_0_20px_rgba(76,175,80,0.1)] bg-[#e8f5e9] dark:bg-[#1b2620] transition-colors">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#5d4037] dark:text-[#e4d8cd]"><ClipboardEdit className="w-5 h-5 text-[#66bb6a] dark:text-[#81c784]" /> Micro Evaluation</CardTitle>
                    <CardDescription className="dark:text-[#a19d9b]">Beri rate singkat kualitas kerja Anda barusan.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 items-end text-[#5d4037] dark:text-[#d7ccc8]">
                    <div>
                        <label className="text-sm font-bold mb-2 block">Focus Score (1-5)</label>
                        <Input
                            type="number"
                            min={1}
                            max={5}
                            value={focusScore}
                            onChange={e => setFocusScore(Number(e.target.value))}
                            className="dark:bg-[#25352c] dark:border-[#4caf50]/30 dark:text-[#e4d8cd]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Energy After</label>
                        <select
                            className="flex h-12 w-full rounded-2xl border-2 border-[#efebe9] dark:border-[#4caf50]/30 bg-white dark:bg-[#25352c] px-4 py-2 text-sm text-[#5d4037] dark:text-[#e4d8cd] shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffccbc] dark:focus-visible:ring-[#81c784]/50 transition-colors"
                            value={energyAfter}
                            onChange={e => setEnergyAfter(e.target.value as "up" | "same" | "down")}
                        >
                            <option value="up">Naik (Up)</option>
                            <option value="same">Tetap (Same)</option>
                            <option value="down">Turun (Down)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Jumlah Distraksi</label>
                        <Input
                            type="number"
                            min={0}
                            value={distractions}
                            onChange={e => setDistractions(Number(e.target.value))}
                            className="dark:bg-[#25352c] dark:border-[#4caf50]/30 dark:text-[#e4d8cd]"
                        />
                    </div>
                </CardContent>
                <CardContent>
                    <Button onClick={submitEval} className="w-full bg-[#66bb6a] dark:bg-[#4caf50] hover:bg-[#4caf50] dark:hover:bg-[#388e3c] text-white transition-colors">Submit Evaluation</Button>
                </CardContent>
            </Card>
        </div>
    );
}
