"use client";

import { useEffect, useMemo } from "react";
import { usePoeStore } from "@/store/useStore";

type SyncResponse = {
    ok?: boolean;
    syncedAt?: string;
    error?: string;
};

const getBrowserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
    } catch {
        return "Asia/Jakarta";
    }
};

export function useWhatsAppReminderSync() {
    const {
        user,
        currentSchedule,
        activities,
        whatsappReminderEnabled,
        whatsappPhone,
        whatsappReminderLeadMinutes,
        setWhatsAppSyncStatus,
    } = usePoeStore();

    const syncKey = useMemo(() => {
        return JSON.stringify({
            enabled: whatsappReminderEnabled,
            phone: whatsappPhone,
            lead: whatsappReminderLeadMinutes,
            schedule: currentSchedule.map((block) => ({
                id: block.id,
                date: block.date,
                activity_id: block.activity_id,
                planned_start: block.planned_start,
                planned_end: block.planned_end,
                type: block.type,
            })),
            activities: activities.map((activity) => ({
                id: activity.id,
                name: activity.name,
                category: activity.category,
                checklists: activity.checklists,
            })),
        });
    }, [activities, currentSchedule, whatsappPhone, whatsappReminderEnabled, whatsappReminderLeadMinutes]);

    useEffect(() => {
        if (!user || !whatsappPhone.trim()) return;

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch("/api/wa/reminder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "sync",
                        payload: {
                            user,
                            phone: whatsappPhone,
                            enabled: whatsappReminderEnabled,
                            leadMinutes: whatsappReminderLeadMinutes,
                            timezone: getBrowserTimezone(),
                            schedule: currentSchedule,
                            activities,
                        },
                    }),
                    signal: controller.signal,
                });

                const data = await response.json() as SyncResponse;
                if (!response.ok || !data.ok) {
                    throw new Error(data.error || "Gagal sync WhatsApp reminder.");
                }

                setWhatsAppSyncStatus({ syncedAt: data.syncedAt || new Date().toISOString(), error: null });
            } catch (error) {
                if (controller.signal.aborted) return;
                setWhatsAppSyncStatus({
                    error: error instanceof Error ? error.message : "Gagal sync WhatsApp reminder.",
                });
            }
        }, 1200);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [
        activities,
        currentSchedule,
        setWhatsAppSyncStatus,
        syncKey,
        user,
        whatsappPhone,
        whatsappReminderEnabled,
        whatsappReminderLeadMinutes,
    ]);
}
