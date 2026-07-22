import { NextResponse } from 'next/server';
import { splitTaskOffline } from '@/lib/ai/fallback';
import { generateChroniqAiText } from '@/lib/ai/groq';
import { extractJsonPayload, hasChroniqAiKey, normalizeAiSubtasks, retryChroniqAi } from '@/lib/ai/robust';

/**
 * AI Task Splitter — Chroniq Engine
 *
 * Breaks large tasks into micro-steps to prevent Cognitive Overload.
 * Research basis:
 * - Cognitive Load Theory (Sweller, 1988): chunk tasks into manageable pieces
 * - Basic Rest-Activity Cycle (Kleitman, 1982): max 90 min per sub-task
 * - Goal Setting Theory (Locke & Latham, 1990): specific sub-goals increase motivation
 * - Implementation Intentions (Gollwitzer, 1999): "what first?" reduces procrastination
 */
export async function POST(req: Request) {
    let fallbackTaskName = "";
    let fallbackTargetDuration = 0;

    try {
        const { taskName, targetDuration, category } = await req.json();
        fallbackTaskName = typeof taskName === "string" ? taskName : "";
        fallbackTargetDuration = Number(targetDuration);

        if (!taskName || !targetDuration) {
            return NextResponse.json({ error: 'Missing task parameters.' }, { status: 400 });
        }

        if (!hasChroniqAiKey()) {
            return NextResponse.json({ subtasks: splitTaskOffline(taskName, Number(targetDuration)), mode: "offline" });
        }

        const prompt = `
Kamu adalah Chroniq AI Task Architect — spesialis dalam memecah tugas besar menjadi langkah-langkah yang mudah dimulai dan diselesaikan.

TUGAS YANG AKAN DIPECAH:
- Nama: "${taskName}"
- Total waktu tersedia: ${targetDuration} menit
- Kategori: ${category || 'Tidak diketahui'}

PRINSIP PEMECAHAN (WAJIB):
1. **SPECIFICITY**: Setiap sub-tugas harus memiliki output yang jelas dan terverifikasi. User harus bisa menjawab "ya saya sudah selesai" dengan pasti.
2. **BRAC COMPLIANCE**: Tidak ada sub-tugas yang melebihi 90 menit. Ini berdasarkan Basic Rest-Activity Cycle research.
3. **PROGRESSIVE DIFFICULTY**: Mulai dari sub-tugas yang paling mudah/warm-up. Build momentum. Jangan langsung lempar yang paling berat.
4. **IMPLEMENTATION INTENTION**: Setiap sub-tugas harus jelas "apa yang dilakukan pertama kali" (reduces procrastination).
5. **TOTAL DURATION**: Jumlah semua duration harus ≈ ${targetDuration} menit. Boleh lebih/kurang 10 menit.
6. **JUMLAH SUB-TUGAS**: Minimum 2, maksimum 6. Jangan terlalu granular (< 10 menit) atau terlalu besar (> 90 menit).
7. **TIP YANG BERGUNA**: Setiap tip harus SPESIFIK untuk sub-tugas itu, bukan generic "fokus ya!".

Kembalikan JSON object valid dengan bentuk:
{ "subtasks": [{ "name": "...", "duration": 30, "tip": "..." }] }
`;

        const textResponse = await retryChroniqAi(async () => {
            return generateChroniqAiText({
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                maxTokens: 1024,
                jsonMode: true,
            });
        }, "Chroniq AI split");

        try {
            const parsedObject = extractJsonPayload<{ subtasks?: unknown[] } | unknown[]>(textResponse, "object");
            const parsedArray = Array.isArray(parsedObject) ? parsedObject : parsedObject.subtasks;
            if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
                throw new Error("AI returned empty or non-array JSON");
            }
            return NextResponse.json({
                subtasks: normalizeAiSubtasks(parsedArray, fallbackTaskName, fallbackTargetDuration)
            });
        } catch (parseError) {
            console.warn("Chroniq AI split returned invalid JSON, using local split:", parseError);
            return NextResponse.json({
                subtasks: splitTaskOffline(fallbackTaskName, fallbackTargetDuration),
                mode: "offline-fallback",
                warning: "Chroniq AI sedang memakai mode split lokal."
            });
        }

    } catch (error: unknown) {
        console.warn('AI Split fell back to offline mode:', error);
        if (!fallbackTaskName || !fallbackTargetDuration) {
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
        }
        return NextResponse.json({
            subtasks: splitTaskOffline(fallbackTaskName, fallbackTargetDuration),
            mode: "offline-fallback",
            warning: "Chroniq AI sedang memakai mode split lokal."
        });
    }
}
