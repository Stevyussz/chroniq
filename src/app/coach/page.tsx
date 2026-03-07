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
    const { level, exp, activities, currentSchedule, addActivity, energySlots, fixedBlocks, user } = usePoeStore();
    const { handleReoptimize } = useScheduleManager();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

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
        if (!input.trim() || isThinking) return;

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
                            category: payload.category
                        });
                        handleReoptimize();
                        actionParsed = true;
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
                content: `Waduh, koneksi ke otak Chroniq AI lagi terputus nih. Info Error: ${error?.message || "Unknown"}. Coba sapa lagi ya!`
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!isClient || !user) return <div className="min-h-screen flex items-center justify-center text-[#a1887f] font-medium animate-pulse">Memuat Otak Chroniq...</div>;

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
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#e64a19] to-[#ffa726]">Chroniq AI Coach</h1>
                    <p className="text-[#a1887f] font-medium text-xs sm:text-sm flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Asisten Perencana Super Cerdas
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-[#ffccbc]/20 rounded-3xl flex flex-col overflow-hidden relative"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#ffab91]/10 to-[#ffccbc]/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

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
                                <div className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl max-w-[90%] sm:max-w-[85%] text-[14px] sm:text-[15px] leading-relaxed relative ${msg.role === "user" ? "bg-gradient-to-br from-[#8d6e63] to-[#795548] text-white rounded-tr-md shadow-md" : "bg-white/80 backdrop-blur-sm border border-white text-[#5d4037] rounded-tl-md shadow-sm"}`}>
                                    {msg.role === 'model' && (
                                        <div className="absolute -left-2 -top-2 sm:-left-3 sm:-top-3 bg-gradient-to-br from-[#ffab91] to-[#ffccbc] p-1 rounded-full shadow-sm border border-white">
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
                                <div className="px-5 py-3.5 bg-white/80 backdrop-blur-sm border border-white text-[#ff8a65] rounded-2xl rounded-tl-md shadow-sm flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-semibold tracking-wide">AI sedang menyusun taktik...</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Tray */}
                <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-md border-t border-white/50 relative z-10 shrink-0">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3 bg-[#fdfbf7] p-1.5 sm:p-2 rounded-2xl border-2 border-[#efebe9] focus-within:border-[#ffab91] transition-all shadow-inner">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Contoh: 'Tidurnya diganti jadi jam 10 malam yah'"
                            className="flex-1 bg-transparent border-none text-[14px] sm:text-[15px] font-medium focus:outline-none px-2 sm:px-4 text-[#5d4037] placeholder:text-[#a1887f]/70 h-10 sm:h-12"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isThinking}
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-tr from-[#e64a19] to-[#ff8a65] hover:shadow-lg text-white shrink-0 disabled:opacity-50 transition-all"
                        >
                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </form>
                    <div className="text-center mt-2.5 text-[10px] sm:text-xs text-[#a1887f] font-medium flex justify-center items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 hidden sm:block" /> AI terhubung langsung dengan Engine Optimasi Chroniq.
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
