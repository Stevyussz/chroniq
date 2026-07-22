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

export function inferDeadline(text: string): string | undefined {
    const lower = text.toLowerCase();
    const today = new Date();
    const addDays = (days: number) => {
        const date = new Date(today);
        date.setDate(today.getDate() + days);
        return date.toISOString().split("T")[0];
    };

    if (/\bbesok\b/.test(lower)) return addDays(1);
    if (/\blusa\b/.test(lower)) return addDays(2);

    const dayNames: Record<string, number> = {
        minggu: 0,
        senin: 1,
        selasa: 2,
        rabu: 3,
        kamis: 4,
        jumat: 5,
        jumaat: 5,
        sabtu: 6,
    };

    const dayMatch = lower.match(/\b(minggu|senin|selasa|rabu|kamis|jumat|jumaat|sabtu)\b/);
    if (dayMatch) {
        const targetDay = dayNames[dayMatch[1]];
        const currentDay = today.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        return addDays(daysUntil);
    }

    const isoMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoMatch) return isoMatch[1];

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
        const deadline = inferDeadline(part);

        const baseActivity: Activity = {
            id: `offline-${Date.now()}-${index}`,
            user_id: "u1",
            name: part.replace(/\s+/g, " ").slice(0, 80),
            target_duration: duration,
            priority,
            category,
            ...(preferred_start && { preferred_start }),
            recurrence: "none",
            ...(deadline && { deadline }),
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
    const chunks = Math.max(1, Math.ceil(total / 60));
    const baseDuration = Math.floor(total / chunks);
    const remainder = total % chunks;

    return Array.from({ length: chunks }, (_, index) => {
        const duration = baseDuration + (index < remainder ? 1 : 0);
        return {
            name: `${taskName} - Fokus ${index + 1}`,
            duration: Math.max(5, duration),
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

export function buildOfflineCoachReply(messages: { role: string; content: string }[], context?: Record<string, unknown>) {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const lower = lastUserMessage.toLowerCase();
    const level = Number(context?.level || 1);
    const streak = Number(context?.currentStreak || 0);
    const upcomingTasks = Number(context?.upcomingTasksCount || 0);

    if (/(plan|rencana|planning|belajar|ujian|minggu|bulan|hari ke depan|kedepan)/.test(lower) && /(ujian|belajar|mapel|mata pelajaran|materi)/.test(lower)) {
        const knownSubjects = ["IPA", "IPS", "Biologi", "Kimia", "Matematika Lanjut", "Matematika", "Fisika", "Bahasa Indonesia", "Bahasa Inggris", "Sejarah", "Ekonomi", "Geografi"];
        const subjects = knownSubjects.filter((subject) => lower.includes(subject.toLowerCase()));
        const selectedSubjects = subjects.length > 0 ? subjects : ["Materi Ujian"];
        const durationDays = /bulan|1\s*bulan|30\s*hari/.test(lower) ? 30 : /minggu|7\s*hari/.test(lower) ? 7 : 14;
        const today = new Date();
        const tasks = Array.from({ length: Math.min(durationDays, 30) }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() + index);
            const dateISO = date.toISOString().split("T")[0];
            const subject = selectedSubjects[index % selectedSubjects.length];
            const cycle = index % 6;
            const focus = cycle === 0 ? "Pemetaan materi"
                : cycle === 1 ? "Active recall"
                : cycle === 2 ? "Latihan soal"
                : cycle === 3 ? "Review kesalahan"
                : cycle === 4 ? "Ringkasan konsep"
                : "Simulasi mini";

            return {
                name: `${focus} ${subject}`,
                duration: cycle === 5 ? 60 : 45,
                priority: cycle >= 2 ? 5 : 4,
                category: "Belajar/Membaca",
                scheduled_date: dateISO,
                deadline: new Date(today.getTime() + durationDays * 86400000).toISOString().split("T")[0],
            };
        });

        return `Bisa. Aku buatkan plan belajar ${durationDays} hari dengan pola spaced repetition: pahami konsep, active recall, latihan soal, review kesalahan, lalu simulasi mini. Tugas masa depan akan muncul otomatis sesuai tanggalnya, jadi tidak numpuk di timeline hari ini.

\`\`\`json
${JSON.stringify({ action: "ADD_TASKS", payload: { tasks } })}
\`\`\``;
    }

    if (/(optimasi|optimize|re-?optimize|atur ulang|susun ulang|jadwal ulang)/.test(lower)) {
        return `Siap, aku susun ulang jadwalmu dengan ritme yang lebih realistis. ${upcomingTasks > 0 ? `Ada ${upcomingTasks} blok aktif yang akan aku rapikan.` : "Kalau belum ada tugas aktif, tambahkan satu dulu ya."}

\`\`\`json
{ "action": "REOPTIMIZE", "payload": {} }
\`\`\``;
    }

    if (/(hapus|delete|buang|remove)/.test(lower)) {
        const name = lastUserMessage
            .replace(/hapus|delete|buang|remove|tugas|aktivitas/gi, "")
            .trim();

        if (name) {
            return `Oke, aku coba hapus tugas yang paling cocok dengan "${name}" dari daftar kamu.

\`\`\`json
${JSON.stringify({ action: "DELETE_TASK", payload: { name } })}
\`\`\``;
        }
    }

    if (/(tambah|add|jadwalkan|masukin|catat|buat tugas)/.test(lower)) {
        const cleanedName = lastUserMessage
            .replace(/tambah|add|jadwalkan|masukin|catat|buat tugas|tugas/gi, "")
            .replace(/\b(prioritas|priority)\s*[1-5]\b/gi, "")
            .replace(/\b\d+\s*(jam|menit|mnt|min)\b/gi, "")
            .trim() || "Tugas Baru";
        const category = inferCategory(cleanedName);
        const duration = inferDuration(lastUserMessage);
        const priority = inferPriority(lastUserMessage, category);
        const preferredStart = inferPreferredStart(lastUserMessage);
        const deadline = inferDeadline(lastUserMessage);
        const payload = {
            name: cleanedName,
            duration,
            priority,
            category,
            ...(preferredStart && { preferred_start: preferredStart }),
            ...(deadline && { deadline }),
        };

        return `Bisa. Aku tangkap ini sebagai tugas "${cleanedName}" dengan estimasi ${duration} menit dan prioritas ${priority}. Setelah masuk, engine Chroniq akan menaruhnya di slot yang paling masuk akal.

\`\`\`json
${JSON.stringify({ action: "ADD_TASK", payload })}
\`\`\``;
    }

    const streakLine = streak > 0
        ? `Streak kamu sekarang ${streak} hari, jadi fokusku adalah menjaga momentum tanpa bikin kamu cepat capek.`
        : "Kita bisa mulai dari satu blok fokus kecil dulu supaya sistemmu punya data eksekusi awal.";

    return `Aku tetap bisa bantu dari mode lokal Chroniq AI. ${streakLine}

Untuk sekarang, ceritakan satu hal yang paling mengganggu jadwalmu, atau langsung bilang "tambah tugas ..." / "susun ulang jadwal".${level >= 5 ? " Karena levelmu sudah lumayan tinggi, aku juga bisa bantu tuning ritme fokusmu lebih agresif." : ""}`;
}
