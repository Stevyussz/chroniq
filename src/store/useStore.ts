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

    // Google Calendar Sync
    gcalToken: string | null;
    autoPushGcal: boolean;

    // AI Reflection Cache
    aiReflectionText: string | null;
    aiReflectionDate: string | null;

    // Actions
    setUser: (user: User) => void;
    addFixedBlock: (block: FixedBlock) => void;
    removeFixedBlock: (id: string) => void;
    setEnergySlots: (slots: EnergySlot[]) => void;
    addActivity: (activity: Activity) => void;
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
    syncTimer: () => number; // Calculate precise elapsed time based on timestamp
    setZenMode: (isActive: boolean) => void;

    setGcalToken: (token: string | null) => void;
    setAutoPushGcal: (autoPush: boolean) => void;

    // AI Cache Actions
    setAiReflection: (text: string, dateISO: string) => void;

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

            aiReflectionText: null,
            aiReflectionDate: null,

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
            addExecutionLog: (log) => set((state) => ({ executionLogs: [...state.executionLogs, log] })),
            restoreData: (data) => set((state) => ({ ...state, ...data })),
            addExp: (amount) => set((state) => {
                const newExp = state.exp + amount;
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

            syncTimer: () => {
                return 0; // The actual sync logic will be handled inside a React component using the store state
            },

            setZenMode: (isActive) => set({ isZenModeActive: isActive }),

            setGcalToken: (token) => set({ gcalToken: token }),
            setAutoPushGcal: (autoPush) => set({ autoPushGcal: autoPush }),

            setAiReflection: (text, dateISO) => set({ aiReflectionText: text, aiReflectionDate: dateISO }),

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
                aiReflectionDate: null
            }),
        }),
        {
            name: 'poe-storage', // key in localStorage
        }
    )
);
