export const playZenChime = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();

        // Frequencies for a calming open chord (like a singing bowl or wind chime)
        // Cmaj9 frequencies: C5, E5, G5, B5, D6
        const frequencies = [523.25, 659.25, 783.99, 987.77, 1174.66];

        frequencies.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            const now = audioCtx.currentTime;
            // Stagger the notes slightly to sound like a gentle strike
            const startTime = now + (i * 0.1);

            gainNode.gain.setValueAtTime(0, startTime);
            // Soft attack
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            // Long exponential release (bell-like decay)
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 4);

            osc.start(startTime);
            osc.stop(startTime + 4.5);
        });
    } catch (e) {
        console.warn("Audio playback failed (usually due to lack of user interaction):", e);
    }
}

export const requestNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
}

export const sendBrowserNotification = (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon.svg" });
    }
}
