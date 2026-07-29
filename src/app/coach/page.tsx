"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Brain, Code, CalendarDays, ListChecks, RotateCcw, SlidersHorizontal, Wand2, PanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChroniqAiLoader } from "@/components/ui/ChroniqAiLoader";
import { fetchChroniqAiJson } from "@/lib/ai/client";
import { usePoeStore } from "@/store/useStore";
import { useScheduleManager } from "@/hooks/useScheduleManager";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface ChatMessage {
    id: string;
    role: "user" | "model";
    content: string;
}

const VALID_CATEGORIES = [
    "Fokus Tinggi (Analitis)",
    "Kreativitas (Desain/Nulis)",
    "Tugas Ringan (Email/Kord)",
    "Fisik (Beres-beres)",
    "Belajar/Membaca",
    "Ad-Hoc (Dadakan)",
];

const clampPriority = (priority: unknown): 1 | 2 | 3 | 4 | 5 => {
    const value = typeof priority === "number" ? priority : Number(priority);
    const normalized = Math.round(Number.isFinite(value) ? value : 3);
    return Math.min(5, Math.max(1, normalized)) as 1 | 2 | 3 | 4 | 5;
};

const clampDuration = (duration: unknown): number => {
    const value = typeof duration === "number" ? duration : Number(duration);
    const normalized = Math.round(Number.isFinite(value) ? value : 30);
    return Math.min(480, Math.max(5, normalized));
};

const normalizeCategory = (category: unknown) => {
    return typeof category === "string" && VALID_CATEGORIES.includes(category)
        ? category
        : "Ad-Hoc (Dadakan)";
};

const normalizeRecurrence = (recurrence: unknown): 'none' | 'daily' | 'weekly' | 'weekdays' => {
    return recurrence === "daily" || recurrence === "weekly" || recurrence === "weekdays" || recurrence === "none"
        ? recurrence
        : "none";
};

const isDateString = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTimeString = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const suggestionPrompts = [
    {
        icon: CalendarDays,
        title: "Plan ujian 1 bulan",
        prompt: "Buatkan aku plan belajar ujian selama 1 bulan untuk IPA, IPS, Biologi, Kimia, Matematika, dan Matematika Lanjut.",
    },
    {
        icon: ListChecks,
        title: "Pecah tugas besar",
        prompt: "Pecah tugas paling beratku jadi checklist kecil yang gampang dieksekusi.",
    },
    {
        icon: SlidersHorizontal,
        title: "Tuning jadwal hari ini",
        prompt: "Baca timeline hari ini dan susun ulang supaya lebih realistis dengan energiku.",
    },
    {
        icon: Wand2,
        title: "Coach fokus",
        prompt: "Aku lagi susah fokus. Bantu aku pilih satu tugas paling penting dan strategi mulai 25 menit pertama.",
    },
];

