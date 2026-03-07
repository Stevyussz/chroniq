import { useState, useEffect, useRef } from "react";
import { usePoeStore } from "@/store/useStore";
import { playZenChime, sendBrowserNotification } from "@/lib/engine/audio";

export function useExecutionTracker() {
    const {
        activities,
        currentSchedule,
        activeBlockId,
        timerStartedAtISO,
        elapsedSeconds,
        isTimerPaused,
        startTimer,
        pauseTimer,
        stopTimer,
        addExecutionLog,
        addExp,
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
                // Penalty: deduct 5 exp or count as distraction
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
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeBlockId && !isTimerPaused && timerStartedAtISO) {
            // Sync loop
            interval = setInterval(() => {
                const now = new Date().getTime();
                const start = new Date(timerStartedAtISO).getTime();
                const diffSeconds = Math.floor((now - start) / 1000);
                const totalElapsed = elapsedSeconds + diffSeconds;

                setActiveTimer(totalElapsed);

                // Check for completion target
                const activeBlock = currentSchedule.find((b) => b.id === activeBlockId);
                if (activeBlock) {
                    let targetMins = 30; // default
                    if (activeBlock.type === "activity") {
                        const act = activities.find((a) => a.id === activeBlock.activity_id);
                        if (act) targetMins = act.target_duration;
                    } else if (activeBlock.type === "break") targetMins = 15;

                    const targetSecs = targetMins * 60;
                    if (totalElapsed === targetSecs) {
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
        currentSchedule,
        activities,
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

        // RPG Logic
        const gainedExp = Math.round(loggedDuration * (focusScore / 3));
        addExp(gainedExp);

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
        setShowConfetti // Exported just in case
    };
}
