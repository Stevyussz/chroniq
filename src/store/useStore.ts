import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, FixedBlock, EnergySlot, Activity, ScheduleBlock, ExecutionLog } from '@/types';

interface PoeState {
    user: User | null;
    fixedBlocks: FixedBlock[];
    energySlots: EnergySlot[];
    activities: Activity[];
    currentSchedule: ScheduleBlock[];
    executionLogs: ExecutionLog[];
    exp: number;
    level: number;

    // Advanced Timer State (Background persistence)
    activeBlockId: string | null;
    timerStartedAtISO: string | null; // ISO timestamp when timer was last started/resumed
    elapsedSeconds: number; // accumulated seconds before the current start timestamp
    isTimerPaused: boolean;
    isZenModeActive: boolean;

    // Google Calendar & Notifications Sync
    gcalToken: string | null;
    autoPushGcal: boolean;
    pushNotificationsEnabled: boolean;

    // AI Reflection Cache
    aiReflectionText: string | null;
    aiReflectionDate: string | null;
    aiSuggestedEnergySlots: EnergySlot[] | null;

    // Streak System (James Clear / BJ Fogg — Habit Science)
    // Consecutive days where user completed at least 1 task.
    // Streak is the most powerful retention mechanism for habit apps.
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null; // YYYY-MM-DD format

    // AI Coach Chat History Persistence
    // Chat history is persisted so users can resume conversations.
    // Losing chat context breaks the "AI coach" mental model entirely.
    chatHistory: { id: string; role: "user" | "model"; content: string }[];

    // Pomodoro Timer Mode
    timerMode: 'deepwork' | 'pomodoro';
    pomodoroCount: number;       // sesi pomodoro selesai hari ini
    pomodoroPhase: 'work' | 'break'; // fase saat ini: kerja atau istirahat
    pomodoroLastReset: string | null; // YYYY-MM-DD to reset count per day

    // Actions
    setUser: (user: User) => void;
    addFixedBlock: (block: FixedBlock) => void;
    removeFixedBlock: (id: string) => void;
    setEnergySlots: (slots: EnergySlot[]) => void;
    addActivity: (activity: Activity) => void;
    updateActivity: (id: string, updates: Partial<Activity>) => void;
    removeActivity: (id: string) => void;
    setActivities: (activities: Activity[]) => void;

    // Checklist Actions
    addChecklist: (activityId: string, title: string) => void;
    toggleChecklist: (activityId: string, checklistId: string) => void;
    removeChecklist: (activityId: string, checklistId: string) => void;

    setCurrentSchedule: (schedule: ScheduleBlock[]) => void;
    shiftSchedule: (activeId: string, overId: string) => void;
    addExecutionLog: (log: ExecutionLog) => void;
    restoreData: (data: Partial<PoeState>) => void;
    addExp: (amount: number) => void;

    // Timer Actions
    startTimer: (blockId: string) => void;
    pauseTimer: (currentDisplayedTime: number) => void;
    stopTimer: () => void;
    // syncTimer removed: was a non-functional stub (always returned 0).
    // Elapsed time is computed in useExecutionTracker via ISO timestamp diff.
    setZenMode: (isActive: boolean) => void;

    setGcalToken: (token: string | null) => void;
    setAutoPushGcal: (autoPush: boolean) => void;
    setPushNotificationsEnabled: (enabled: boolean) => void;

    // AI Cache Actions
    setAiReflection: (text: string, dateISO: string, suggestedSlots?: EnergySlot[] | null) => void;
    setAiSuggestedEnergySlots: (slots: EnergySlot[] | null) => void;

    // Streak Actions
    updateStreak: () => void;

    // Chat History Actions
    addChatMessage: (msg: { id: string; role: "user" | "model"; content: string }) => void;
    clearChatHistory: () => void;

    // Pomodoro Actions
    setTimerMode: (mode: 'deepwork' | 'pomodoro') => void;
    incrementPomodoroCount: () => void;
    setPomodoroPhase: (phase: 'work' | 'break') => void;

    resetTimeline: () => void;
    resetAll: () => void;
}