export default function CoachPage() {
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const {
        level, exp, activities, currentSchedule, addActivity, removeActivity,
        energySlots, fixedBlocks, user, chatHistory, addChatMessage,
        currentStreak, longestStreak, updateActivity, addChecklist, setEnergySlots,
        clearChatHistory
    } = usePoeStore();
    const { handleReoptimize } = useScheduleManager();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Chat history: loaded from persisted store, falls back to welcome message on first visit.
    // FIX: Previously only useState([welcome]), so history was lost on every page refresh.
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const buildWelcomeMessage = (): ChatMessage => ({
        id: "sys-welcome",
        role: "model",
        content: `Halo, ${user?.name || 'Sobat'}. Aku Chroniq AI Coach. Aku bisa bantu bikin plan belajar, merapikan jadwal, memecah tugas, menambah checklist, dan re-optimize timeline kamu.`,
    });

    useEffect(() => {
        if (chatHistory.length > 0) {
            setMessages(chatHistory);
        } else {
            setMessages([buildWelcomeMessage()]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (cooldown > 0) {
            timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [cooldown]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && !user) {
            router.push("/onboarding");
        }
    }, [isClient, user, router]);

    // Auto-scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isThinking]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isThinking || cooldown > 0) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        addChatMessage(userMsg); // Persist to store
        setInput("");
        setIsThinking(true);

        try {
            // Rich context for dynamic AI persona adaptation
            const context = {
                level,
                exp,
                currentStreak,
                longestStreak,
                upcomingTasksCount: currentSchedule.filter(b => b.type === 'activity').length,
                pendingActivitiesCount: activities.length,
                energyZones: energySlots.map(e => `${e.energy_level} (${e.start_time}-${e.end_time})`).join(", "),
                fixedEvents: fixedBlocks.length,
                activeTasks: activities.slice(0, 50).map((activity) => ({
                    id: activity.id,
                    name: activity.name,
                    duration: activity.target_duration,
                    priority: activity.priority,
                    category: activity.category,
                    recurrence: activity.recurrence || "none",
                    preferred_start: activity.preferred_start || null,
                    scheduled_date: activity.scheduled_date || null,
                    deadline: activity.deadline || null,
                    checklistCount: activity.checklists?.length || 0,
                })),
                todayTimeline: currentSchedule
                    .filter((block) => block.type === "activity")
                    .slice(0, 20)
                    .map((block) => ({
                        task: activities.find((activity) => activity.id === block.activity_id)?.name || "Task",
                        start: block.planned_start,
                        end: block.planned_end,
                        energy: block.energy_zone,
                    })),
                fixedBlocks: fixedBlocks.slice(0, 12).map((block) => ({
                    title: block.title,
                    start: block.start_time,
                    end: block.end_time,
                })),
                energySlots,
            };

            const data = await fetchChroniqAiJson<{ reply?: string }>('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].filter(m => m.id !== "sys-welcome"),
                    context
                })
            }, 18_000);

            const aiReplyText = data.reply || "";
            if (!aiReplyText.trim()) throw new Error("Chroniq AI belum mengirim respons yang bisa dibaca.");

            // Check if there's an action block (Markdown JSON parse)
            const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
            let match;
            let actionParsed = false;

            while ((match = jsonBlockRegex.exec(aiReplyText)) !== null) {
                try {
                    const actionData = JSON.parse(match[1]);

                    if (actionData.action === "ADD_TASK") {
                        const payload = actionData.payload || {};
                        addActivity({
                            id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                            user_id: user?.id || "user",
                            name: payload.name || "Tugas Baru",
                            target_duration: clampDuration(payload.duration),
                            priority: clampPriority(payload.priority),
                            category: normalizeCategory(payload.category),
                            recurrence: normalizeRecurrence(payload.recurrence),
                            ...(isTimeString(payload.preferred_start) && { preferred_start: payload.preferred_start }),
                            ...(isDateString(payload.scheduled_date) && { scheduled_date: payload.scheduled_date }),
                            ...(isDateString(payload.deadline) && { deadline: payload.deadline })
                        });
                        handleReoptimize();
                        actionParsed = true;
                    }
                    else if (actionData.action === "ADD_TASKS") {
                        const tasks = Array.isArray(actionData.payload?.tasks) ? actionData.payload.tasks : [];
                        const validTasks = tasks
                            .filter((task: { name?: unknown }) => typeof task.name === "string" && task.name.trim())
                            .slice(0, 60);

                        validTasks.forEach((task: {
                            name: string;
                            duration?: unknown;
                            priority?: unknown;
                            category?: string;
                            recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays';
                            preferred_start?: string;
                            scheduled_date?: string;
                            deadline?: string;
                        }, index: number) => {
                            addActivity({
                                id: `act-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
                                user_id: user?.id || "user",
                                name: task.name,
                                target_duration: clampDuration(task.duration),
                                priority: clampPriority(task.priority),
                                category: normalizeCategory(task.category || "Belajar/Membaca"),
                                recurrence: normalizeRecurrence(task.recurrence),
                                date_added: new Date().toISOString().split('T')[0],
                                ...(isTimeString(task.preferred_start) && { preferred_start: task.preferred_start }),
                                ...(isDateString(task.scheduled_date) && { scheduled_date: task.scheduled_date }),
                                ...(isDateString(task.deadline) && { deadline: task.deadline })
                            });
                        });

                        if (validTasks.length > 0) {
                            handleReoptimize();
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "SET_DEADLINE") {
                        const payload = actionData.payload || {};
                        const currentActivities = usePoeStore.getState().activities;
                        const targetName = typeof payload.name === "string" ? payload.name.toLowerCase() : "";
                        const target = targetName ? currentActivities.find(a => a.name.toLowerCase().includes(targetName)) : null;
                        if (target && payload.deadline) {
                            updateActivity(target.id, { deadline: payload.deadline });
                            handleReoptimize();
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "UPDATE_TASK" || actionData.action === "RESCHEDULE_TASK") {
                        const payload = actionData.payload || {};
                        const currentActivities = usePoeStore.getState().activities;
                        const targetName = typeof payload.name === "string" ? payload.name.toLowerCase() : "";
                        const target = targetName ? currentActivities.find(a => a.name.toLowerCase().includes(targetName)) : null;

                        if (target) {
                            const updates: {
                                name?: string;
                                target_duration?: number;
                                priority?: 1 | 2 | 3 | 4 | 5;
                                category?: string;
                                recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays';
                                preferred_start?: string;
                                scheduled_date?: string;
                                deadline?: string;
                            } = {};

                            if (typeof payload.new_name === "string" && payload.new_name.trim()) updates.name = payload.new_name.trim();
                            if (payload.duration !== undefined) updates.target_duration = clampDuration(payload.duration);
                            if (payload.priority !== undefined) updates.priority = clampPriority(payload.priority);
                            if (payload.category !== undefined) updates.category = normalizeCategory(payload.category);
                            if (payload.recurrence !== undefined) updates.recurrence = normalizeRecurrence(payload.recurrence);
                            if (isTimeString(payload.preferred_start)) updates.preferred_start = payload.preferred_start;
                            if (isDateString(payload.scheduled_date)) updates.scheduled_date = payload.scheduled_date;
                            if (isDateString(payload.deadline)) updates.deadline = payload.deadline;

                            if (Object.keys(updates).length > 0) {
                                updateActivity(target.id, updates);
                                handleReoptimize();
                                actionParsed = true;
                            }
                        }
                    }
                    else if (actionData.action === "ADD_CHECKLIST") {
                        const payload = actionData.payload || {};
                        const currentActivities = usePoeStore.getState().activities;
                        const targetName = typeof payload.name === "string" ? payload.name.toLowerCase() : "";
                        const target = targetName ? currentActivities.find(a => a.name.toLowerCase().includes(targetName)) : null;
                        const items = Array.isArray(payload.items) ? payload.items : [];

                        if (target && items.length > 0) {
                            items
                                .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
                                .slice(0, 12)
                                .forEach((item: string) => addChecklist(target.id, item.trim()));
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "SET_ENERGY_SLOTS") {
                        const slots = Array.isArray(actionData.payload?.slots) ? actionData.payload.slots : [];
                        const validSlots = slots
                            .filter((slot: { energy_level?: unknown; start_time?: unknown; end_time?: unknown }) =>
                                (slot.energy_level === "peak" || slot.energy_level === "medium" || slot.energy_level === "low") &&
                                isTimeString(slot.start_time) &&
                                isTimeString(slot.end_time)
                            )
                            .slice(0, 3)
                            .map((slot: { energy_level: "peak" | "medium" | "low"; start_time: string; end_time: string }, index: number) => ({
                                id: `coach-energy-${index + 1}`,
                                user_id: user?.id || "user",
                                start_time: slot.start_time,
                                end_time: slot.end_time,
                                energy_level: slot.energy_level,
                            }));

                        if (validSlots.length === 3) {
                            setEnergySlots(validSlots);
                            handleReoptimize();
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "DELETE_TASK") {
                        const payload = actionData.payload || {};
                        const currentActivities = usePoeStore.getState().activities;
                        const targetName = typeof payload.name === "string" ? payload.name.toLowerCase() : "";
                        const target = targetName ? currentActivities.find(a => a.name.toLowerCase().includes(targetName)) : null;
                        if (target) {
                            removeActivity(target.id);
                            handleReoptimize();
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "REOPTIMIZE") {
                        handleReoptimize();
                        actionParsed = true;
                    }
                } catch (error) {
                    console.error("Failed to parse action JSON from bot:", error);
                }
            }

            const cleanReply = aiReplyText.replace(jsonBlockRegex, "").trim() || "Siap, aku sudah jalankan instruksinya di Chroniq.";

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: cleanReply + (actionParsed ? "\n\n📍 *(Tindakan sudah otomatis dieksekusi)*" : "")
            };
            setMessages(prev => [...prev, aiMsg]);
            addChatMessage(aiMsg); // Persist to store

        } catch (error: unknown) {
            console.error("Chat error", error);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: error instanceof Error ? error.message : "Chroniq AI sedang sulit merespons. Coba kirim ulang sebentar lagi."
            };
            setMessages(prev => [...prev, aiMsg]);
            addChatMessage(aiMsg);
        } finally {
            setIsThinking(false);
            setCooldown(5);
        }
    };

    const handlePromptPick = (prompt: string) => {
        setInput(prompt);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleNewChat = () => {
        clearChatHistory();
        setMessages([buildWelcomeMessage()]);
        setInput("");
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const recentUserPrompts = messages
        .filter((msg) => msg.role === "user")
        .slice(-3)
        .reverse();

    if (!isClient || !user) return <div className="min-h-screen flex items-center justify-center text-[#a1887f] dark:text-[#a19d9b] font-medium animate-pulse transition-colors">Memuat Chroniq AI...</div>;

    return (
        <div className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-5xl flex-col px-3 pb-4 pt-2 sm:px-6 md:h-[86vh]">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/55 px-4 py-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/55 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
                <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#4f46e5] via-[#ff8a65] to-[#34d399] text-white shadow-inner">
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <Brain className="z-10 h-8 w-8 drop-shadow-md" />
                    </div>
                    <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#1f2937] dark:text-[#e5edf8] sm:text-3xl">Chroniq AI Coach</h1>
                            <span className="rounded-full border border-[#c7d2fe]/70 bg-[#eef2ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#4f46e5] dark:border-[#818cf8]/30 dark:bg-[#312e81]/35 dark:text-[#c7d2fe]">
                                Context aware
                            </span>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] sm:text-sm">
                            <Sparkles className="h-3.5 w-3.5 text-[#ff8a65]" /> Mengelola task, jadwal, checklist, dan plan belajar dari satu chat.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                    <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-center dark:border-white/10 dark:bg-[#1e1e24]/60">
                        <div className="text-sm font-black text-[#1f2937] dark:text-[#e5edf8]">{activities.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8]">Tasks</div>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-center dark:border-white/10 dark:bg-[#1e1e24]/60">
                        <div className="text-sm font-black text-[#1f2937] dark:text-[#e5edf8]">{currentSchedule.filter(b => b.type === "activity").length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8]">Today</div>
                    </div>
                    <Button
                        type="button"
                        onClick={handleNewChat}
                        variant="outline"
                        className="h-full min-h-12 rounded-2xl border-[#c7d2fe] bg-white/70 px-3 text-xs font-bold text-[#4f46e5] hover:bg-[#eef2ff] dark:border-[#818cf8]/30 dark:bg-[#1e1b4b]/25 dark:text-[#c7d2fe] dark:hover:bg-[#312e81]/35"
                    >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Chat baru
                    </Button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/62 shadow-xl shadow-[#c7d2fe]/20 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#0f172a]/72 dark:shadow-black/25"
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#ff8a65] to-[#34d399]" />

                <div className="relative z-10 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                    {messages.length <= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-auto max-w-3xl"
                        >
                            <div className="mb-5 rounded-3xl border border-[#c7d2fe]/60 bg-[#f8fafc]/80 p-5 shadow-sm dark:border-[#818cf8]/20 dark:bg-[#111827]/70 sm:p-6">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#ff8a65] text-white">
                                        <PanelTop className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-[#1f2937] dark:text-[#e5edf8]">Mau aku bantu susun apa?</h2>
                                        <p className="text-sm font-medium text-[#64748b] dark:text-[#94a3b8]">Pilih prompt cepat atau ketik bebas. Aku bisa langsung mengeksekusi perubahan di Chroniq.</p>
                                    </div>
                                </div>
                                <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8]">Prompt cepat</div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {suggestionPrompts.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.title}
                                                type="button"
                                                onClick={() => handlePromptPick(item.prompt)}
                                                className="group rounded-2xl border border-[#e2e8f0] bg-white/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#c7d2fe] hover:bg-[#eef2ff]/70 hover:shadow-sm dark:border-white/10 dark:bg-[#1e1e24]/50 dark:hover:border-[#818cf8]/40 dark:hover:bg-[#312e81]/25"
                                            >
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-[#4f46e5] dark:text-[#c7d2fe]" />
                                                    <span className="text-sm font-black text-[#334155] dark:text-[#e5edf8]">{item.title}</span>
                                                </div>
                                                <p className="line-clamp-2 text-xs font-medium leading-relaxed text-[#64748b] dark:text-[#94a3b8]">{item.prompt}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map(msg => (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`relative max-w-[92%] rounded-3xl px-4 py-3 text-[14px] leading-relaxed transition-colors sm:max-w-[78%] sm:px-5 sm:py-3.5 sm:text-[15px] ${msg.role === "user" ? "rounded-tr-lg bg-[#1f2937] text-white shadow-md dark:bg-[#e5edf8] dark:text-[#0f172a]" : "rounded-tl-lg border border-[#e2e8f0] bg-white/86 text-[#334155] shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#1e293b]/82 dark:text-[#dbeafe]"}`}>
                                    {msg.role === 'model' && (
                                        <div className="absolute -left-2 -top-2 rounded-full border border-white bg-gradient-to-br from-[#4f46e5] to-[#ff8a65] p-1 shadow-sm dark:border-[#1e293b]">
                                            <Brain className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </motion.div>
                        ))}

                        {isThinking && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                            >
                                <div className="flex items-center gap-3 rounded-3xl rounded-tl-lg border border-[#c7d2fe]/50 bg-white/85 px-5 py-3.5 text-[#4f46e5] shadow-sm backdrop-blur-sm transition-colors dark:border-[#818cf8]/20 dark:bg-[#1e293b]/80 dark:text-[#c7d2fe]">
                                    <ChroniqAiLoader
                                        size="sm"
                                        label="Chroniq AI sedang menyusun taktik"
                                        sublabel="Membaca konteks jadwal dan ritmemu."
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                <div className="relative z-10 shrink-0 border-t border-[#e2e8f0]/80 bg-white/88 p-3 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#0f172a]/90 sm:p-4">
                    {recentUserPrompts.length > 0 && (
                        <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 overflow-x-auto pb-1">
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8]">Riwayat aktif</span>
                            {recentUserPrompts.map((item) => (
                                <button
                                    key={`history-${item.id}`}
                                    type="button"
                                    onClick={() => handlePromptPick(item.content)}
                                    className="max-w-[15rem] shrink-0 truncate rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#475569] transition-colors hover:border-[#c7d2fe] hover:bg-[#eef2ff] dark:border-white/10 dark:bg-[#1e293b]/60 dark:text-[#cbd5e1] dark:hover:border-[#818cf8]/35 dark:hover:bg-[#312e81]/25"
                                >
                                    {item.content}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="mx-auto mb-2 flex max-w-3xl gap-2 overflow-x-auto pb-1">
                        {suggestionPrompts.slice(0, 3).map((item) => (
                            <button
                                key={`mini-${item.title}`}
                                type="button"
                                onClick={() => handlePromptPick(item.prompt)}
                                className="shrink-0 rounded-full border border-[#e2e8f0] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#475569] transition-colors hover:border-[#c7d2fe] hover:bg-[#eef2ff] dark:border-white/10 dark:bg-[#1e293b]/60 dark:text-[#cbd5e1] dark:hover:border-[#818cf8]/35 dark:hover:bg-[#312e81]/25"
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[#cbd5e1] bg-[#f8fafc] p-2 shadow-inner transition-all focus-within:border-[#818cf8] focus-within:ring-4 focus-within:ring-[#c7d2fe]/35 dark:border-white/10 dark:bg-[#111827] dark:focus-within:border-[#818cf8]/60 dark:focus-within:ring-[#818cf8]/20 sm:gap-3">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleComposerKeyDown}
                            placeholder="Tanyakan apa saja: susun plan, ubah jadwal, tambah checklist, atau minta re-optimize..."
                            rows={1}
                            className="max-h-28 min-h-11 flex-1 resize-none border-none bg-transparent px-3 py-3 text-[14px] font-medium text-[#1f2937] outline-none placeholder:text-[#94a3b8] dark:text-[#e5edf8] dark:placeholder:text-[#64748b] sm:text-[15px]"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isThinking || cooldown > 0}
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:opacity-50 sm:h-12 sm:w-12 ${cooldown > 0 ? 'bg-[#e2e8f0] text-[#94a3b8] dark:bg-[#1e293b] dark:text-[#64748b]' : 'bg-gradient-to-tr from-[#4f46e5] to-[#ff8a65] hover:shadow-lg hover:shadow-[#818cf8]/25'}`}
                        >
                            {cooldown > 0 ? (
                                <span className="text-sm font-bold">{cooldown}s</span>
                            ) : isThinking ? (
                                <ChroniqAiLoader size="sm" compact />
                            ) : (
                                <Send className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                            )}
                        </Button>
                    </form>
                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-[#64748b] transition-colors dark:text-[#94a3b8] sm:text-xs">
                        <Code className="hidden h-3.5 w-3.5 text-[#818cf8] sm:block" /> Enter untuk kirim, Shift+Enter untuk baris baru. Chroniq AI dapat mengeksekusi perubahan jadwal.
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
