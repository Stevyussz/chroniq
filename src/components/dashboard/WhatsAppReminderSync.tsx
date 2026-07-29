"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle, RefreshCcw, Send, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePoeStore } from "@/store/useStore";

type BridgeStatus = {
    ok?: boolean;
    configured?: boolean;
    state?: string;
    hasQr?: boolean;
    error?: string;
};

type BridgeResponse = {
    ok?: boolean;
    syncedAt?: string;
    sentAt?: string;
    error?: string;
};

const leadOptions = [5, 10, 15, 30, 60];

export function WhatsAppReminderSync() {
    const {
        user,
        currentSchedule,
        activities,
        whatsappReminderEnabled,
        whatsappPhone,
        whatsappReminderLeadMinutes,
        whatsappLastSyncAt,
        whatsappLastSyncError,
        setWhatsAppReminderSettings,
        setWhatsAppSyncStatus,
    } = usePoeStore();

    const [phone, setPhone] = useState(whatsappPhone);
    const [enabled, setEnabled] = useState(whatsappReminderEnabled);
    const [leadMinutes, setLeadMinutes] = useState(whatsappReminderLeadMinutes);
    const [status, setStatus] = useState<BridgeStatus | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [feedback, setFeedback] = useState("");

    useEffect(() => {
        setPhone(whatsappPhone);
        setEnabled(whatsappReminderEnabled);
        setLeadMinutes(whatsappReminderLeadMinutes);
    }, [whatsappPhone, whatsappReminderEnabled, whatsappReminderLeadMinutes]);

    const checkStatus = async () => {
        setIsChecking(true);
        setFeedback("");
        try {
            const response = await fetch("/api/wa/reminder", { cache: "no-store" });
            const data = await response.json() as BridgeStatus;
            setStatus(data);
            if (!response.ok || !data.ok) throw new Error(data.error || "Bridge belum siap.");
        } catch (error) {
            setStatus({ ok: false, error: error instanceof Error ? error.message : "Bridge belum siap." });
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const syncSchedule = async () => {
        if (!user) return;
        setIsSyncing(true);
        setFeedback("");

        const nextPhone = phone.trim();
        setWhatsAppReminderSettings({ enabled, phone: nextPhone, leadMinutes });

        try {
            const response = await fetch("/api/wa/reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sync",
                    payload: {
                        user,
                        phone: nextPhone,
                        enabled,
                        leadMinutes,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
                        schedule: currentSchedule,
                        activities,
                    },
                }),
            });
            const data = await response.json() as BridgeResponse;
            if (!response.ok || !data.ok) throw new Error(data.error || "Gagal sync ke WhatsApp bridge.");

            setWhatsAppSyncStatus({ syncedAt: data.syncedAt || new Date().toISOString(), error: null });
            setFeedback(enabled ? "Reminder WhatsApp aktif dan jadwal sudah tersinkron." : "Reminder WhatsApp dimatikan di bridge.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Gagal sync ke WhatsApp bridge.";
            setWhatsAppSyncStatus({ error: message });
            setFeedback(message);
        } finally {
            setIsSyncing(false);
        }
    };

    const sendTest = async () => {
        setIsTesting(true);
        setFeedback("");
        try {
            const response = await fetch("/api/wa/reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "test", phone: phone.trim() }),
            });
            const data = await response.json() as BridgeResponse;
            if (!response.ok || !data.ok) throw new Error(data.error || "Gagal kirim test WhatsApp.");
            setFeedback("Pesan test sudah dikirim ke WhatsApp.");
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Gagal kirim test WhatsApp.");
        } finally {
            setIsTesting(false);
        }
    };

    const isConnected = status?.state === "connected";
    const isConfigured = status?.configured !== false;
    const canUse = Boolean(phone.trim()) && isConfigured;

    return (
        <div className="space-y-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]/80 p-4 dark:border-[#22c55e]/25 dark:bg-[#052e16]/20">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#16a34a] dark:bg-[#14532d]/45 dark:text-[#86efac]">
                    <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-[#166534] dark:text-[#bbf7d0]">WhatsApp Reminder</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            isConnected
                                ? "bg-[#dcfce7] text-[#15803d] dark:bg-[#14532d]/60 dark:text-[#86efac]"
                                : "bg-[#fee2e2] text-[#b91c1c] dark:bg-[#7f1d1d]/35 dark:text-[#fecaca]"
                        }`}>
                            {isConnected ? "Connected" : status?.state || "Offline"}
                        </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#166534]/75 dark:text-[#bbf7d0]/75">
                        Kirim pengingat jadwal otomatis dari nomor Chroniq AI ke WhatsApp user.
                    </p>
                </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#bbf7d0]/70 bg-white/65 px-3 py-2 dark:border-[#22c55e]/20 dark:bg-[#0f172a]/35">
                <span className="text-sm font-bold text-[#14532d] dark:text-[#dcfce7]">Aktifkan reminder WA</span>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="h-5 w-5 accent-[#22c55e]"
                />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#166534]/75 dark:text-[#bbf7d0]/75">
                        Nomor WhatsApp user
                    </label>
                    <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="h-11 w-full rounded-xl border border-[#bbf7d0] bg-white/80 px-3 text-sm font-semibold text-[#14532d] outline-none focus:border-[#22c55e] focus:ring-4 focus:ring-[#bbf7d0]/45 dark:border-[#22c55e]/25 dark:bg-[#0f172a]/45 dark:text-[#dcfce7]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#166534]/75 dark:text-[#bbf7d0]/75">
                        Ingatkan
                    </label>
                    <select
                        value={leadMinutes}
                        onChange={(event) => setLeadMinutes(Number(event.target.value))}
                        className="h-11 rounded-xl border border-[#bbf7d0] bg-white/80 px-3 text-sm font-bold text-[#14532d] outline-none focus:border-[#22c55e] dark:border-[#22c55e]/25 dark:bg-[#0f172a]/45 dark:text-[#dcfce7]"
                    >
                        {leadOptions.map((option) => (
                            <option key={option} value={option}>{option} menit</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={checkStatus}
                    disabled={isChecking}
                    className="rounded-xl border-[#86efac] bg-white/70 text-xs font-bold text-[#15803d] hover:bg-[#dcfce7] dark:border-[#22c55e]/30 dark:bg-[#0f172a]/35 dark:text-[#bbf7d0]"
                >
                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Status
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={syncSchedule}
                    disabled={!canUse || isSyncing}
                    className="rounded-xl border-[#86efac] bg-white/70 text-xs font-bold text-[#15803d] hover:bg-[#dcfce7] dark:border-[#22c55e]/30 dark:bg-[#0f172a]/35 dark:text-[#bbf7d0]"
                >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Sync
                </Button>
                <Button
                    type="button"
                    onClick={sendTest}
                    disabled={!canUse || isTesting}
                    className="rounded-xl bg-[#22c55e] text-xs font-bold text-white hover:bg-[#16a34a]"
                >
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Test
                </Button>
            </div>

            {!isConfigured && (
                <div className="flex gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-semibold leading-relaxed text-[#991b1b] dark:border-[#ef4444]/30 dark:bg-[#7f1d1d]/20 dark:text-[#fecaca]">
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                    Env `CHRONIQ_WA_BRIDGE_URL` dan `CHRONIQ_WA_BRIDGE_API_KEY` belum diset di Chroniq.
                </div>
            )}

            {(feedback || whatsappLastSyncError || whatsappLastSyncAt) && (
                <p className="text-xs font-semibold leading-relaxed text-[#166534]/80 dark:text-[#bbf7d0]/80">
                    {feedback || whatsappLastSyncError || (whatsappLastSyncAt ? `Terakhir sync: ${new Date(whatsappLastSyncAt).toLocaleString("id-ID")}` : "")}
                </p>
            )}
        </div>
    );
}
