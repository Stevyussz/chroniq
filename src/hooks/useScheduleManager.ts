import { useState, useEffect, useRef } from "react";
import { DragEndEvent } from '@dnd-kit/core';
import { usePoeStore } from "@/store/useStore";
import { generateSchedule } from "@/lib/engine/optimizer";
import { allocateTime } from "@/lib/engine/allocation";
import { ScheduleBlock, Activity } from "@/types";

export function useScheduleManager() {
    const {
        user, fixedBlocks, energySlots, activities, currentSchedule, executionLogs,
        setCurrentSchedule, shiftSchedule, addActivity, removeActivity, setActivities, restoreData,
        gcalToken, autoPushGcal
    } = usePoeStore();

    const activeBlockRef = useRef<HTMLDivElement>(null);

    // Real-Time System
    const [currentTime, setCurrentTime] = useState("");

    // AI Split Intervention State
    const [showAiSplitModal, setShowAiSplitModal] = useState(false);
    const [pendingLargeTask, setPendingLargeTask] = useState<Activity | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isReoptimizing, setIsReoptimizing] = useState(false);
    const [isPushingToGcal, setIsPushingToGcal] = useState(false);

    // Data Portability State
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        // Initialize clock
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        };
        updateTime();
        const clockInterval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(clockInterval);
    }, []);

    // Generate schedule automatically if none exists or if it's a new day
    useEffect(() => {
        if (!user || activities.length === 0) return;

        const setupDailySchedule = async () => {
            const dateStr = new Date().toISOString().split('T')[0];
            const isScheduleEmpty = currentSchedule.length === 0;
            const isScheduleOutdated = !isScheduleEmpty && currentSchedule[0].date !== dateStr;

            if (isScheduleEmpty || isScheduleOutdated) {
                let availableFlexMinutes = 14 * 60; // Default 14 hours
                let isRecoveryDay = false;
                const now = new Date();

                // 1. Check Weekend
                if (now.getDay() === 0 || now.getDay() === 6) {
                    isRecoveryDay = true;
                } else {
                    // 2. Check Nager.Date API for Indonesian Public Holidays
                    try {
                        const year = now.getFullYear();
                        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
                        if (res.ok) {
                            const holidays = await res.json();
                            const isHoliday = holidays.some((h: { date: string }) => h.date === dateStr);
                            if (isHoliday) isRecoveryDay = true;
                        }
                    } catch (err) {
                        console.error("Failed to fetch holidays:", err);
                    }
                }

                // Apply Penalty for Weekends/Holidays (Recovery Day)
                if (isRecoveryDay) {
                    availableFlexMinutes = Math.floor(availableFlexMinutes * 0.4); // Only 40% capacity on holidays
                }

                const allocated = allocateTime(activities, availableFlexMinutes);
                // Pass logs to the new adaptive engine
                const newSchedule = generateSchedule(
                    dateStr,
                    user.sleep_hours,
                    "06:00",
                    fixedBlocks,
                    energySlots,
                    allocated,
                    executionLogs,
                    currentSchedule
                );
                setCurrentSchedule(newSchedule);
            }
        };

        setupDailySchedule();
    }, [user, currentSchedule, activities, fixedBlocks, energySlots, executionLogs, setCurrentSchedule]);

    // Auto-scroll to active block when schedule is ready
    useEffect(() => {
        if (currentSchedule.length > 0) {
            setTimeout(() => {
                activeBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 500);
        }
    }, [currentSchedule, currentTime]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            shiftSchedule(active.id as string, over.id as string);
        }
    };

    const handleQuickAddExternal = (taskDetails: { name: string; duration: number; priority: 1 | 2 | 3 | 4 | 5; category?: string; preferred_start?: string }) => {
        const newAct = {
            id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            user_id: user?.id || "user",
            name: taskDetails.name,
            target_duration: taskDetails.duration,
            priority: taskDetails.priority as 1 | 2 | 3 | 4 | 5,
            category: taskDetails.category || "Ad-Hoc", // Use provided or default
            ...(taskDetails.preferred_start && { preferred_start: taskDetails.preferred_start }) // Inject if exists
        };

        if (newAct.target_duration > 120) {
            setPendingLargeTask(newAct);
            setShowAiSplitModal(true);
            return;
        }

        addActivity(newAct);
    };

    const pushToGoogleCalendar = async (schedule: ScheduleBlock[], dateStr: string) => {
        if (!gcalToken || !autoPushGcal) return;

        setIsPushingToGcal(true);
        try {
            const activitiesToPush = schedule.filter(b => b.type === "activity");

            // Execute pushes sequentially to be safe with rate limits, or Promise.all if we prefer speed
            for (const block of activitiesToPush) {
                const act = activities.find(a => a.id === block.activity_id);
                if (!act) continue;

                // Construct ISO datetimes for Google Calendar
                const startIso = `${dateStr}T${block.planned_start}:00+07:00`; // Assuming local +07:00, optimally we'd use browser timezone
                const endIso = `${dateStr}T${block.planned_end}:00+07:00`;

                await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${gcalToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        summary: `[CHRONIQ] ${act.name}`,
                        description: `Tugas Prioritas ${act.priority} | Kategori: ${act.category}\n\nOtomatis dijadwalkan oleh Chroniq Optimizer.`,
                        start: { dateTime: startIso },
                        end: { dateTime: endIso },
                        colorId: "5", // yellow-ish color for visibility
                        reminders: { useDefault: true }
                    })
                });
            }
            console.log("Success pushing to GCal");
        } catch (err) {
            console.error("Failed to push to GCal:", err);
        } finally {
            setIsPushingToGcal(false);
        }
    };

    const handleReoptimize = async () => {
        if (!user || activities.length === 0) return;

        setIsReoptimizing(true);
        let optimizedActivities = [...activities];

        try {
            // Allow Gemini to review and re-categorize or break down any messy newly added activities
            const response = await fetch('/api/ai/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activities: optimizedActivities })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.refinedActivities && Array.isArray(data.refinedActivities)) {
                    optimizedActivities = data.refinedActivities;
                    setActivities(optimizedActivities); // Update store if AI made corrections
                }
            }
        } catch (error) {
            console.warn("AI refine optimization failed, falling back to local deterministic engine only:", error);
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const allocated = allocateTime(optimizedActivities, 14 * 60);
        const newSchedule = generateSchedule(
            dateStr,
            user.sleep_hours,
            "06:00",
            fixedBlocks,
            energySlots,
            allocated,
            executionLogs,
            currentSchedule,
            optimizedActivities // Use newly refined set
        );

        setCurrentSchedule(newSchedule);
        setIsReoptimizing(false);

        // Auto-Push to GCal if enabled
        if (autoPushGcal && gcalToken) {
            pushToGoogleCalendar(newSchedule, dateStr);
        }
    };

    const handleConfirmAiSplit = async () => {
        if (!pendingLargeTask) return;

        setIsAiLoading(true);
        try {
            const response = await fetch('/api/ai/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskName: pendingLargeTask.name,
                    targetDuration: pendingLargeTask.target_duration
                })
            });

            if (!response.ok) throw new Error('Failed to fetch from Gemini AI');

            const data = await response.json();

            if (data.subtasks && Array.isArray(data.subtasks)) {
                // Map the creative AI tasks into our store
                data.subtasks.forEach((subtask: { name: string; duration: number }, index: number) => {
                    addActivity({
                        ...pendingLargeTask,
                        id: `${pendingLargeTask.id}-ai-part${index + 1}`,
                        name: `${subtask.name} (${pendingLargeTask.name})`,
                        target_duration: subtask.duration
                    });
                });
            } else {
                throw new Error('Invalid schema returned from AI');
            }

        } catch (error) {
            console.warn("AI Split Failed, fallback to static math division:", error);
            // Fallback: Split into 60 min chunks
            const chunkDuration = 60;
            const chunks = Math.ceil(pendingLargeTask.target_duration / chunkDuration);

            for (let i = 0; i < chunks; i++) {
                const remainingDuration = (i === chunks - 1)
                    ? pendingLargeTask.target_duration - (i * chunkDuration)
                    : chunkDuration;

                addActivity({
                    ...pendingLargeTask,
                    id: `${pendingLargeTask.id}-part${i + 1}`,
                    name: `${pendingLargeTask.name} (Part ${i + 1}/${chunks})`,
                    target_duration: remainingDuration
                });
            }
        } finally {
            setIsAiLoading(false);
            setShowAiSplitModal(false);
            setPendingLargeTask(null);
            setTimeout(handleReoptimize, 100);
        }
    };

    const handleRejectAiSplit = () => {
        if (!pendingLargeTask) return;
        addActivity(pendingLargeTask);
        setShowAiSplitModal(false);
        setPendingLargeTask(null);
        setTimeout(handleReoptimize, 100);
    };

    const handleDeleteActivity = (activityId: string) => {
        removeActivity(activityId);
        setTimeout(handleReoptimize, 100);
    };

    const handleExport = () => {
        const dataToExport = {
            user, fixedBlocks, energySlots, activities, currentSchedule, executionLogs
        };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chroniq-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.user && data.activities && data.currentSchedule) {
                    restoreData(data);
                    alert("Data Chroniq berhasil direstore!");
                } else {
                    alert("File JSON tidak valid (Corrupted ChroniqBackup).");
                }
            } catch {
                alert("Gagal membaca file JSON.");
            }
        };
        reader.readAsText(file);
    };

    return {
        currentTime,
        activeBlockRef,
        showAiSplitModal, setShowAiSplitModal,
        pendingLargeTask, setPendingLargeTask,
        isAiLoading,
        isReoptimizing,
        isPushingToGcal,
        showSettings, setShowSettings,
        handleDragEnd,
        handleQuickAddExternal,
        handleReoptimize,
        handleConfirmAiSplit,
        handleRejectAiSplit,
        handleDeleteActivity,
        handleExport,
        handleImport,
    };
}
