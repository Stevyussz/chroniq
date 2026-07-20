import { Activity, EnergySlot, ExecutionLog } from "@/types";

export const VALID_CATEGORIES = [
    "Fokus Tinggi (Analitis)",
    "Kreativitas (Desain/Nulis)",
    "Tugas Ringan (Email/Kord)",
    "Fisik (Beres-beres)",
    "Belajar/Membaca",
    "Ad-Hoc (Dadakan)",
] as const;

type ValidCategory = typeof VALID_CATEGORIES[number];

const clampPriority = (priority?: number): 1 | 2 | 3 | 4 | 5 => {
    const normalized = Math.round(Number.isFinite(priority) ? Number(priority) : 3);
    return Math.min(5, Math.max(1, normalized)) as 1 | 2 | 3 | 4 | 5;
};

const clampDuration = (duration?: number): number => {
    const normalized = Math.round(Number.isFinite(duration) ? Number(duration) : 30);
    return Math.min(480, Math.max(5, normalized));
};

const normalizeCategory = (raw?: string): ValidCategory => {
    if (raw && VALID_CATEGORIES.includes(raw as ValidCategory)) return raw as ValidCategory;
    return "Ad-Hoc (Dadakan)";
};

export function inferCategory(text: string): ValidCategory {
    const lower = text.toLowerCase();
    if (/(coding|program|matematika|analisis|debug|riset|skripsi|ta|laporan)/.test(lower)) return "Fokus Tinggi (Analitis)";
    if (/(desain|design|nulis|menulis|konten|presentasi|slide|poster|video)/.test(lower)) return "Kreativitas (Desain/Nulis)";
    if (/(email|chat|wa|whatsapp|koordinasi|admin|balas|meeting|rapat)/.test(lower)) return "Tugas Ringan (Email/Kord)";
    if (/(olahraga|gym|lari|bersih|beres|masak|mandi|cuci)/.test(lower)) return "Fisik (Beres-beres)";
    if (/(belajar|baca|membaca|review|ujian|quiz|materi|latihan soal)/.test(lower)) return "Belajar/Membaca";
    return "Ad-Hoc (Dadakan)";
}

export function inferPriority(text: string, category = inferCategory(text)): 1 | 2 | 3 | 4 | 5 {
    const lower = text.toLowerCase();
    if (/(urgent|mendesak|deadline|besok|hari ini|ujian|penting banget)/.test(lower)) return 5;
    if (/(penting|prioritas tinggi|serius|utama)/.test(lower)) return 4;
    if (/(nanti|kalau sempat|opsional|santai)/.test(lower)) return 2;
    if (category === "Fokus Tinggi (Analitis)" || category === "Belajar/Membaca") return 4;
    if (category === "Tugas Ringan (Email/Kord)" || category === "Fisik (Beres-beres)") return 3;
    return 3;
}

export function inferDuration(text: string): number {
    const lower = text.toLowerCase();
    const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(jam|j\b|hours?)/);
    if (hourMatch) return clampDuration(Math.round(Number(hourMatch[1].replace(",", ".")) * 60));

    const minuteMatch = lower.match(/(\d+)\s*(menit|mnt|min|minutes?)/);
    if (minuteMatch) return clampDuration(Number(minuteMatch[1]));

    const category = inferCategory(text);
    if (category === "Tugas Ringan (Email/Kord)") return 20;
    if (category === "Fisik (Beres-beres)") return 35;
    if (category === "Belajar/Membaca") return 60;
    if (category === "Fokus Tinggi (Analitis)") return 75;
    if (category === "Kreativitas (Desain/Nulis)") return 60;
    return 30;
}

export function inferPreferredStart(text: string): string | undefined {
    const lower = text.toLowerCase();
    const exact = lower.match(/(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?/);
    if (exact) {
        let hour = Number(exact[1]);
        const minute = exact[2] ? Number(exact[2]) : 0;
        const period = exact[3];
        if ((period === "siang" || period === "sore" || period === "malam") && hour < 12) hour += 12;
        if (period === "pagi" && hour === 12) hour = 0;
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        }
    }

    if (/\bpagi\b/.test(lower)) return "08:00";
    if (/\bsiang\b/.test(lower)) return "12:30";
    if (/\bsore\b/.test(lower)) return "16:00";
    if (/\bmalam\b/.test(lower)) return "19:00";
    return undefined;
}

