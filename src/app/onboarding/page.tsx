"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, ChevronDown, ChevronUp, Brain, Cloud, ShieldCheck, Trash2 } from "lucide-react";
import { usePoeStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChroniqAiLoader } from "@/components/ui/ChroniqAiLoader";
import { Activity, EnergySlot, FixedBlock } from "@/types";
import { MagicInput } from '@/components/dashboard/MagicInput';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, User } from "firebase/auth";
import { FirebaseError } from "firebase/app";

export default function OnboardingPage() {
    const router = useRouter();
    const { setUser, setEnergySlots, addFixedBlock, addActivity, resetAll } = usePoeStore();
    const [step, setStep] = useState(0); // Step 0 is now the Cloud Auth intro

    // Auth State
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [fbUser, setFbUser] = useState<User | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [sleepHours, setSleepHours] = useState(8);
    const [wakeUpTime, setWakeUpTime] = useState("07:00"); // More realistic default for Gen Z

    const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
    const [newFixed, setNewFixed] = useState({ title: "", start_time: "09:00", end_time: "17:00" });

    // SCIENCE FIX #3: Cortisol Awakening Response (CAR) — Clow et al. (2010)
    // Cortisol (the alertness hormone) rises 50% within 30-45 minutes of waking.
    // Cognitive peak occurs 2-4 hours after waking.
    // Formula: Peak Energy = wakeUp + 2h, Medium = wakeUp + 6h, Low = wakeUp + 10h
    // This means a user who wakes at 10:00 should have Peak from 12:00, NOT from 08:00.
    const computeDefaultEnergySlots = (wakeTime: string): EnergySlot[] => {
        const [wh, wm] = wakeTime.split(":").map(Number);
        const wakeMinutes = wh * 60 + wm;

        const addMinutes = (base: number, add: number): string => {
            const total = (base + add) % (24 * 60);
            return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
        };

        // Peak: 2-6 hours after waking (CAR + cognitive peak window)
        const peakStart = addMinutes(wakeMinutes, 120);   // +2 hours
        const peakEnd = addMinutes(wakeMinutes, 360);     // +6 hours
        // Medium: 6-10 hours after waking (post-peak, still functional)
        const mediumStart = peakEnd;
        const mediumEnd = addMinutes(wakeMinutes, 600);   // +10 hours
        // Low: 10+ hours after waking (fatigue sets in)
        const lowStart = mediumEnd;
        const lowEnd = addMinutes(wakeMinutes, 840);      // +14 hours (sleep target)

        return [
            { id: "e1", user_id: "user", start_time: peakStart, end_time: peakEnd, energy_level: "peak" },
            { id: "e2", user_id: "user", start_time: mediumStart, end_time: mediumEnd, energy_level: "medium" },
            { id: "e3", user_id: "user", start_time: lowStart, end_time: lowEnd, energy_level: "low" },
        ];
    };

    const [energySlots, setEnergySlotsLocal] = useState<EnergySlot[]>(() => computeDefaultEnergySlots("07:00"));

    const [activities, setActivities] = useState<Activity[]>([]);
    const [newAct, setNewAct] = useState({ name: "", duration: 30, priority: 3, category: "Fokus Tinggi (Analitis)" });

    // UI States
    const [isAiOptimizing, setIsAiOptimizing] = useState(false);
    const [isManualExpanded, setIsManualExpanded] = useState(false);
    const [isAiExpanded, setIsAiExpanded] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // SCIENCE FIX #3: Auto-update energy slot defaults when wakeUpTime changes.
    // This ensures the default slots on Step 3 are always biologically anchored
    // to the user's actual wake time using the CAR formula.
    useEffect(() => {
        setEnergySlotsLocal(computeDefaultEnergySlots(wakeUpTime));
    }, [wakeUpTime]);

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const handleGoogleLogin = async () => {
        setIsAuthenticating(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            setFbUser(result.user);
            if (result.user.displayName) {
                setName(result.user.displayName);
            }
            handleNext(); // Move to Step 1 (Profile)
        } catch (error: unknown) {
            console.error("Login failed:", error);
            const message = error instanceof FirebaseError || error instanceof Error
                ? error.message
                : "Unknown Error";
            alert(`Gagal login dengan Google. Error: ${message}`);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleGuestMode = () => {
        setName((current) => current || "Chroniq User");
        handleNext();
    };

    const handleFinish = async () => {
        setIsAiOptimizing(true);
        try {
            // 1. Send to Chroniq AI for logical refinement & break down
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
                wake_up_time: wakeUpTime,
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
            setUser({ id: "u1", name, sleep_hours: sleepHours, wake_up_time: wakeUpTime, created_at: new Date().toISOString() });
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

    const onRemoveFixed = (id: string) => {
        setFixedBlocks(prev => prev.filter(block => block.id !== id));
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

    const onRemoveActivity = (id: string) => {
        setActivities(prev => prev.filter(activity => activity.id !== id));
    };

    const handleMagicInputParsed = (newActivities: Activity[]) => {
        setActivities(prev => [...prev, ...newActivities]);
        setIsAiExpanded(false); // auto collapse after adding
    };

    return (
        <div className="max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center px-2 sm:px-0 pb-10">
            <div className="mb-8 overflow-hidden rounded-2xl bg-white/40 dark:bg-[#1e1e24]/40 p-6 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm relative transition-colors">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#ffab91]/20 dark:from-[#ff8a65]/10 to-[#ffccbc]/20 dark:to-[#ffccbc]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#ffe082]/20 dark:from-[#ffe082]/5 to-transparent blur-2xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none transition-colors" />

                <h1 className="text-3xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#e64a19] dark:from-[#ff8a65] to-[#ffa726] dark:to-[#ffb74d] relative z-10 transition-colors">
                    {step === 0 ? "Selamat Datang di Chroniq" : "Setup Engine Optimasi"}
                </h1>

                {step > 0 && (
                    <div className="flex gap-2 relative z-10 mt-4">
                        {[1, 2, 3, 4].map(num => (
                            <div key={num} className={`h-2 flex-1 rounded-full transition-all duration-500 ease-in-out ${step >= num ? 'bg-gradient-to-r from-[#ffb74d] to-[#ffa726] shadow-sm' : 'bg-[#efebe9] dark:bg-white/10'}`} />
                        ))}
                    </div>
                )}
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="bg-white/70 dark:bg-[#1e1e24]/70 backdrop-blur-xl border-white dark:border-white/10 shadow-xl shadow-[#ffccbc]/20 dark:shadow-black/40 overflow-hidden transition-colors">
                            {step === 0 && (
                                <>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffab91] dark:from-[#ff8a65] via-[#ffe082] dark:via-[#ffd54f] to-[#a5d6a7] dark:to-[#81c784] transition-colors" />
                                    <CardHeader className="text-center pt-10 pb-6">
                                        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#ffccbc] dark:from-[#ff8a65]/40 to-[#ffe082] dark:to-[#ffd54f]/40 rounded-3xl flex items-center justify-center mb-6 shadow-inner border-2 border-white dark:border-white/10 rotate-3 transition-colors">
                                            <Cloud className="w-10 h-10 text-[#e64a19] dark:text-[#ffab91]" />
                                        </div>
                                        <CardTitle className="text-2xl font-bold text-[#5d4037] dark:text-[#e4d8cd]">Sinkronisasi Awan</CardTitle>
                                        <CardDescription className="text-[15px] max-w-sm mx-auto mt-3 text-[#795548]/80 dark:text-[#a19d9b]">
                                            Login untuk menyimpan Jadwal, EXP, dan Data Profil Anda ke awan secara permanen.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center pb-10 space-y-4">
                                        <Button
                                            size="lg"
                                            onClick={handleGoogleLogin}
                                            disabled={isAuthenticating}
                                            className="w-full max-w-xs h-14 rounded-2xl bg-white dark:bg-[#1b2620]/80 hover:bg-[#fdfbf7] dark:hover:bg-[#25352c] text-[#5d4037] dark:text-[#e4d8cd] border-2 border-[#efebe9] dark:border-[#4caf50]/30 hover:border-[#ffab91] dark:hover:border-[#4caf50] shadow-sm hover:shadow-md transition-all flex items-center gap-3 font-semibold text-base relative overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            {isAuthenticating ? (
                                                <div className="w-5 h-5 border-2 border-[#ffab91] dark:border-[#81c784] border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            )}
                                            {isAuthenticating ? "Menghubungkan..." : "Lanjut dengan Google"}
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={handleGuestMode}
                                            disabled={isAuthenticating}
                                            className="w-full max-w-xs h-12 rounded-xl border-[#c7d2fe] text-[#4655d6] dark:border-[#818cf8]/40 dark:text-[#c7d2fe] hover:bg-[#eef2ff] dark:hover:bg-[#312e81]/30"
                                        >
                                            Lanjut Mode Lokal <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                        <div className="flex items-center gap-1.5 text-xs text-[#a1887f] dark:text-[#a19d9b] font-medium transition-colors">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>{fbUser ? `Terhubung sebagai ${fbUser.displayName || fbUser.email}` : "Bisa dipakai tanpa login untuk demo lokal"}</span>
                                        </div>
                                    </CardContent>
                                </>
                            )}

                            {step === 1 && (
                                <>
                                    <CardHeader>
                                        <CardTitle className="text-[#5d4037] dark:text-[#e4d8cd]">Profil Dasar</CardTitle>
                                        <CardDescription className="dark:text-[#a19d9b]">Beri tahu kami tentang kebutuhan istirahat Anda.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-[#5d4037] dark:text-[#d7ccc8]">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Nama</label>
                                            <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" value={name} onChange={e => setName(e.target.value)} placeholder="Misal: John Doe" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Jam biasa kamu bangun pagi? ☀️</label>
                                            <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="time" value={wakeUpTime} onChange={e => setWakeUpTime(e.target.value)} />
                                            <p className="text-xs text-[#a1887f] dark:text-[#a19d9b] mt-1">Jujur aja ya, nggak ada yang tahu! 🙈 Ini penting supaya jadwalmu akurat.</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Berapa jam kamu butuh tidur tiap malam?</label>
                                            <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="number" min={4} max={12} value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} />
                                        </div>
                                    </CardContent>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <CardHeader>
                                        <CardTitle className="text-[#5d4037] dark:text-[#e4d8cd]">Jadwal Tetap (Fixed Blocks)</CardTitle>
                                        <CardDescription className="dark:text-[#a19d9b]">Masukkan jadwal yang tidak bisa diganggu (misal: Kerja, Kelas, Commute).</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-[#5d4037] dark:text-[#d7ccc8]">
                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                                            <div>
                                                <label className="text-sm">Kegiatan</label>
                                                <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" value={newFixed.title} onChange={e => setNewFixed(prev => ({ ...prev, title: e.target.value }))} placeholder="Kerja Kantor" />
                                            </div>
                                            <div>
                                                <label className="text-sm">Mulai</label>
                                                <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="time" value={newFixed.start_time} onChange={e => setNewFixed(prev => ({ ...prev, start_time: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="text-sm">Selesai</label>
                                                <Input className="dark:bg-[#25352c]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="time" value={newFixed.end_time} onChange={e => setNewFixed(prev => ({ ...prev, end_time: e.target.value }))} />
                                            </div>
                                            <Button onClick={onAddFixed} variant="secondary" className="dark:bg-[#388e3c] dark:text-white dark:hover:bg-[#2e7d32]">Tambah</Button>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            {fixedBlocks.map((fb) => (
                                                <div key={fb.id} className="flex items-center justify-between gap-3 p-4 border rounded-lg border-[#e2e8f0] dark:border-white/10 bg-white/60 dark:bg-[#25352c]/30 transition-colors">
                                                    <div className="min-w-0">
                                                        <span className="font-bold block truncate">{fb.title}</span>
                                                        <span className="text-[#64748b] dark:text-[#a19d9b] font-mono text-sm">{fb.start_time} - {fb.end_time}</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-[#ef4444]" onClick={() => onRemoveFixed(fb.id)} aria-label={`Hapus ${fb.title}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <CardHeader>
                                        <CardTitle className="text-[#5d4037] dark:text-[#e4d8cd]">Profil Energi (Energy Mapping)</CardTitle>
                                        <CardDescription className="dark:text-[#a19d9b]">Kapan Anda merasa paling produktif?</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-[#5d4037] dark:text-[#d7ccc8]">
                                        {energySlots.map((slot, idx) => (
                                            <div key={idx} className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_5rem_1fr_auto_1fr] gap-3 items-center p-4 border rounded-lg border-[#e2e8f0] dark:border-white/10 bg-white/60 dark:bg-[#25352c]/30 transition-colors">
                                                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${slot.energy_level === 'peak' ? 'bg-[#ffab91] dark:bg-[#ff8a65] shadow-[0_0_10px_rgba(255,171,145,0.8)] dark:shadow-[0_0_10px_rgba(255,138,101,0.5)]' : slot.energy_level === 'medium' ? 'bg-[#ffe082] dark:bg-[#ffd54f] shadow-[0_0_10px_rgba(255,224,130,0.8)] dark:shadow-[0_0_10px_rgba(255,213,79,0.5)]' : 'bg-[#a5d6a7] dark:bg-[#81c784] shadow-[0_0_10px_rgba(165,214,167,0.8)] dark:shadow-[0_0_10px_rgba(129,199,132,0.5)]'}`} />
                                                <span className="font-medium capitalize">{slot.energy_level}</span>
                                                <Input className="dark:bg-[#1b2620]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="time" value={slot.start_time} onChange={(e) => {
                                                    const newSlots = [...energySlots];
                                                    newSlots[idx].start_time = e.target.value;
                                                    setEnergySlotsLocal(newSlots);
                                                }} />
                                                <span className="text-sm hidden sm:inline">sampai</span>
                                                <Input className="dark:bg-[#1b2620]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="time" value={slot.end_time} onChange={(e) => {
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
                                            <div className="w-10 h-10 bg-gradient-to-br from-[#ffab91] dark:from-[#ff8a65] to-[#ffccbc] dark:to-[#ffb74d] text-white rounded-xl flex items-center justify-center shadow-inner transition-colors">
                                                <Brain className="w-5 h-5 drop-shadow-sm" />
                                            </div>
                                            <CardTitle className="text-xl font-black text-[#8d6e63] dark:text-[#d7ccc8] flex items-center gap-2 transition-colors">
                                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e64a19] dark:from-[#ff8a65] to-[#f57c00] dark:to-[#ffb74d]">Chroniq</span> AI Setup
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="text-sm mt-2 dark:text-[#a19d9b]">Beri tahu AI apa yang harus Anda kerjakan hari ini dalam bahasa sehari-hari. Chroniq akan meraciknya.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(isAiProcessing || isAiOptimizing) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                className="rounded-2xl border border-[#818cf8]/30 bg-[#eef2ff]/80 dark:bg-[#1e1b4b]/35 p-4 shadow-[0_10px_30px_rgba(79,70,229,0.12)]"
                                            >
                                                <ChroniqAiLoader
                                                    size="md"
                                                    label={isAiOptimizing ? "Chroniq AI mengompilasi harimu" : "Chroniq AI membaca rencana kamu"}
                                                    sublabel={isAiOptimizing ? "Refine tugas, cek energi, lalu siapkan timeline pertama." : "Mengubah bahasa sehari-hari menjadi aktivitas, prioritas, dan durasi."}
                                                />
                                            </motion.div>
                                        )}

                                        {/* AI Natural Language Input Toggle */}
                                        {!isAiExpanded ? (
                                            <Button
                                                onClick={() => setIsAiExpanded(true)}
                                                className="w-full h-14 bg-white/40 dark:bg-[#25352c]/50 backdrop-blur-md border-2 border-dashed border-[#ffccbc]/80 dark:border-[#81c784]/40 hover:bg-[#fff5f2] dark:hover:bg-[#1b2620]/80 hover:border-[#ffab91] dark:hover:border-[#4caf50] text-[#8d6e63] dark:text-[#e4d8cd] font-bold rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center justify-center gap-3"
                                                variant="outline"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffab91] dark:from-[#81c784] to-[#ffccbc] dark:to-[#a5d6a7] text-white flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform">
                                                    <Brain className="w-full h-full drop-shadow-sm" />
                                                </div>
                                                Input Otomatis via Chroniq AI
                                            </Button>
                                        ) : (
                                            <div className="relative border-2 border-[#ffab91]/40 dark:border-[#81c784]/30 rounded-3xl p-4 bg-white/40 dark:bg-[#1b2620]/50 shadow-sm animate-in fade-in zoom-in-95 duration-200 transition-colors">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsAiExpanded(false)}
                                                    className="absolute top-2 right-2 text-[#a1887f] dark:text-[#a19d9b] hover:bg-[#fff5f2] dark:hover:bg-[#25352c] rounded-full z-20 transition-colors"
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
                                                className="w-full flex justify-between items-center text-[#a1887f] dark:text-[#a19d9b] hover:text-[#8d6e63] dark:hover:text-[#e4d8cd] hover:bg-[#fff8e1] dark:hover:bg-[#25352c]/50 rounded-xl h-9 transition-colors"
                                                onClick={() => setIsManualExpanded(!isManualExpanded)}
                                            >
                                                <span className="flex items-center gap-2 text-xs font-bold"><Zap className="w-3.5 h-3.5 text-[#ffab91] dark:text-[#ff8a65]" /> Atau input manual mendetail</span>
                                                {isManualExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                        </div>

                                        {/* Manual Input Fallback */}
                                        {isManualExpanded && (
                                            <div className="space-y-2 p-4 border-2 border-[#efebe9] dark:border-white/10 rounded-2xl bg-white dark:bg-[#1e1e24]/80 text-[#5d4037] dark:text-[#d7ccc8] animate-in fade-in slide-in-from-top-2 transition-colors">
                                                <Input className="dark:bg-[#1b2620]/50 dark:border-white/10 dark:text-[#e4d8cd]" placeholder="Nama Aktivitas (misal: Deep Work Coding)" value={newAct.name} onChange={e => setNewAct(p => ({ ...p, name: e.target.value }))} />
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs">Durasi (Menit)</label>
                                                        <Input className="dark:bg-[#1b2620]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="number" step={15} value={newAct.duration} onChange={e => setNewAct(p => ({ ...p, duration: Number(e.target.value) }))} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs">Prioritas (1=Low, 5=Peak)</label>
                                                        <Input className="dark:bg-[#1b2620]/50 dark:border-white/10 dark:text-[#e4d8cd]" type="number" min={1} max={5} value={newAct.priority} onChange={e => setNewAct(p => ({ ...p, priority: Number(e.target.value) }))} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-end mt-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs mb-1 block">Kategori Pekerjaan</label>
                                                        <select className="flex h-10 w-full rounded-md border border-[#efebe9] dark:border-white/10 bg-white dark:bg-[#1b2620]/50 px-3 py-2 text-sm text-[#5d4037] dark:text-[#e4d8cd] transition-colors" value={newAct.category} onChange={e => setNewAct(p => ({ ...p, category: e.target.value }))}>
                                                            <option value="Fokus Tinggi (Analitis)">Fokus Tinggi (Analitis)</option>
                                                            <option value="Kreativitas (Desain/Nulis)">Kreativitas (Desain/Nulis)</option>
                                                            <option value="Tugas Ringan (Kirim Email)">Tugas Ringan (Email/Kord)</option>
                                                            <option value="Fisik (Beres-beres)">Fisik (Beres-beres)</option>
                                                            <option value="Belajar/Membaca">Belajar/Membaca</option>
                                                            <option value="Ad-Hoc (Dadakan)">Ad-Hoc (Dadakan)</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex-[0.5]">
                                                        <Button onClick={onAddActivity} variant="secondary" className="w-full dark:bg-[#388e3c] dark:text-white dark:hover:bg-[#2e7d32]">Tambahkan</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 mt-4 max-h-[300px] overflow-auto">
                                            {activities.map((act) => (
                                                <div key={act.id} className="flex justify-between items-center gap-3 p-4 border border-[#e2e8f0] dark:border-white/10 rounded-lg bg-white/70 dark:bg-[#25352c]/30 transition-colors">
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-[#5d4037] dark:text-[#e4d8cd]">{act.name}</div>
                                                        <div className="text-sm font-medium text-[#a1887f] dark:text-[#a19d9b]">{act.target_duration} mins | Priority: {act.priority} | cat: {act.category}</div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-[#ef4444]" onClick={() => onRemoveActivity(act.id)} aria-label={`Hapus ${act.name}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </>
                            )}

                        </Card>
                    </motion.div>
                </AnimatePresence>

                {step > 0 && (
                    <div className="flex justify-between mt-6 px-2">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={step === 1 || isAiOptimizing}
                            className="text-[#a1887f] dark:text-[#a19d9b] hover:text-[#5d4037] dark:hover:text-[#e4d8cd] hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Kembali
                        </Button>
                        <Button
                            onClick={step === 4 ? handleFinish : handleNext}
                            disabled={isAiOptimizing}
                            className="bg-[#5d4037] dark:bg-[#ff8a65] hover:bg-[#4e342e] dark:hover:bg-[#f4511e] text-white rounded-xl shadow-md min-w-[120px] transition-all flex items-center gap-2"
                        >
                            {isAiOptimizing ? (
                                <ChroniqAiLoader size="sm" compact />
                            ) : null}
                            {step === 4 ? (isAiOptimizing ? "Memproses..." : "Mulai Optimasi") : "Selanjutnya"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
