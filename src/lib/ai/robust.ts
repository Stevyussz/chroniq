import { Activity, EnergySlot } from "@/types";
import { VALID_CATEGORIES } from "./fallback";

export const AI_TIMEOUT_MS = 14_000;

const validRecurrences = ["none", "daily", "weekly", "weekdays"] as const;

export function hasChroniqAiKey() {
    return Boolean(process.env.GEMINI_API_KEY);
}

export async function withAiTimeout<T>(promise: Promise<T>, label: string, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

export async function retryChroniqAi<T>(operation: () => Promise<T>, label: string, retries = 1): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                console.warn(`${label} attempt ${attempt + 1} failed, retrying once:`, error);
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

export function readAiText(result: { response: { text: () => string } }, label: string) {
    const text = result.response.text().trim();
    if (!text) throw new Error(`${label} returned an empty response`);
    return text;
}

export function extractJsonPayload<T>(rawText: string, kind: "array" | "object"): T {
    const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch {
        const startToken = kind === "array" ? "[" : "{";
        const endToken = kind === "array" ? "]" : "}";
        const start = cleaned.indexOf(startToken);
        const end = cleaned.lastIndexOf(endToken);

        if (start === -1 || end === -1 || end <= start) {
            throw new Error(`Chroniq AI response did not contain a JSON ${kind}`);
        }

        return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
}

const clampPriority = (priority: unknown): 1 | 2 | 3 | 4 | 5 => {
    const value = typeof priority === "number" ? priority : Number(priority);
    const normalized = Math.round(Number.isFinite(value) ? value : 3);
    return Math.min(5, Math.max(1, normalized)) as 1 | 2 | 3 | 4 | 5;
};

const clampDuration = (duration: unknown): number => {
    const value = typeof duration === "number" ? duration : Number(duration);
    const normalized = Math.round(Number.isFinite(value) ? value : 30);
    return Math.min(480, Math.max(5, normalized));
};

const normalizeCategory = (category: unknown): string => {
    if (typeof category === "string" && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
        return category;
    }
    return "Ad-Hoc (Dadakan)";
};

const normalizeTime = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : undefined;
};

const normalizeDate = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const normalizeRecurrence = (value: unknown): Activity["recurrence"] => {
    return typeof value === "string" && validRecurrences.includes(value as typeof validRecurrences[number])
        ? value as Activity["recurrence"]
        : "none";
};

export function normalizeAiActivities(items: unknown[], source: Activity[] = []): Activity[] {
    return items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item, index) => {
            const sourceActivity = source[index];
            const name = typeof item.name === "string" && item.name.trim()
                ? item.name.trim()
                : sourceActivity?.name || "Tugas Baru";

            return {
                id: typeof item.id === "string" && item.id.trim() ? item.id : sourceActivity?.id || `ai-${Date.now()}-${index}`,
                user_id: typeof item.user_id === "string" && item.user_id.trim() ? item.user_id : sourceActivity?.user_id || "u1",
                name,
                target_duration: clampDuration(item.target_duration ?? item.duration ?? sourceActivity?.target_duration),
                priority: clampPriority(item.priority ?? sourceActivity?.priority),
                category: normalizeCategory(item.category ?? sourceActivity?.category),
                recurrence: normalizeRecurrence(item.recurrence ?? sourceActivity?.recurrence),
                ...(normalizeTime(item.preferred_start ?? sourceActivity?.preferred_start) && {
                    preferred_start: normalizeTime(item.preferred_start ?? sourceActivity?.preferred_start),
                }),
                ...(normalizeDate(item.deadline ?? sourceActivity?.deadline) && {
                    deadline: normalizeDate(item.deadline ?? sourceActivity?.deadline),
                }),
                ...(sourceActivity?.is_completed !== undefined && { is_completed: sourceActivity.is_completed }),
                ...(sourceActivity?.date_added && { date_added: sourceActivity.date_added }),
            };
        });
}

export function normalizeAiSubtasks(items: unknown[], fallbackTaskName: string, fallbackDuration: number) {
    const normalized = items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item, index) => ({
            name: typeof item.name === "string" && item.name.trim()
                ? item.name.trim()
                : `${fallbackTaskName} - Fokus ${index + 1}`,
            duration: clampDuration(item.duration),
            tip: typeof item.tip === "string" && item.tip.trim()
                ? item.tip.trim()
                : "Mulai dari bagian paling jelas, lalu lanjutkan dengan timer fokus pendek.",
        }))
        .filter((item) => item.duration > 0);

    if (normalized.length === 0 && fallbackTaskName) {
        return [{
            name: `${fallbackTaskName} - Fokus 1`,
            duration: Math.min(60, clampDuration(fallbackDuration)),
            tip: "Mulai dari bagian termudah supaya momentum cepat naik.",
        }];
    }

    return normalized;
}

export function normalizeEnergySlots(items: unknown[], fallback: EnergySlot[] = []): EnergySlot[] {
    const normalized = items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item, index) => {
            const level = item.energy_level === "peak" || item.energy_level === "medium" || item.energy_level === "low"
                ? item.energy_level
                : fallback[index]?.energy_level;
            const start = normalizeTime(item.start_time ?? fallback[index]?.start_time);
            const end = normalizeTime(item.end_time ?? fallback[index]?.end_time);

            if (!level || !start || !end) return null;

            return {
                id: typeof item.id === "string" && item.id.trim() ? item.id : fallback[index]?.id || `energy-${index + 1}`,
                user_id: typeof item.user_id === "string" && item.user_id.trim() ? item.user_id : fallback[index]?.user_id || "u1",
                start_time: start,
                end_time: end,
                energy_level: level,
            } satisfies EnergySlot;
        })
        .filter((item): item is EnergySlot => Boolean(item));

    return normalized.length === 3 ? normalized : [];
}

export function normalizeReflectionPayload(payload: unknown, fallbackSlots: EnergySlot[]) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Chroniq AI reflection payload is not an object");
    }

    const data = payload as Record<string, unknown>;
    const reflectionText = typeof data.reflectionText === "string" && data.reflectionText.trim()
        ? data.reflectionText.trim()
        : "Chroniq AI sudah membaca datamu, tapi insight paling kuat belum cukup stabil. Lanjutkan beberapa sesi lagi agar pola fokusmu makin jelas.";

    return {
        reflectionText,
        mainInsight: typeof data.mainInsight === "string" && data.mainInsight.trim()
            ? data.mainInsight.trim()
            : "Pola produktivitasmu sedang dibentuk dari data eksekusi terbaru.",
        actionableTip: typeof data.actionableTip === "string" && data.actionableTip.trim()
            ? data.actionableTip.trim()
            : "Pilih satu tugas prioritas tinggi dan letakkan di zona energi terbaik besok.",
        moodLabel: typeof data.moodLabel === "string" && data.moodLabel.trim()
            ? data.moodLabel.trim()
            : "Sedang membangun ritme",
        suggestedEnergySlots: Array.isArray(data.suggestedEnergySlots)
            ? normalizeEnergySlots(data.suggestedEnergySlots, fallbackSlots)
            : [],
    };
}