export function splitOversizedActivity(activity: Activity): Activity[] {
    const duration = clampDuration(activity.target_duration);
    if (duration <= 90) return [{ ...activity, target_duration: duration, priority: clampPriority(activity.priority), category: normalizeCategory(activity.category) }];

    const chunks = Math.ceil(duration / 90);
    return Array.from({ length: chunks }, (_, index) => {
        const remaining = duration - (index * 90);
        return {
            ...activity,
            id: `${activity.id}-part${index + 1}`,
            name: `${activity.name} Sesi ${index + 1}`,
            target_duration: Math.min(90, remaining),
            priority: clampPriority(activity.priority),
            category: normalizeCategory(activity.category),
        };
    });
}

export function parseTasksOffline(text: string): Partial<Activity>[] {
    const parts = text
        .split(/\n|,|;|\b(?:lalu|terus|setelah itu|sama|dan)\b/gi)
        .map((part) => part.trim())
        .filter(Boolean);

    const sourceParts = parts.length > 0 ? parts : [text.trim()];

    return sourceParts.flatMap((part, index) => {
        const category = inferCategory(part);
        const priority = inferPriority(part, category);
        const duration = inferDuration(part);
        const preferred_start = inferPreferredStart(part);

        const baseActivity: Activity = {
            id: `offline-${Date.now()}-${index}`,
            user_id: "u1",
            name: part.replace(/\s+/g, " ").slice(0, 80),
            target_duration: duration,
            priority,
            category,
            ...(preferred_start && { preferred_start }),
        };

        return splitOversizedActivity(baseActivity);
    });
}

export function refineActivitiesOffline(activities: Activity[]): Activity[] {
    return activities.flatMap((activity) => {
        const inferredCategory = inferCategory(activity.name);
        const category = normalizeCategory(activity.category === "Ad-Hoc (Dadakan)" ? inferredCategory : activity.category);
        let priority = clampPriority(activity.priority);

        if (category === "Tugas Ringan (Email/Kord)" || category === "Fisik (Beres-beres)" || category === "Ad-Hoc (Dadakan)") {
            priority = Math.min(priority, 3) as 1 | 2 | 3;
        }
        if (category === "Fokus Tinggi (Analitis)" || category === "Belajar/Membaca") {
            priority = Math.max(priority, 4) as 4 | 5;
        }

        return splitOversizedActivity({
            ...activity,
            name: activity.name.trim() || "Tugas Baru",
            target_duration: clampDuration(activity.target_duration),
            priority,
            category,
            preferred_start: activity.preferred_start || inferPreferredStart(activity.name),
        });
    });
}

export function splitTaskOffline(taskName: string, targetDuration: number) {
    const total = clampDuration(targetDuration);
    const chunks = Math.max(2, Math.ceil(total / 60));
    return Array.from({ length: chunks }, (_, index) => {
        const remaining = total - (index * 60);
        return {
            name: `${taskName} - Fokus ${index + 1}`,
            duration: Math.min(60, remaining),
            tip: index === 0
                ? "Mulai dari bagian termudah supaya momentum cepat naik."
                : "Tutup distraksi dan lanjutkan dari output sesi sebelumnya.",
        };
    });
}

export function buildOfflineReflection(logs: ExecutionLog[], energySlots: EnergySlot[]) {
    const completed = logs.filter((log) => log.status === "complete");
    const skipped = logs.filter((log) => log.status === "skip");
    const avgFocus = completed.length
        ? completed.reduce((sum, log) => sum + log.focus_score, 0) / completed.length
        : 0;
    const avgDistraction = completed.length
        ? completed.reduce((sum, log) => sum + log.distraction_count, 0) / completed.length
        : 0;

    const reflectionText = completed.length === 0
        ? "Data eksekusimu belum cukup banyak, tapi sistem sudah siap membaca polanya. Mulai dari satu blok fokus hari ini, lalu isi evaluasi singkat setelah selesai."
        : `Minggu ini kamu menyelesaikan ${completed.length} sesi dan melewati ${skipped.length} sesi. Rata-rata fokusmu ${avgFocus.toFixed(1)}/5, dengan rata-rata distraksi ${avgDistraction.toFixed(1)} per sesi.\n\nData ini menunjukkan pola awal yang bisa dipakai untuk tuning jadwal. Untuk minggu depan, jaga tugas prioritas tinggi tetap berada di jam energi terbaik dan gunakan Zen Mode pada sesi yang rawan terdistraksi.`;

    return {
        reflectionText,
        mainInsight: avgFocus >= 4 ? "Kualitas fokusmu sedang kuat." : "Fokusmu masih bisa ditingkatkan lewat blok yang lebih pendek dan minim distraksi.",
        actionableTip: "Pilih satu tugas paling penting besok, letakkan di zona Peak, lalu kerjakan dengan timer 45-60 menit.",
        moodLabel: avgFocus >= 4 ? "Stabil dan konsisten" : "Sedang membangun ritme",
        suggestedEnergySlots: energySlots.length === 3 ? [] : energySlots,
    };
}
