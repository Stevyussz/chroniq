"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Zap, ChevronDown, ChevronUp, Brain, Repeat, CheckCircle2 } from "lucide-react";
import { MagicInput } from "./MagicInput";
import { type Activity } from "@/types";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface QuickAddTaskProps {
    onAddAndOptimize: (taskDetails: { name: string; duration: number; priority: 1 | 2 | 3 | 4 | 5; category: string; preferred_start?: string; recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays'; deadline?: string }) => void;
}

function SuccessToast({ message }: { message: string }) {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="absolute -top-14 left-0 right-0 mx-auto w-max z-50 flex items-center gap-2 bg-[#4caf50] dark:bg-[#388e3c] text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function QuickAddTask({ onAddAndOptimize }: QuickAddTaskProps) {
    const [isManualExpanded, setIsManualExpanded] = useState(false);
    const [isAiExpanded, setIsAiExpanded] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const [quickTaskName, setQuickTaskName] = useState("");
    const [quickTaskDuration, setQuickTaskDuration] = useState("");
    const [quickTaskPriority, setQuickTaskPriority] = useState(3);
    const [quickTaskCategory, setQuickTaskCategory] = useState("Ad-Hoc (Dadakan)");
    const [quickTaskRecurrence, setQuickTaskRecurrence] = useState<'none' | 'daily' | 'weekly' | 'weekdays'>('none');
    const [quickTaskDeadline, setQuickTaskDeadline] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(""), 3500);
    };

    const handleQuickAdd = () => {
        if (!quickTaskName || !quickTaskDuration) return;

        onAddAndOptimize({
            name: quickTaskName,
            duration: parseInt(quickTaskDuration),
            priority: quickTaskPriority as 1 | 2 | 3 | 4 | 5,
            category: quickTaskCategory,
            recurrence: quickTaskRecurrence,
            ...(quickTaskDeadline && { deadline: quickTaskDeadline })
        });

        // Reset Form
        setQuickTaskName("");
        setQuickTaskDuration("");
        setQuickTaskPriority(3);
        setQuickTaskCategory("Ad-Hoc (Dadakan)");
        setQuickTaskRecurrence('none');
        setQuickTaskDeadline("");
        showSuccess("Tugas manual berhasil ditambahkan!");
    };

    const handleMagicInputParsed = (activities: Activity[]) => {
        activities.forEach(act => {
            onAddAndOptimize({
                name: act.name,
                duration: act.target_duration,
                priority: act.priority as 1 | 2 | 3 | 4 | 5,
                category: act.category,
                preferred_start: act.preferred_start,
                recurrence: act.recurrence || 'none',
                ...(act.deadline && { deadline: act.deadline })
            });
        });
        setIsAiExpanded(false);
        showSuccess(`${activities.length} tugas berhasil ditambahkan dari Chroniq AI!`);
    };

    if (!isAiExpanded) {
        return (
            <div className="relative">
                <SuccessToast message={successMessage} />
                <Button
                    onClick={() => setIsAiExpanded(true)}
                    className="w-full h-14 bg-white/40 dark:bg-[#2d2d35]/40 backdrop-blur-md border-2 border-dashed border-[#ffccbc]/80 dark:border-[#ff8a65]/40 hover:bg-white/60 dark:hover:bg-[#2d2d35]/70 hover:border-[#ffab91] dark:hover:border-[#ff8a65] text-[#8d6e63] dark:text-[#a19d9b] hover:text-[#5d4037] dark:hover:text-[#e4d8cd] font-bold rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center justify-center gap-3"
                    variant="outline"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffab91] to-[#ffccbc] dark:from-[#ff8a65] dark:to-[#ffccbc] text-white flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform shadow-sm">
                        <Brain className="w-full h-full drop-shadow-sm" />
                    </div>
                    Tambah Tugas Baru dengan Chroniq AI
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <SuccessToast message={successMessage} />
            <Card className="bg-white/40 dark:bg-[#1e1e24]/40 backdrop-blur-md border-2 border-[#ffab91]/40 dark:border-[#ff8a65]/30 shadow-sm relative overflow-visible rounded-3xl animate-in fade-in zoom-in-95 duration-200 transition-colors">
            {/* Close button mapping for Expanded View */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAiExpanded(false)}
                className="absolute top-2 right-2 text-[#a1887f] dark:text-[#a19d9b] hover:bg-[#fff5f2] dark:hover:bg-[#ff8a65]/20 rounded-full z-20 transition-colors"
            >
                <ChevronUp className="w-5 h-5" />
            </Button>

            <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-lg flex items-center gap-2 text-[#8d6e63] dark:text-[#a19d9b]">
                    <Image src="/icon.png" alt="Chroniq Logo" width={20} height={20} className="w-5 h-5 drop-shadow-sm" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e64a19] dark:from-[#ff8a65] to-[#f57c00] dark:to-[#ffb74d] font-black">Chroniq</span> AI Quick Add
                </CardTitle>
                <CardDescription className="text-xs dark:text-[--text-muted]">
                    Ketik apa yang ingin Anda kerjakan dengan bahasa sehari-hari. Chroniq AI akan menerjemahkannya ke dalam jadwal.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* AI Natural Language Input */}
                <MagicInput
                    isProcessing={isAiProcessing}
                    setIsProcessing={setIsAiProcessing}
                    onActivitiesParsed={handleMagicInputParsed}
                />

                <div className="pt-2">
                    <Button
                        variant="ghost"
                        className="w-full flex justify-between items-center text-[#a1887f] hover:text-[#8d6e63] hover:bg-white/50 rounded-xl h-9"
                        onClick={() => setIsManualExpanded(!isManualExpanded)}
                    >
                        <span className="flex items-center gap-2 text-xs font-bold"><Zap className="w-3.5 h-3.5" /> Atau input manual secara rinci</span>
                        {isManualExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Manual Input Fallback */}
                {isManualExpanded && (
                    <div className="flex flex-col md:flex-row gap-3 items-end bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/80 mt-2 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="flex-1 w-full">
                            <label className="text-sm font-bold mb-1 flex items-center gap-1.5 text-[#8d6e63]">Nama Tugas</label>
                            <Input
                                placeholder="mis: Balas Email"
                                value={quickTaskName}
                                onChange={e => setQuickTaskName(e.target.value)}
                                className="bg-white/60 border-white/50 backdrop-blur-sm"
                            />
                        </div>
                        <div className="w-full md:w-32">
                            <label className="text-sm font-medium mb-1 block text-[#8d6e63]">Durasi (mnt)</label>
                            <Input
                                type="number"
                                placeholder="30"
                                value={quickTaskDuration}
                                onChange={e => setQuickTaskDuration(e.target.value)}
                                className="bg-white/60 border-white/50 backdrop-blur-sm"
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <label className="text-sm font-medium mb-1 block text-[#8d6e63]">Kategori</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-white/50 dark:border-white/10 bg-white/60 dark:bg-[#1e1e24]/60 backdrop-blur-sm px-3 py-2 text-sm text-[#5d4037] dark:text-[#e4d8cd] transition-colors"
                                value={quickTaskCategory}
                                onChange={e => setQuickTaskCategory(e.target.value)}
                            >
                                <option value="Fokus Tinggi (Analitis)">Fokus Tinggi (Analitis)</option>
                                <option value="Kreativitas (Desain/Nulis)">Kreativitas (Desain/Nulis)</option>
                                <option value="Tugas Ringan (Email/Kord)">Tugas Ringan (Email/Kord)</option>
                                <option value="Fisik (Beres-beres)">Fisik (Beres-beres)</option>
                                <option value="Belajar/Membaca">Belajar/Membaca</option>
                                <option value="Ad-Hoc (Dadakan)">Ad-Hoc (Dadakan)</option>
                            </select>
                        </div>
                        <div className="w-full md:w-32">
                            <label className="text-sm font-medium mb-1 block text-[#8d6e63]">Prioritas(1-5)</label>
                            <Input
                                type="number"
                                min={1}
                                max={5}
                                value={quickTaskPriority}
                                onChange={e => setQuickTaskPriority(Number(e.target.value))}
                                className="bg-white/60 border-white/50 backdrop-blur-sm"
                            />
                        </div>
                        <div className="w-full md:w-44">
                            <label className="text-sm font-medium mb-1 block text-[#8d6e63]">Pengulangan</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-white/50 dark:border-white/10 bg-white/60 dark:bg-[#1e1e24]/60 backdrop-blur-sm px-3 py-2 text-sm text-[#5d4037] dark:text-[#e4d8cd] transition-colors"
                                value={quickTaskRecurrence}
                                onChange={e => setQuickTaskRecurrence(e.target.value as 'none' | 'daily' | 'weekly' | 'weekdays')}
                            >
                                <option value="none">Tidak Berulang</option>
                                <option value="daily">🔁 Setiap Hari</option>
                                <option value="weekdays">📅 Hari Kerja (Sen-Jum)</option>
                                <option value="weekly">🗓️ Tiap Minggu</option>
                            </select>
                        </div>
                        <div className="w-full md:w-44">
                            <label className="text-sm font-medium mb-1 flex items-center gap-1.5 text-[#8d6e63]">
                                📅 Deadline <span className="text-[10px] text-[#a1887f] font-normal">(opsional)</span>
                            </label>
                            <Input
                                type="date"
                                value={quickTaskDeadline}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setQuickTaskDeadline(e.target.value)}
                                className="bg-white/60 border-white/50 backdrop-blur-sm text-[#5d4037] dark:text-[#e4d8cd]"
                            />
                        </div>
                        <Button
                            onClick={handleQuickAdd}
                            disabled={!quickTaskName || !quickTaskDuration}
                            className="w-full md:w-auto bg-[#ffab91] hover:bg-[#ff8a65] text-white font-bold h-10"
                        >
                            {quickTaskRecurrence !== 'none' && <Repeat className="w-4 h-4 mr-1.5" />}
                            {quickTaskRecurrence === 'none' ? <Plus className="w-4 h-4 mr-1" /> : null}
                            Add {quickTaskRecurrence !== 'none' ? '(Recurring)' : ''}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
}
