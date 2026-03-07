"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePoeStore } from "@/store/useStore";
import { useScheduleManager } from "@/hooks/useScheduleManager";

interface ChatMessage {
    id: string;
    role: "user" | "model";
    content: string;
}

export function ChroniqChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: "sys-welcome",
        role: "model",
        content: "Halo! Aku Chroniq AI Coach. Ada yang bisa kubantu soal jadwal, produktivitas, atau caramu menjaga ritme hari ini?"
    }]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { level, exp, activities, currentSchedule, addActivity } = usePoeStore();
    const { handleReoptimize } = useScheduleManager();

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
            // Lightweight context injection to save tokens!
            const context = {
                level,
                exp,
                upcomingTasksCount: currentSchedule.filter(b => b.type === 'activity').length,
                pendingActivitiesCount: activities.length,
            };

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context
                })
            });

            if (!response.ok) throw new Error("Gagal ngobrol dengan AI");

            const data = await response.json();
            let aiReplyText = data.reply || "";

            // Check if there's an action block (Markdown JSON parse)
            const jsonBlockRegex = /\`\`\`json\n([\s\S]*?)\n\`\`\`/g;
            let match;
            let actionParsed = false;

            while ((match = jsonBlockRegex.exec(aiReplyText)) !== null) {
                try {
                    const actionData = JSON.parse(match[1]);

                    if (actionData.action === "ADD_TASK") {
                        const payload = actionData.payload;
                        addActivity({
                            id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                            user_id: "user",
                            name: payload.name,
                            target_duration: payload.duration,
                            priority: payload.priority,
                            category: payload.category
                        });
                        handleReoptimize(); // Auto optimize
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

            // Clean up the JSON block from the text before showing to user
            const cleanReply = aiReplyText.replace(jsonBlockRegex, "").trim();

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: cleanReply + (actionParsed ? "\n\n📍 *(Tindakan sudah otomatis dieksekusi)*" : "")
            }]);

        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "model",
                content: "Waduh, koneksi ke otak Chroniq AI lagi terputus nih. Coba sapa lagi ya!"
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <>
            {/* FAB Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-tr from-[#e64a19] to-[#ff8a65] hover:shadow-xl hover:scale-105 transition-all duration-300 z-50 flex items-center justify-center border-2 border-white/50"
                >
                    <MessageSquare className="w-6 h-6 text-white" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-[90vw] max-w-[360px] h-[550px] max-h-[80vh] bg-[#fffcfb] rounded-[2rem] shadow-2xl border border-[#ffccbc]/50 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* Header */}
                    <div className="px-5 py-4 bg-gradient-to-r from-[#ffab91] to-[#ffccbc] flex items-center justify-between text-white relative">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        <div className="flex items-center gap-2 relative z-10">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm tracking-wide">Chroniq Coach</h3>
                                <p className="text-[10px] font-medium text-white/80">AI Produktivitas Pribadi</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="hover:bg-white/20 rounded-full text-white relative z-10" onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed ${msg.role === "user" ? "bg-gradient-to-br from-[#8d6e63] to-[#795548] text-white rounded-tr-sm shadow-sm" : "bg-white border border-[#efebe9] text-[#5d4037] rounded-tl-sm shadow-sm"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="px-4 py-3 bg-white border border-[#efebe9] text-[#ff8a65] rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-medium">Berpikir...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    < div className="p-4 bg-white border-t border-[#efebe9]" >
                        <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#fdfbf7] p-1.5 rounded-full border border-[#efebe9] focus-within:border-[#ffab91] transition-colors shadow-inner">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Tanya atau suruh sesuatu..."
                                className="flex-1 bg-transparent border-none text-[13px] focus:outline-none px-3 text-[#5d4037] placeholder:text-[#a1887f]"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isThinking}
                                className="w-8 h-8 rounded-full bg-[#ffab91] hover:bg-[#ff8a65] text-white shrink-0 disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </Button>
                        </form>
                    </div >

                </div >
            )
            }
        </>
    );
}
