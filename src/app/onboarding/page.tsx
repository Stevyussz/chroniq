"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Zap, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { usePoeStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, EnergySlot, FixedBlock } from "@/types";
import { MagicInput } from '@/components/dashboard/MagicInput';

export default function OnboardingPage() {
    const router = useRouter();
    const { setUser, setEnergySlots, addFixedBlock, addActivity, resetAll } = usePoeStore();
    const [step, setStep] = useState(1);

    // Form State
    const [name, setName] = useState("");
    const [sleepHours, setSleepHours] = useState(8);

    const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
    const [newFixed, setNewFixed] = useState({ title: "", start_time: "09:00", end_time: "17:00" });

    const [energySlots, setEnergySlotsLocal] = useState<EnergySlot[]>([
        { id: "e1", user_id: "user", start_time: "08:00", end_time: "12:00", energy_level: "peak" },
        { id: "e2", user_id: "user", start_time: "13:00", end_time: "17:00", energy_level: "medium" },
        { id: "e3", user_id: "user", start_time: "18:00", end_time: "22:00", energy_level: "low" },
    ]);

    const [activities, setActivities] = useState<Activity[]>([]);
    const [newAct, setNewAct] = useState({ name: "", duration: 30, priority: 3, category: "Fokus Tinggi (Analitis)" });

    // UI States
    const [isAiOptimizing, setIsAiOptimizing] = useState(false);
    const [isManualExpanded, setIsManualExpanded] = useState(false);
    const [isAiExpanded, setIsAiExpanded] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleFinish = async () => {
        setIsAiOptimizing(true);
        try {
            // 1. Send straight to Gemini for logical refinement & break down
            let finalActivities = [...activities];

            if (finalActivities.length > 0) {
                const response = await fetch('/api/ai/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activities: finalActivities })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.refinedActivities && Array.isArray(data.refinedActivities)) {
                        finalActivities = data.refinedActivities;
                    }
                }
            }

            // 2. Save pure data to Zustand
            resetAll();
            setUser({
                id: "u1",
                name,
                sleep_hours: sleepHours,
                created_at: new Date().toISOString()
            });
            setEnergySlots(energySlots);
            fixedBlocks.forEach(addFixedBlock);
            finalActivities.forEach(addActivity);

            // 3. Navigate
            router.push("/");
        } catch (error) {
            console.error("Failed AI optimization, saving raw data: ", error);
            resetAll();
            setUser({ id: "u1", name, sleep_hours: sleepHours, created_at: new Date().toISOString() });
            setEnergySlots(energySlots);
            fixedBlocks.forEach(addFixedBlock);
            activities.forEach(addActivity);
            router.push("/");
        } finally {
            setIsAiOptimizing(false);
        }
    };

    const onAddFixed = () => {
        if (!newFixed.title) return;
        setFixedBlocks(prev => [...prev, { ...newFixed, id: `fb-${Date.now()}`, user_id: 'user' }]);
        setNewFixed({ title: "", start_time: "09:00", end_time: "17:00" });
    };

    const onAddActivity = () => {
        if (!newAct.name) return;
        setActivities(prev => [...prev, {
            id: `act-${Date.now()}`,
            user_id: "user",
            name: newAct.name,
            target_duration: newAct.duration,
            priority: newAct.priority as 1 | 2 | 3 | 4 | 5,
            category: newAct.category
        }]);
        setNewAct({ name: "", duration: 30, priority: 3, category: "Fokus Tinggi (Analitis)" });
    };

    const handleMagicInputParsed = (newActivities: Activity[]) => {
        setActivities(prev => [...prev, ...newActivities]);
        setIsAiExpanded(false); // auto collapse after adding
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Setup Engine Optimasi</h1>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(num => (
                        <div key={num} className={`h-2 flex-1 rounded-full ${step >= num ? 'bg-[#ffb74d]' : 'bg-[#efebe9]'}`} />
                    ))}
                </div>
            </div>

            <Card>
                {step === 1 && (
                    <>
                        <CardHeader>
                            <CardTitle>Profil Dasar</CardTitle>
                            <CardDescription>Beri tahu kami tentang kebutuhan istirahat Anda.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nama</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Misal: John Doe" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Berapa jam Anda butuh tidur setiap malam?</label>
                                <Input type="number" min={4} max={12} value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} />
                            </div>
                        </CardContent>
                    </>
                )}

                {step === 2 && (
                    <>
                        <CardHeader>
                            <CardTitle>Jadwal Tetap (Fixed Blocks)</CardTitle>
                            <CardDescription>Masukkan jadwal yang tidak bisa diganggu (misal: Kerja, Kelas, Commute).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-sm">Kegiatan</label>
                                    <Input value={newFixed.title} onChange={e => setNewFixed(prev => ({ ...prev, title: e.target.value }))} placeholder="Kerja Kantor" />
                                </div>
                                <div>
                                    <label className="text-sm">Mulai</label>
                                    <Input type="time" value={newFixed.start_time} onChange={e => setNewFixed(prev => ({ ...prev, start_time: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm">Selesai</label>
                                    <Input type="time" value={newFixed.end_time} onChange={e => setNewFixed(prev => ({ ...prev, end_time: e.target.value }))} />
                                </div>
                                <Button onClick={onAddFixed} variant="secondary">Tambah</Button>
                            </div>

                            <div className="space-y-2 mt-4">
                                {fixedBlocks.map((fb, idx) => (
                                    <div key={idx} className="flex justify-between p-4 border-2 rounded-2xl border-[#efebe9]">
                                        <span className="font-bold">{fb.title}</span>
                                        <span className="text-[#a1887f] font-mono">{fb.start_time} - {fb.end_time}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </>
                )}

                {step === 3 && (
                    <>
                        <CardHeader>
                            <CardTitle>Profil Energi (Energy Mapping)</CardTitle>
                            <CardDescription>Kapan Anda merasa paling produktif?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {energySlots.map((slot, idx) => (
                                <div key={idx} className="flex gap-4 items-center p-4 border-2 rounded-2xl border-[#efebe9]">
                                    <div className={`w-4 h-4 rounded-full ${slot.energy_level === 'peak' ? 'bg-[#ffab91] shadow-[0_0_10px_rgba(255,171,145,0.8)]' : slot.energy_level === 'medium' ? 'bg-[#ffe082] shadow-[0_0_10px_rgba(255,224,130,0.8)]' : 'bg-[#a5d6a7] shadow-[0_0_10px_rgba(165,214,167,0.8)]'}`} />
                                    <span className="w-20 font-medium capitalize">{slot.energy_level}</span>
                                    <Input type="time" value={slot.start_time} onChange={(e) => {
                                        const newSlots = [...energySlots];
                                        newSlots[idx].start_time = e.target.value;
                                        setEnergySlotsLocal(newSlots);
                                    }} />
                                    <span>sampai</span>
                                    <Input type="time" value={slot.end_time} onChange={(e) => {
                                        const newSlots = [...energySlots];
                                        newSlots[idx].end_time = e.target.value;
                                        setEnergySlotsLocal(newSlots);
                                    }} />
                                </div>
                            ))}
                        </CardContent>
                    </>
                )}

                {step === 4 && (
                    <>
                        <CardHeader className="relative pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#ffab91] to-[#ffccbc] text-white rounded-xl flex items-center justify-center shadow-inner">
                                    <Brain className="w-5 h-5 drop-shadow-sm" />
                                </div>
                                <CardTitle className="text-xl font-black text-[#8d6e63] flex items-center gap-2">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e64a19] to-[#f57c00]">Chroniq</span> AI Setup
                                </CardTitle>
                            </div>
                            <CardDescription className="text-sm mt-2">Beri tahu AI apa yang harus Anda kerjakan hari ini dalam bahasa sehari-hari. Chroniq akan meraciknya.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* AI Natural Language Input Toggle */}
                            {!isAiExpanded ? (
                                <Button
                                    onClick={() => setIsAiExpanded(true)}
                                    className="w-full h-14 bg-white/40 backdrop-blur-md border-2 border-dashed border-[#ffccbc]/80 hover:bg-[#fff5f2] hover:border-[#ffab91] text-[#8d6e63] font-bold rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center justify-center gap-3"
                                    variant="outline"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffab91] to-[#ffccbc] text-white flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform">
                                        <Brain className="w-full h-full drop-shadow-sm" />
                                    </div>
                                    Input Otomatis via Chroniq AI
                                </Button>
                            ) : (
                                <div className="relative border-2 border-[#ffab91]/40 rounded-3xl p-4 bg-white/40 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsAiExpanded(false)}
                                        className="absolute top-2 right-2 text-[#a1887f] hover:bg-[#fff5f2] rounded-full z-20"
                                    >
                                        <ChevronUp className="w-5 h-5" />
                                    </Button>
                                    <div className="pt-4">
                                        <MagicInput
                                            isProcessing={isAiProcessing}
                                            setIsProcessing={setIsAiProcessing}
                                            onActivitiesParsed={handleMagicInputParsed}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    variant="ghost"
                                    className="w-full flex justify-between items-center text-[#a1887f] hover:text-[#8d6e63] hover:bg-[#fff8e1] rounded-xl h-9"
                                    onClick={() => setIsManualExpanded(!isManualExpanded)}
                                >
                                    <span className="flex items-center gap-2 text-xs font-bold"><Zap className="w-3.5 h-3.5" /> Atau input manual mendetail</span>
                                    {isManualExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                            </div>

                            {/* Manual Input Fallback */}
                            {isManualExpanded && (
                                <div className="space-y-2 p-4 border-2 border-[#efebe9] rounded-2xl bg-white animate-in fade-in slide-in-from-top-2">
                                    <Input placeholder="Nama Aktivitas (misal: Deep Work Coding)" value={newAct.name} onChange={e => setNewAct(p => ({ ...p, name: e.target.value }))} />
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs">Durasi (Menit)</label>
                                            <Input type="number" step={15} value={newAct.duration} onChange={e => setNewAct(p => ({ ...p, duration: Number(e.target.value) }))} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs">Prioritas (1=Low, 5=Peak)</label>
                                            <Input type="number" min={1} max={5} value={newAct.priority} onChange={e => setNewAct(p => ({ ...p, priority: Number(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-end mt-2">
                                        <div className="flex-1">
                                            <label className="text-xs mb-1 block">Kategori Pekerjaan</label>
                                            <select className="flex h-10 w-full rounded-md border border-[#efebe9] bg-white px-3 py-2 text-sm text-[#5d4037]" value={newAct.category} onChange={e => setNewAct(p => ({ ...p, category: e.target.value }))}>
                                                <option value="Fokus Tinggi (Analitis)">Fokus Tinggi (Analitis)</option>
                                                <option value="Kreativitas (Desain/Nulis)">Kreativitas (Desain/Nulis)</option>
                                                <option value="Tugas Ringan (Kirim Email)">Tugas Ringan (Email/Kord)</option>
                                                <option value="Fisik (Beres-beres)">Fisik (Beres-beres)</option>
                                                <option value="Belajar/Membaca">Belajar/Membaca</option>
                                                <option value="Ad-Hoc (Dadakan)">Ad-Hoc (Dadakan)</option>
                                            </select>
                                        </div>
                                        <div className="flex-[0.5]">
                                            <Button onClick={onAddActivity} variant="secondary" className="w-full">Tambahkan</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 mt-4 max-h-[300px] overflow-auto">
                                {activities.map((act, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 border-2 border-[#efebe9] rounded-2xl bg-[#fffbfa]">
                                        <div>
                                            <div className="font-bold">{act.name}</div>
                                            <div className="text-sm font-medium text-[#a1887f]">{act.target_duration} mins | Priority: {act.priority} | cat: {act.category}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </>
                )}

                <CardFooter className="flex justify-between mt-4">
                    <Button variant="ghost" onClick={handleBack} disabled={step === 1}>Kembali</Button>
                    {step === 4 ? (
                        <Button onClick={handleFinish} disabled={isAiOptimizing} className="bg-[#ffb74d] hover:bg-[#ffa726] shadow-[#ffccbc] border-none text-white transition-all">
                            {isAiOptimizing ? (
                                <span className="flex items-center gap-2 animate-pulse"><Sparkles className="w-4 h-4" /> AI sedang Meracik Jadwal...</span>
                            ) : (
                                <span className="flex items-center"><Sparkles className="w-4 h-4 mr-1.5" /> Mulai Optimasi <Sparkles className="w-4 h-4 ml-1.5" /></span>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>Lanjut <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