export const usePoeStore = create<PoeState>()(
    persist(
        (set) => ({
            user: null,
            fixedBlocks: [],
            energySlots: [],
            activities: [],
            currentSchedule: [],
            executionLogs: [],
            exp: 0,
            level: 1,

            activeBlockId: null,
            timerStartedAtISO: null,
            elapsedSeconds: 0,
            isTimerPaused: true,
            isZenModeActive: false,

            gcalToken: null,
            autoPushGcal: false,
            pushNotificationsEnabled: false,

            aiReflectionText: null,
            aiReflectionDate: null,
            aiSuggestedEnergySlots: null,

            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,

            chatHistory: [],

            timerMode: 'deepwork',
            pomodoroCount: 0,
            pomodoroPhase: 'work',
            pomodoroLastReset: null,

            resetTimeline: () => set({
                activities: [],
                currentSchedule: [],
                activeBlockId: null,
                timerStartedAtISO: null,
                elapsedSeconds: 0,
                isTimerPaused: true,
                isZenModeActive: false,
            }),

            setUser: (user) => set({ user }),
            addFixedBlock: (block) => set((state) => ({ fixedBlocks: [...state.fixedBlocks, block] })),
            removeFixedBlock: (id) => set((state) => ({ fixedBlocks: state.fixedBlocks.filter(b => b.id !== id) })),
            setEnergySlots: (slots) => set({ energySlots: slots }),
            addActivity: (activity) => set((state) => ({ activities: [...state.activities, activity] })),
            updateActivity: (id, updates) => set((state) => ({
                activities: state.activities.map(a => a.id === id ? { ...a, ...updates } : a)
            })),
            removeActivity: (id) => set((state) => ({ activities: state.activities.filter(a => a.id !== id) })),
            setActivities: (activities) => set({ activities }),

            addChecklist: (activityId, title) => set((state) => ({
                activities: state.activities.map(a => {
                    if (a.id === activityId) {
                        const newChecklist = { id: `chk-${Date.now()}`, title, is_completed: false };
                        return { ...a, checklists: [...(a.checklists || []), newChecklist] };
                    }
                    return a;
                })
            })),

            toggleChecklist: (activityId, checklistId) => set((state) => ({
                activities: state.activities.map(a => {
                    if (a.id === activityId && a.checklists) {
                        return {
                            ...a,
                            checklists: a.checklists.map(c => c.id === checklistId ? { ...c, is_completed: !c.is_completed } : c)
                        };
                    }
                    return a;
                })
            })),

            removeChecklist: (activityId, checklistId) => set((state) => ({
                activities: state.activities.map(a => {
                    if (a.id === activityId && a.checklists) {
                        return {
                            ...a,
                            checklists: a.checklists.filter(c => c.id !== checklistId)
                        };
                    }
                    return a;
                })
            })),

            setCurrentSchedule: (schedule) => set({ currentSchedule: schedule }),
            shiftSchedule: (activeId, overId) => set((state) => {
                const oldIndex = state.currentSchedule.findIndex(s => s.id === activeId);
                const newIndex = state.currentSchedule.findIndex(s => s.id === overId);
                if (oldIndex === -1 || newIndex === -1) return state;

                const newSchedule = [...state.currentSchedule];
                const [moved] = newSchedule.splice(oldIndex, 1);
                newSchedule.splice(newIndex, 0, moved);

                // Note: For a true manual override compiler we'd need to recalculate ALL times.
                // For MVP drag-and-drop, we just reorder the array visually and preserve durations.
                return { currentSchedule: newSchedule };
            }),
            addExecutionLog: (log) => set((state) => {
                const updated = { executionLogs: [...state.executionLogs, log] };
                return updated;
            }),
            restoreData: (data) => set((state) => ({ ...state, ...data })),
            addExp: (amount) => set((state) => {
                // BUG FIX #12: Without Math.max(0, ...), addExp(-5) (Zen Mode penalty) could
                // drive EXP negative. Then Math.sqrt(negativeExp/100) = NaN, breaking level display.
                const newExp = Math.max(0, state.exp + amount);
                const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
                return { exp: newExp, level: newLevel };
            }),

            startTimer: (blockId) => set((state) => {
                // If resuming the same block
                if (state.activeBlockId === blockId && state.isTimerPaused) {
                    return { timerStartedAtISO: new Date().toISOString(), isTimerPaused: false };
                }
                // If starting a fresh block
                return {
                    activeBlockId: blockId,
                    timerStartedAtISO: new Date().toISOString(),
                    elapsedSeconds: 0,
                    isTimerPaused: false
                };
            }),

            pauseTimer: (currentDisplayedTime) => set(() => ({
                isTimerPaused: true,
                timerStartedAtISO: null,
                elapsedSeconds: currentDisplayedTime
            })),

            stopTimer: () => set(() => ({
                activeBlockId: null,
                timerStartedAtISO: null,
                elapsedSeconds: 0,
                isTimerPaused: true
            })),

            // BUG FIX #5: syncTimer was a non-functional stub always returning 0.
            // The actual elapsed time computation is handled in useExecutionTracker
            // via ISO timestamp difference, which correctly survives page refreshes.
            // This stub is removed from the interface.

            setZenMode: (isActive) => set({ isZenModeActive: isActive }),

            setGcalToken: (token) => set({ gcalToken: token }),
            setAutoPushGcal: (autoPush) => set({ autoPushGcal: autoPush }),
            setPushNotificationsEnabled: (enabled) => set({ pushNotificationsEnabled: enabled }),

            setAiReflection: (text, dateISO, suggestedSlots) => set({ 
                aiReflectionText: text, 
                aiReflectionDate: dateISO,
                ...(suggestedSlots !== undefined && { aiSuggestedEnergySlots: suggestedSlots })
            }),
            setAiSuggestedEnergySlots: (slots) => set({ aiSuggestedEnergySlots: slots }),

            // SCIENCE: Streak System — Habit Formation (James Clear, BJ Fogg)
            // Called every time a task is completed. Calculates if today is consecutive
            // to the last active day. If yes, increment streak. If not, reset to 1.
            updateStreak: () => set((state) => {
                const today = new Date().toISOString().split('T')[0];
                if (state.lastActiveDate === today) {
                    // Already counted today, no change needed
                    return {};
                }
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                const isConsecutive = state.lastActiveDate === yesterday;
                const newStreak = isConsecutive ? state.currentStreak + 1 : 1;
                return {
                    currentStreak: newStreak,
                    longestStreak: Math.max(newStreak, state.longestStreak),
                    lastActiveDate: today,
                };
            }),

            // Chat History Persistence
            addChatMessage: (msg) => set((state) => ({
                chatHistory: [...state.chatHistory.slice(-99), msg] // keep last 100 messages
            })),
            clearChatHistory: () => set({ chatHistory: [] }),

            setTimerMode: (mode) => set({ timerMode: mode }),
            setPomodoroPhase: (phase) => set({ pomodoroPhase: phase }),
            incrementPomodoroCount: () => set((state) => {
                const today = new Date().toISOString().split('T')[0];
                // Reset counter if it's a new day
                if (state.pomodoroLastReset !== today) {
                    return { pomodoroCount: 1, pomodoroLastReset: today };
                }
                return { pomodoroCount: state.pomodoroCount + 1 };
            }),

            resetAll: () => set({
                user: null,
                fixedBlocks: [],
                energySlots: [],
                activities: [],
                currentSchedule: [],
                executionLogs: [],
                exp: 0,
                level: 1,
                activeBlockId: null,
                timerStartedAtISO: null,
                elapsedSeconds: 0,
                isTimerPaused: true,
                isZenModeActive: false,
                aiReflectionText: null,
                aiReflectionDate: null,
                aiSuggestedEnergySlots: null,
                // BUG FIX #6: These were previously NOT reset, meaning after resetAll()
                // the Google Calendar token and notification settings persisted.
                // This could cause unexpected GCal pushes for the next user/session.
                gcalToken: null,
                autoPushGcal: false,
                pushNotificationsEnabled: false,
                // Streak and Chat reset — prevent data from leaking across user sessions
                currentStreak: 0,
                longestStreak: 0,
                lastActiveDate: null,
                chatHistory: [],
            }),
        }),
        {
            name: 'poe-storage', // key in localStorage
        }
    )
);
