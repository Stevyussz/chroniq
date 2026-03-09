"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Sparkles, Brain, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePoeStore } from "@/store/useStore";
import { useScheduleManager } from "@/hooks/useScheduleManager";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface ChatMessage {
    id: string;
    role: "user" | "model";
    content: string;
}

export default function CoachPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: "sys-welcome",
        role: "model",
        content: "Halo! Aku Chroniq AI Coach. Karena kamu sudah melakukan setup awal, mulai sekarang biarkan aku yang mengatur perubahan jadwal, penyesuaian durasi istirahat, atau menambah tugas baru darimu. Ada yang bisa kubantu hari ini?"
    }]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { level, exp, activities, currentSchedule, addActivity, removeActivity, energySlots, fixedBlocks, user } = usePoeStore();
    const { handleReoptimize } = useScheduleManager();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [cooldown, setCooldown] = useState(0);

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
        setInput("");
        setIsThinking(true);

        try {
            // Include enough context so the bot can accurately modify routines and tasks
            const context = {
                userProfile: user?.name || "User",
                level,
                exp,
                upcomingTasksCount: currentSchedule.filter(b => b.type === 'activity').length,
                pendingActivitiesCount: activities.length,
                energyZones: energySlots.map(e => `${e.energy_level} (${e.start_time}-${e.end_time})`).join(", "),
                fixedEvents: fixedBlocks.length
            };

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].filter(m => m.id !== "sys-welcome"),
                    context
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal ngobrol dengan AI");
            }

            const data = await response.json();
            let aiReplyText = data.reply || "";

            // Check if there's an action block (Markdown JSON parse)
            const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
            let match;
            let actionParsed = false;

            while ((match = jsonBlockRegex.exec(aiReplyText)) !== null) {
                try {
                    const actionData = JSON.parse(match[1]);

                    if (actionData.action === "ADD_TASK") {
                        const payload = actionData.payload;
                        addActivity({
                            id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                            user_id: user?.id || "user",
                            name: payload.name,
                            target_duration: payload.duration,
                            priority: payload.priority,
                            category: payload.category,
                            ...(payload.preferred_start && { preferred_start: payload.preferred_start })
                        });
                        actionParsed = true;
                    }
                    else if (actionData.action === "DELETE_TASK") {
                        const payload = actionData.payload;
                        const currentActivities = usePoeStore.getState().activities;
                        const target = currentActivities.find(a => a.name.toLowerCase().includes(payload.name.toLowerCase()));
                        if (target) {
                            removeActivity(target.id);
                            actionParsed = true;
                        }
                    }
                    else if (actionData.action === "REOPTIMIZE") {
                        handleReoptimize();
                        actionParsed = true;
                    }
                } catch (e) {
                    console.error("Failed to parse action JSON from bot:", e);
                }
            }

            const cleanReply = aiReplyText.replace(jsonBlockRegex, "").trim();

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: cleanReply + (actionParsed ? "\n\n📍 *(Tindakan sudah otomatis dieksekusi)*" : "")
            }]);

        } catch (error: any) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: "Waduh, koneksi ke otak Chroniq AI lagi terputus nih. Coba sapa lagi ya nanti!"
            }]);
        } finally {
            setIsThinking(false);
            setCooldown(5);
        }
    };

    if (!isClient || !user) return <div className="min-h-screen flex items-center justify-center text-[#a1887f] dark:text-[#a19d9b] font-medium animate-pulse transition-colors">Memuat Otak Chroniq...</div>;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] md:h-[85vh] flex flex-col pt-2 pb-6 px-3 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-6 px-4"
            >
                <div className="w-14 h-14 bg-gradient-to-br from-[#ffab91] to-[#ffccbc] text-white rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 blur-md rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <Brain className="w-8 h-8 drop-shadow-md z-10" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#e64a19] dark:from-[#ff8a65] to-[#ffa726] dark:to-[#ffb74d] transition-colors">Chroniq AI Coach</h1>
                    <p className="text-[#a1887f] dark:text-[#a19d9b] font-medium text-xs sm:text-sm flex items-center gap-1 transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff8a65] dark:text-[#ffab91]" /> Asisten Perencana Super Cerdas
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 bg-white/60 dark:bg-[#1e1e24]/60 backdrop-blur-xl border border-white dark:border-white/5 shadow-xl shadow-[#ffccbc]/20 dark:shadow-black/20 rounded-3xl flex flex-col overflow-hidden relative transition-colors"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#ffab91]/10 dark:from-[#ff8a65]/5 to-[#ffccbc]/10 dark:to-[#ffccbc]/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none transition-colors" />

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                    <AnimatePresence initial={false}>
                        {messages.map(msg => (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl max-w-[90%] sm:max-w-[85%] text-[14px] sm:text-[15px] leading-relaxed relative transition-colors ${msg.role === "user" ? "bg-gradient-to-br from-[#8d6e63] dark:from-[#5d4037] to-[#795548] dark:to-[#4e342e] text-white rounded-tr-md shadow-md" : "bg-white/80 dark:bg-[#2d2d35]/80 backdrop-blur-sm border border-white dark:border-white/5 text-[#5d4037] dark:text-[#e4d8cd] rounded-tl-md shadow-sm"}`}>
                                    {msg.role === 'model' && (
                                        <div className="absolute -left-2 -top-2 sm:-left-3 sm:-top-3 bg-gradient-to-br from-[#ffab91] dark:from-[#ff8a65] to-[#ffccbc] dark:to-[#ffccbc] p-1 rounded-full shadow-sm border border-white dark:border-[#2d2d35]">
                                            <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
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
                                <div className="px-5 py-3.5 bg-white/80 dark:bg-[#2d2d35]/80 backdrop-blur-sm border border-white dark:border-white/5 text-[#ff8a65] dark:text-[#ffab91] rounded-2xl rounded-tl-md shadow-sm flex items-center gap-3 transition-colors">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-semibold tracking-wide">AI sedang menyusun taktik...</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Tray */}
                <div className="p-3 sm:p-4 bg-white/80 dark:bg-[#1e1e24]/80 backdrop-blur-md border-t border-white/50 dark:border-white/5 relative z-10 shrink-0 transition-colors">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3 bg-[#fdfbf7] dark:bg-[#2d2d35] p-1.5 sm:p-2 rounded-2xl border-2 border-[#efebe9] dark:border-white/5 focus-within:border-[#ffab91] dark:focus-within:border-[#ff8a65]/50 transition-all shadow-inner">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Contoh: 'Tidurnya diganti jadi jam 10 malam yah'"
                            className="flex-1 bg-transparent border-none text-[14px] sm:text-[15px] font-medium focus:outline-none px-2 sm:px-4 text-[#5d4037] dark:text-[#e4d8cd] placeholder:text-[#a1887f]/70 dark:placeholder:text-[#a19d9b]/60 h-10 sm:h-12 transition-colors"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isThinking || cooldown > 0}
                            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-white shrink-0 disabled:opacity-50 transition-all flex items-center justify-center ${cooldown > 0 ? 'bg-[#efebe9] dark:bg-[#25352c] text-[#d7ccc8] dark:text-[#a19d9b]' : 'bg-gradient-to-tr from-[#e64a19] dark:from-[#ff8a65] to-[#ff8a65] dark:to-[#ffccbc] hover:shadow-lg'}`}
                        >
                            {cooldown > 0 ? (
                                <span className="text-sm font-bold text-[#a1887f] dark:text-[#a19d9b]">{cooldown}s</span>
                            ) : isThinking ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            )}
                        </Button>
                    </form>
                    <div className="text-center mt-2.5 text-[10px] sm:text-xs text-[#a1887f] dark:text-[#a19d9b] font-medium flex justify-center items-center gap-1.5 transition-colors">
                        <Code className="w-3.5 h-3.5 hidden sm:block text-[#ff8a65] dark:text-[#ffab91]" /> AI terhubung langsung dengan Engine Optimasi Chroniq.
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
