"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePoeStore } from "@/store/useStore";
import { ScheduleBlock } from "@/types";

type SyncResponse = {
    ok?: boolean;
    syncedAt?: string;
    error?: string;
};

type WhatsAppCommand = {
    id: string;
    userId: string;
    text: string;
    intent: "done" | "skip" | "snooze" | "share_plan" | "reflection" | "chat";
    context?: {
        blockId?: string;
        activityId?: string;
        plannedStart?: string;
        plannedEnd?: string;
        taskName?: string;
    } | null;
    createdAt: string;
};

type CommandsResponse = {
    ok?: boolean;
    commands?: WhatsAppCommand[];
    error?: string;
};

const getBrowserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
    } catch {
        return "Asia/Jakarta";
    }
};

const timeToMinutes = (time?: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

const minutesToTime = (minutes: number) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const parseSnoozeMinutes = (text: string) => {
    const match = /(\d{1,3})/.exec(text);
    if (!match) return 15;
    return Math.min(120, Math.max(5, Number(match[1])));
};

const PROCESSED_COMMANDS_KEY = "chroniq-wa-processed-commands-v2";

export function useWhatsAppReminderSync() {
    const {
        user,
        currentSchedule,
        activities,
        executionLogs,
        whatsappReminderEnabled,
        whatsappPhone,
        whatsappReminderLeadMinutes,
        setWhatsAppSyncStatus,
        updateActivity,
        addExecutionLog,
        updateStreak,
        setCurrentSchedule,
    } = usePoeStore();
    const processedCommandsRef = useRef<Set<string>>(new Set());

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

    useEffect(() => {
        if (!user || !whatsappReminderEnabled || !whatsappPhone.trim()) return;

        try {
            const saved = JSON.parse(localStorage.getItem(PROCESSED_COMMANDS_KEY) || "[]") as string[];
            processedCommandsRef.current = new Set(saved);
        } catch {
            processedCommandsRef.current = new Set();
        }

        const persistProcessed = () => {
            localStorage.setItem(
                PROCESSED_COMMANDS_KEY,
                JSON.stringify([...processedCommandsRef.current].slice(-200))
            );
        };

        const findTargetBlock = (command: WhatsAppCommand) => {
            const byContext = command.context?.blockId
                ? usePoeStore.getState().currentSchedule.find((block) => block.id === command.context?.blockId)
                : null;
            if (byContext) return byContext;

            const activityId = command.context?.activityId;
            if (activityId) {
                const byActivity = usePoeStore.getState().currentSchedule.find((block) => block.activity_id === activityId);
                if (byActivity) return byActivity;
            }

            if (command.context?.blockId || activityId) return null;

            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            return usePoeStore.getState().currentSchedule
                .filter((block) => block.type === "activity")
                .sort((a, b) => Math.abs((timeToMinutes(a.planned_start) || 0) - nowMinutes) - Math.abs((timeToMinutes(b.planned_start) || 0) - nowMinutes))[0];
        };

        const ackCommands = async (ids: string[]) => {
            if (!ids.length) return;
            await fetch("/api/wa/reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "ack-commands", ids }),
            }).catch(() => undefined);
        };

        const markBlockDone = (block: ScheduleBlock, status: "complete" | "skip") => {
            const state = usePoeStore.getState();
            const activity = state.activities.find((item) => item.id === block.activity_id);
            if (!activity) return false;

            const alreadyLogged = state.executionLogs.some((log) => log.schedule_block_id === block.id);

            updateActivity(activity.id, { is_completed: true });
            if (!alreadyLogged) {
                addExecutionLog({
                    id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    schedule_block_id: block.id,
                    actual_duration: status === "complete" ? Math.max(1, activity.target_duration) : 0,
                    focus_score: status === "complete" ? 4 : 1,
                    energy_after: "same",
                    distraction_count: 0,
                    status,
                });
            }

            if (status === "complete") updateStreak();
            setCurrentSchedule(usePoeStore.getState().currentSchedule.filter((item) => item.id !== block.id));
            return true;
        };

        const markActivityDone = (command: WhatsAppCommand, status: "complete" | "skip") => {
            const state = usePoeStore.getState();
            const activityId = command.context?.activityId;
            const activity = activityId
                ? state.activities.find((item) => item.id === activityId)
                : null;
            if (!activity) return false;

            const blockId = command.context?.blockId || `wa-${activity.id}-${command.id}`;
            const alreadyLogged = state.executionLogs.some((log) => log.schedule_block_id === blockId);

            updateActivity(activity.id, { is_completed: true });
            if (!alreadyLogged) {
                addExecutionLog({
                    id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    schedule_block_id: blockId,
                    actual_duration: status === "complete" ? Math.max(1, activity.target_duration) : 0,
                    focus_score: status === "complete" ? 4 : 1,
                    energy_after: "same",
                    distraction_count: 0,
                    status,
                });
            }

            if (status === "complete") updateStreak();
            setCurrentSchedule(usePoeStore.getState().currentSchedule.filter((item) => item.activity_id !== activity.id));
            return true;
        };

        const snoozeBlock = (block: ScheduleBlock, command: WhatsAppCommand) => {
            const state = usePoeStore.getState();
            const minutes = parseSnoozeMinutes(command.text);
            const start = timeToMinutes(block.planned_start);
            const end = timeToMinutes(block.planned_end);
            if (start === null || end === null) return false;

            const planned_start = minutesToTime(start + minutes);
            const planned_end = minutesToTime(end + minutes);
            updateActivity(block.activity_id, { preferred_start: planned_start });
            setCurrentSchedule(state.currentSchedule.map((item) => (
                item.id === block.id ? { ...item, planned_start, planned_end } : item
            )));
            return true;
        };

        const applyCommand = (command: WhatsAppCommand) => {
            if (command.userId !== user.id || processedCommandsRef.current.has(command.id)) return false;
            const block = findTargetBlock(command);
            let applied = false;

            if (block && command.intent === "done") {
                applied = markBlockDone(block, "complete");
            } else if (block && command.intent === "skip") {
                applied = markBlockDone(block, "skip");
            } else if (!block && command.intent === "done") {
                applied = markActivityDone(command, "complete");
            } else if (!block && command.intent === "skip") {
                applied = markActivityDone(command, "skip");
            } else if (block && command.intent === "snooze") {
                applied = snoozeBlock(block, command);
            } else if (command.intent === "chat" || command.intent === "reflection" || command.intent === "share_plan") {
                applied = true;
            }

            if (!applied) return false;
            processedCommandsRef.current.add(command.id);
            persistProcessed();
            return true;
        };

        const pollCommands = async () => {
            try {
                const response = await fetch("/api/wa/reminder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "commands" }),
                });
                const data = await response.json() as CommandsResponse;
                if (!response.ok || !data.ok) return;

                const appliedIds = (data.commands || [])
                    .filter((command) => command.userId === user.id)
                    .slice(0, 20)
                    .reverse()
                    .filter(applyCommand)
                    .map((command) => command.id);

                await ackCommands(appliedIds);
            } catch {
                // Silent by design: WhatsApp commands are an enhancement, not a blocker.
            }
        };

        pollCommands();
        const handleVisibility = () => {
            if (!document.hidden) void pollCommands();
        };
        const interval = window.setInterval(() => {
            if (!document.hidden) void pollCommands();
        }, 3_000);
        window.addEventListener("focus", pollCommands);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", pollCommands);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [
        addExecutionLog,
        currentSchedule,
        executionLogs,
        setCurrentSchedule,
        updateActivity,
        updateStreak,
        user,
        whatsappPhone,
        whatsappReminderEnabled,
    ]);
}
