import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    try {
        const { taskName, targetDuration, category } = await req.json();

        if (!taskName || !targetDuration) {
            return NextResponse.json({ error: 'Missing task parameters.' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,        // Lower = more deterministic + faster for structured output
                maxOutputTokens: 1024,   // Split output is short; cap to avoid runaway generation
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: {
                                type: SchemaType.STRING,
                                description: "Nama sub-tugas yang spesifik, actionable, dan konkrit dalam Bahasa Indonesia. Harus berbentuk kata kerja + objek. Contoh BAIK: 'Baca dan pahami intro bab 3', 'Tulis outline poin utama'. Contoh BURUK: 'Bagian 1', 'Sub-task A'."
                            },
                            duration: {
                                type: SchemaType.INTEGER,
                                description: `Durasi sub-tugas dalam menit. BATAS ATAS: 90 menit. Batas bawah: 10 menit. Pilih: 15, 20, 25, 30, 45, 60, atau 90. Total semua sub-tugas ≈ ${targetDuration} menit.`
                            },
                            tip: {
                                type: SchemaType.STRING,
                                description: "Satu kalimat tips pendek tentang cara terbaik mengerjakan sub-tugas ini. Spesifik, praktis, bukan platitude. Contoh: 'Matikan notifikasi HP untuk sesi ini', 'Baca aktif sambil coret poin penting', 'Set timer Pomodoro 25 menit'."
                            }
                        },
                        required: ["name", "duration", "tip"]
                    }
                }
            }
        });

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

Kembalikan JSON array yang valid.
`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        try {
            const parsedArray = JSON.parse(textResponse);
            return NextResponse.json({ subtasks: parsedArray });
        } catch {
            const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return NextResponse.json({ subtasks: JSON.parse(jsonMatch[0]) });
            }
            return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('AI Split Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
