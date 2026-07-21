import { useState, useEffect, useRef } from "react";
import { DragEndEvent } from '@dnd-kit/core';
import { usePoeStore } from "@/store/useStore";
import { generateSchedule } from "@/lib/engine/optimizer";
import { allocateTime } from "@/lib/engine/allocation";
import { calculateFlexibleTime } from "@/lib/engine/constraint";
import { ScheduleBlock, Activity } from "@/types";
import { sendBrowserNotification } from "@/lib/engine/audio";
import { fetchChroniqAiJson } from "@/lib/ai/client";

const clampPriority = (priority: number): 1 | 2 | 3 | 4 | 5 => {
    const normalized = Math.round(Number.isFinite(priority) ? priority : 3);
    return Math.min(5, Math.max(1, normalized)) as 1 | 2 | 3 | 4 | 5;
};

const clampDuration = (duration: number): number => {
    const normalized = Math.round(Number.isFinite(duration) ? duration : 30);
    return Math.min(480, Math.max(5, normalized));
};

export function useScheduleManager() {
    const {
        user, fixedBlocks, energySlots, activities, currentSchedule, executionLogs,
        setCurrentSchedule, shiftSchedule, removeActivity, setActivities, restoreData,
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

    const buildSchedule = (sourceActivities: Activity[]) => {
        if (!user) return [];

        const dateStr = new Date().toISOString().split('T')[0];
        const activeActivities = sourceActivities.filter(a => !a.is_completed);
        const flexMinutes = calculateFlexibleTime(user.sleep_hours, fixedBlocks);
        const allocated = allocateTime(activeActivities, flexMinutes);

        return generateSchedule(
            dateStr,
            user.sleep_hours,
            user.wake_up_time || "07:00",
            fixedBlocks,
            energySlots,
            allocated,
            usePoeStore.getState().executionLogs,
            currentSchedule,
            activeActivities
        );
    };

    const commitActivitiesAndOptimize = (nextActivities: Activity[]) => {
        const normalizedActivities = nextActivities.map((activity) => ({
            ...activity,
            target_duration: clampDuration(activity.target_duration),
            priority: clampPriority(activity.priority),
        }));
        const dateStr = new Date().toISOString().split('T')[0];
        const newSchedule = buildSchedule(normalizedActivities);

        setActivities(normalizedActivities);
        setCurrentSchedule(newSchedule);

        if (autoPushGcal && gcalToken) {
            pushToGoogleCalendar(newSchedule, dateStr, normalizedActivities);
        }
    };

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
                // BUG FIX #3: Previously hard-coded to 14 * 60 = 840 minutes.
                // This completely bypassed the constraint engine — the core feature of this app.
                // Now we correctly call calculateFlexibleTime() with the user's actual data.
                let availableFlexMinutes = calculateFlexibleTime(user.sleep_hours, fixedBlocks);
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

                const currentLogs = usePoeStore.getState().executionLogs;
                const todayDow = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat

                // RECURRING TASKS ENGINE
                // Reset is_completed for recurring tasks that are due today.
                // This is the core mechanic that makes recurring tasks reappear each day.
                const storeActivities = usePoeStore.getState().activities;
                let needsRecurringReset = false;
                const updatedActivities = storeActivities.map(act => {
                    if (!act.recurrence || act.recurrence === 'none') return act;

                    let isDueToday = false;
                    if (act.recurrence === 'daily') isDueToday = true;
                    if (act.recurrence === 'weekdays') isDueToday = todayDow >= 1 && todayDow <= 5;
                    if (act.recurrence === 'weekly') isDueToday = true; // Same day of week as when added (simplified)

                    if (isDueToday && act.is_completed) {
                        needsRecurringReset = true;
                        return { ...act, is_completed: false };
                    }
                    return act;
                });

                if (needsRecurringReset) {
                    usePoeStore.getState().setActivities(updatedActivities);
                }

                // Only schedule activities that are NOT completed (after recurring reset)
                const activeActivities = (needsRecurringReset ? updatedActivities : storeActivities).filter(a => !a.is_completed);
                const allocated = allocateTime(activeActivities, availableFlexMinutes);

                // Pass logs to the new adaptive engine
                const newSchedule = generateSchedule(
                    dateStr,
                    user.sleep_hours,
                    user.wake_up_time || "07:00", // Use real wake-up time, fallback to 07:00
                    fixedBlocks,
                    energySlots,
                    allocated,
                    currentLogs,
                    currentSchedule,
                    activeActivities
                );
                
                setCurrentSchedule(newSchedule);

                // Auto-Reschedule Alert for Gen Z (Feedback loop)
                if (isScheduleOutdated) {
                    const missedCount = activeActivities.length;
                    if (missedCount > 0) {
                        sendBrowserNotification(
                            "🔄 Auto-Reschedule Aktif",
                            `Ada ${missedCount} tugas kemarin yang belum selesai. Tenang, AI Chroniq sudah memindahkannya ke jadwal hari ini!`
                        );
                    }
                }
            }
        };

        setupDailySchedule();
    // BUG FIX #4: Removed `executionLogs` from deps. Every call to addExecutionLog()
    // (which fires after completing a task) was triggering this effect, potentially
    // resetting the schedule mid-session. Schedule generation should only run when
    // the core setup data changes, not when execution logs are added.
    }, [user, currentSchedule, activities, fixedBlocks, energySlots, setCurrentSchedule]);

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
            // 1. Shift visually first for instant feedback
            shiftSchedule(active.id as string, over.id as string);

            // 2. AI Connection: Re-calculate pinning constraints and re-optimize
            const state = usePoeStore.getState();
            const currentActivities = state.activities;
            const updatedSchedule = state.currentSchedule; // This has the new array order (times not adjusted yet)
            
            const newIndex = updatedSchedule.findIndex(s => s.id === active.id);
            if (newIndex !== -1) {
                const movedBlock = updatedSchedule[newIndex];
                
                // Only apply AI smarts if it's an activity block
                if (movedBlock.type === 'activity' && movedBlock.activity_id) {
                    let newStartTime = "";
                    
                    // Look at the block immediately BEFORE it to get the start time
                    if (newIndex > 0) {
                        newStartTime = updatedSchedule[newIndex - 1].planned_end;
                    } else if (updatedSchedule.length > 1) {
                        // If moved to very top, it steals the start time of the block it pushed down
                        newStartTime = updatedSchedule[1].planned_start;
                    }

                    if (newStartTime) {
                         const targetAct = currentActivities.find(a => a.id === movedBlock.activity_id);
                         if (targetAct) {
                             // AI Pinning: Force this task to start at the new time and boost priority
                             const updatedAct = { ...targetAct, preferred_start: newStartTime, priority: Math.max(targetAct.priority, 4) as 1 | 2 | 3 | 4 | 5 };
                             const newActivities = currentActivities.map(a => a.id === targetAct.id ? updatedAct : a);
                             
                             // Update store
                             state.setActivities(newActivities);
                             
                             // Trigger full AI re-optimization so it dynamically flows everything else!
                             setIsReoptimizing(true);
                             setTimeout(() => {
                                 buildSchedule(newActivities);
                                 setIsReoptimizing(false);
                             }, 400); // slight delay so the visual drop animation finishes smoothly
                         }
                    }
                }
            }
        }
    };

    const handleQuickAddExternal = (taskDetails: { name: string; duration: number; priority: 1 | 2 | 3 | 4 | 5; category?: string; preferred_start?: string; recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays'; deadline?: string }) => {
        const newAct = {
            id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            user_id: user?.id || "user",
            name: taskDetails.name.trim(),
            target_duration: clampDuration(taskDetails.duration),
            priority: clampPriority(taskDetails.priority),
            category: taskDetails.category || "Ad-Hoc (Dadakan)",
            ...(taskDetails.preferred_start && { preferred_start: taskDetails.preferred_start }),
            recurrence: taskDetails.recurrence || 'none',
            date_added: new Date().toISOString().split('T')[0],
            ...(taskDetails.deadline && { deadline: taskDetails.deadline }),
        };

        if (!newAct.name) return;

        if (newAct.target_duration > 120) {
            setPendingLargeTask(newAct);
            setShowAiSplitModal(true);
            return;
        }

        commitActivitiesAndOptimize([...usePoeStore.getState().activities, newAct]);
    };

    const pushToGoogleCalendar = async (schedule: ScheduleBlock[], dateStr: string, sourceActivities: Activity[] = activities) => {
        if (!gcalToken || !autoPushGcal) return;

        setIsPushingToGcal(true);
        try {
            const activitiesToPush = schedule.filter(b => b.type === "activity");

            // Execute pushes sequentially to be safe with rate limits, or Promise.all if we prefer speed
            for (const block of activitiesToPush) {
                const act = sourceActivities.find(a => a.id === block.activity_id);
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
            // Allow Chroniq AI to review and re-categorize or break down any messy newly added activities
            const data = await fetchChroniqAiJson<{ refinedActivities?: Activity[] }>('/api/ai/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activities: optimizedActivities })
            }, 18_000);

            if (data.refinedActivities && Array.isArray(data.refinedActivities)) {
                optimizedActivities = data.refinedActivities;
                setActivities(optimizedActivities); // Update store if AI made corrections
            }
        } catch (error) {
            console.warn("AI refine optimization failed, falling back to local deterministic engine only:", error);
        }

        commitActivitiesAndOptimize(optimizedActivities);
        setIsReoptimizing(false);
    };

    const handleConfirmAiSplit = async () => {
        if (!pendingLargeTask) return;

        setIsAiLoading(true);
        try {
            const data = await fetchChroniqAiJson<{ subtasks?: { name: string; duration: number }[] }>('/api/ai/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskName: pendingLargeTask.name,
                    targetDuration: pendingLargeTask.target_duration
                })
            }, 18_000);

            if (data.subtasks && Array.isArray(data.subtasks)) {
                // Map the creative AI tasks into our store
                const nextActivities = [
                    ...usePoeStore.getState().activities,
                    ...data.subtasks.map((subtask: { name: string; duration: number }, index: number) => ({
                        ...pendingLargeTask,
                        id: `${pendingLargeTask.id}-ai-part${index + 1}`,
                        name: `${subtask.name} (${pendingLargeTask.name})`,
                        target_duration: clampDuration(subtask.duration)
                    }))
                ];
                commitActivitiesAndOptimize(nextActivities);
            } else {
                throw new Error('Invalid schema returned from AI');
            }

        } catch (error) {
            console.warn("AI Split Failed, fallback to static math division:", error);
            // Fallback: Split into 60 min chunks
            const chunkDuration = 60;
            const chunks = Math.ceil(pendingLargeTask.target_duration / chunkDuration);

            const splitActivities: Activity[] = [];
            for (let i = 0; i < chunks; i++) {
                const remainingDuration = (i === chunks - 1)
                    ? pendingLargeTask.target_duration - (i * chunkDuration)
                    : chunkDuration;

                splitActivities.push({
                    ...pendingLargeTask,
                    id: `${pendingLargeTask.id}-part${i + 1}`,
                    name: `${pendingLargeTask.name} (Part ${i + 1}/${chunks})`,
                    target_duration: clampDuration(remainingDuration)
                });
            }
            commitActivitiesAndOptimize([...usePoeStore.getState().activities, ...splitActivities]);
        } finally {
            setIsAiLoading(false);
            setShowAiSplitModal(false);
            setPendingLargeTask(null);
        }
    };

    const handleRejectAiSplit = () => {
        if (!pendingLargeTask) return;
        commitActivitiesAndOptimize([...usePoeStore.getState().activities, pendingLargeTask]);
        setShowAiSplitModal(false);
        setPendingLargeTask(null);
    };

    const handleDeleteActivity = (activityId: string) => {
        removeActivity(activityId);
        commitActivitiesAndOptimize(usePoeStore.getState().activities.filter(activity => activity.id !== activityId));
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
