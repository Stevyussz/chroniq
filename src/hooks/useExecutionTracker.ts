import { useState, useEffect, useRef } from "react";
import { usePoeStore } from "@/store/useStore";
import { playZenChime, sendBrowserNotification } from "@/lib/engine/audio";

export function useExecutionTracker() {
    const {
        activeBlockId,
        timerStartedAtISO,
        elapsedSeconds,
        isTimerPaused,
        startTimer,
        pauseTimer,
        stopTimer,
        addExecutionLog,
        addExp,
        updateStreak,
        isZenModeActive,
        setZenMode
    } = usePoeStore();

    // Lofi Radio State
    const [isLofiPlaying, setIsLofiPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Execution State (Local mirror for ticking)
    const [activeTimer, setActiveTimer] = useState(0); // in seconds
    const [showConfetti, setShowConfetti] = useState(false);

    // Post-Activity Evaluation State
    const [evalBlockId, setEvalBlockId] = useState<string | null>(null);
    const [focusScore, setFocusScore] = useState(3);
    const [energyAfter, setEnergyAfter] = useState<"up" | "same" | "down">("same");
    const [distractions, setDistractions] = useState(0);

    // Anti-Distraction Zen Mode Hook
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isZenModeActive && !isTimerPaused) {
                // User switched tabs while in Zen Mode!
                // BUG FIX #12: addExp(-5) could drive EXP negative, breaking level calculation.
                // addExp in the store now guards against negative EXP via Math.max(0, ...).
                // We still call it here, but the guard is in the store.
                addExp(-5);
                setDistractions(prev => prev + 1);

                sendBrowserNotification(
                    "⚠️ Teguran Chroniq AI",
                    "Anda terdeteksi berpindah tab/aplikasi saat Zen Mode aktif. Fokus terputus! EXP -5."
                );
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isZenModeActive, isTimerPaused, addExp]);

    // Timer Sync Logic
    // BUG FIX #9: Previously, `elapsedSeconds` was captured in the closure at the time
    // the effect ran. When the user paused and resumed, `elapsedSeconds` was stale —
    // the interval kept using the old value from before the pause. Fix: read the latest
    // elapsedSeconds from the store directly inside the interval callback via getState(),
    // bypassing the stale closure entirely.
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeBlockId && !isTimerPaused && timerStartedAtISO) {
            const startMs = new Date(timerStartedAtISO).getTime();

            interval = setInterval(() => {
                const now = Date.now();
                const diffSeconds = Math.floor((now - startMs) / 1000);
                // Read fresh elapsedSeconds from store to avoid stale closure
                const freshElapsed = usePoeStore.getState().elapsedSeconds;
                const totalElapsed = freshElapsed + diffSeconds;

                setActiveTimer(totalElapsed);

                // Check for completion target
                const state = usePoeStore.getState();
                const activeBlock = state.currentSchedule.find((b) => b.id === activeBlockId);
                if (activeBlock) {
                    let targetMins = 30; // default
                    if (activeBlock.type === "activity") {
                        const act = state.activities.find((a) => a.id === activeBlock.activity_id);
                        if (act) targetMins = act.target_duration;
                    } else if (activeBlock.type === "break") targetMins = 15;

                    const targetSecs = targetMins * 60;
                    // Only fire the chime once (when totalElapsed crosses the threshold)
                    if (totalElapsed >= targetSecs && totalElapsed - 1 < targetSecs) {
                        playZenChime();
                        sendBrowserNotification(
                            "Waktu Habis!",
                            `Durasi target untuk blok eksekusi ini telah tercapai. Waktunya bernapas!`
                        );
                    }
                }
            }, 1000);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveTimer(elapsedSeconds);
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [
        activeBlockId,
        isTimerPaused,
        timerStartedAtISO,
        elapsedSeconds,
    ]);

    const handleStart = (blockId: string) => {
        startTimer(blockId);
    };

    const toggleLofi = () => {
        if (!audioRef.current) return;
        if (isLofiPlaying) {
            audioRef.current.pause();
            setIsLofiPlaying(false);
        } else {
            audioRef.current.play().catch((err) => {
                console.error("Audio play failed:", err);
            });
            setIsLofiPlaying(true);
        }
    };

    const handlePause = () => {
        pauseTimer(activeTimer);
    };

    const handleComplete = () => {
        if (!activeBlockId) return;
        setEvalBlockId(activeBlockId);
        stopTimer();
        setIsLofiPlaying(false);
        setZenMode(false); // Make sure to exit Zen Mode
    };

    const handleSkip = (blockId: string) => {
        const state = usePoeStore.getState();
        const block = state.currentSchedule.find(b => b.id === blockId);
        if (block && block.type === "activity") {
            state.updateActivity(block.activity_id, { is_completed: true });
        }

        addExecutionLog({
            id: `log-${Date.now()}`,
            schedule_block_id: blockId,
            actual_duration: 0,
            focus_score: 1,
            energy_after: "same",
            distraction_count: 0,
            status: "skip",
        });
        stopTimer();
        setIsLofiPlaying(false);
        setZenMode(false);
    };

    const submitEval = () => {
        if (!evalBlockId) return;

        const loggedDuration = Math.round(activeTimer / 60) || 1; // min 1 min

        // RPG Logic — SCIENCE FIX #5: Self-Determination Theory (Deci & Ryan, 1985)
        // & Flow State research (Csikszentmihalyi)
        //
        // OLD formula: duration × (focusScore / 3)
        // → Focus 1 = 0.33× EXP, Focus 3 = 1.0× EXP, Focus 5 = 1.67× EXP
        // → The reward differential is only 5× between worst and best focus
        //
        // NEW formula: duration × (focusScore/5)² × distractionModifier
        // → Focus 1 = 0.04× EXP, Focus 3 = 0.36× EXP, Focus 5 = 1.0× EXP
        // → The reward differential is now 25× — strongly incentivizing deep focus
        // → Distraction modifier: each distraction linearly reduces EXP (attention residue penalty)
        //
        // This design creates intrinsic motivation for QUALITY over QUANTITY,
        // which is the hallmark of effective gamification (Deci & Ryan, 1985).
        const focusMultiplier = Math.pow(focusScore / 5, 2); // Exponential quality reward
        const distractionModifier = Math.max(0.3, 1 - (distractions * 0.15)); // Each distraction = -15% EXP, floor at 30%
        const gainedExp = Math.round(loggedDuration * focusMultiplier * distractionModifier);
        addExp(gainedExp);
        updateStreak(); // Habit Science: update daily streak on task completion

        const state = usePoeStore.getState();
        const block = state.currentSchedule.find(b => b.id === evalBlockId);
        if (block && block.type === "activity") {
            state.updateActivity(block.activity_id, { is_completed: true });
        }

        addExecutionLog({
            id: `log-${Date.now()}`,
            schedule_block_id: evalBlockId,
            actual_duration: loggedDuration,
            focus_score: focusScore,
            energy_after: energyAfter,
            distraction_count: distractions,
            status: "complete",
        });

        setEvalBlockId(null);
        setActiveTimer(0);
        setFocusScore(3);
        setEnergyAfter("same");
        setDistractions(0);

        // Trigger Wow Feedback
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
    };

    return {
        isLofiPlaying,
        audioRef,
        toggleLofi,
        activeTimer,
        showConfetti,
        evalBlockId,
        setEvalBlockId,
        focusScore,
        setFocusScore,
        energyAfter,
        setEnergyAfter,
        distractions,
        setDistractions,
        handleStart,
        handlePause,
        handleComplete,
        handleSkip,
        submitEval,
        setShowConfetti
    };
}
