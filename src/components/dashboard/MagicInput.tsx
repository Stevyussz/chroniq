"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";
import { type Activity } from "@/types";

interface MagicInputProps {
    onActivitiesParsed: (activities: Activity[]) => void;
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
}

export function MagicInput({ onActivitiesParsed, isProcessing, setIsProcessing }: MagicInputProps) {
    const [text, setText] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isProcessing) return;

        setIsProcessing(true);
        try {
            const response = await fetch('/api/ai/parse-nl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            });

            if (!response.ok) throw new Error("Gagal terhubung ke AI");

            const data = await response.json();
            if (data.activities && Array.isArray(data.activities)) {
                // Map the returned data into our standard Activity format
                const newActivities: Activity[] = data.activities.map((a: { name: string; target_duration?: number; priority?: number; category?: string }) => ({
                    id: crypto.randomUUID(),
                    user_id: "u1",
                    name: a.name,
                    target_duration: a.target_duration || 30, // Fallback if AI gets confused
                    priority: a.priority || 3,               // Fallback
                    category: a.category || "Ad-Hoc (Dadakan)"
                }));

                onActivitiesParsed(newActivities);
                setText(""); // Clear input on success
            }
        } catch (error) {
            console.error("AI NLP Error:", error);
            alert("Maaf, AI sedang sibuk atau koneksi terputus. Coba lagi.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <div className={`relative flex items-center w-full transition-all duration-300 rounded-2xl ${isProcessing ? 'ring-4 ring-[#ffccbc] shadow-lg shadow-[#ffccbc]/50 bg-[#fff3e0]/60 backdrop-blur-md' : 'ring-1 ring-white/50 bg-white/50 backdrop-blur-md hover:bg-white/60 hover:shadow-md'
                }`}>

                <div className="pl-4 pr-2 text-[#ff8a65]">
                    {isProcessing ? (
                        <Sparkles className="w-5 h-5 animate-pulse" />
                    ) : (
                        <Sparkles className="w-5 h-5 opacity-60" />
                    )}
                </div>

                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isProcessing ? "Menyusun jadwal dari pikiran Anda..." : "Ngetik di sini aja... (Contoh: Bales email Pak Bos nanti sore prioritas tinggi)"}
                    disabled={isProcessing}
                    className={`flex-1 border-none shadow-none text-base focus-visible:ring-0 placeholder:text-stone-400 pl-0 bg-transparent ${isProcessing ? 'text-[#e64a19] animate-pulse placeholder:text-[#ffab91]' : 'text-stone-700'}`}
                    autoComplete="off"
                />

                <Button
                    type="submit"
                    disabled={isProcessing || !text.trim()}
                    variant="ghost"
                    className={`rounded-r-2xl pr-4 pl-2 h-12 transition-colors ${text.trim() && !isProcessing ? 'text-[#e64a19] hover:bg-[#ffebee] hover:text-[#d84315]' : 'text-stone-300'
                        }`}
                >
                    <Send className="w-5 h-5" />
                </Button>
            </div>

            <span className="absolute -bottom-6 left-2 text-[11px] text-stone-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-[#ff8a65]" /> Natural Language Powered
            </span>
        </form>
    );
}
