import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { refineActivitiesOffline } from '@/lib/ai/fallback';
import { extractJsonPayload, hasChroniqAiKey, normalizeAiActivities, readAiText, retryChroniqAi, withAiTimeout } from '@/lib/ai/robust';
import { Activity } from '@/types';

// Initialize the Chroniq AI provider SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    let fallbackActivities: Activity[] = [];

    try {
        const { activities } = await req.json();
        fallbackActivities = Array.isArray(activities) ? activities as Activity[] : [];

        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            return NextResponse.json({ error: 'Missing or empty activities array.' }, { status: 400 });
        }

        if (!hasChroniqAiKey()) {
            return NextResponse.json({ refinedActivities: refineActivitiesOffline(activities as Activity[]), mode: "offline" });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,        // Very deterministic — this is a classification/correction task
                maxOutputTokens: 1500,  // Refine output matches input count (+ potential splits)
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            id: { type: SchemaType.STRING },
                            user_id: { type: SchemaType.STRING },
                            name: {
                                type: SchemaType.STRING,
                                description: "Nama tugas yang spesifik dan jelas (B. Indonesia)"
                            },
                            target_duration: {
                                type: SchemaType.INTEGER,
                                description: "Durasi dalam menit, maks 90 menit per tugas. Jika aslinya lebih, pecah menjadi beberapa array object berturutan."
                            },
                            priority: {
                                type: SchemaType.INTEGER,
                                description: "1-5. Koreksi berdasarkan kategori kognitifnya. (Misal: 'Balas Email' max 3, 'Belajar/Coding' minimal 4)."
                            },
                            category: {
                                type: SchemaType.STRING,
                                description: "Hanya gunakan salah satu dari: 'Fokus Tinggi (Analitis)', 'Kreativitas (Desain/Nulis)', 'Tugas Ringan (Email/Kord)', 'Fisik (Beres-beres)', 'Belajar/Membaca', 'Ad-Hoc (Dadakan)'"
                            },
                            preferred_start: {
                                type: SchemaType.STRING,
                                description: "Format HH:mm. Opsional! Isikan HANYA JIKA tugas ini secara logika manusia HARUS dilakukan di pagi/siang/malam hari (Misal: 'Mandi Pagi' -> 06:00, 'Makan Siang' -> 12:30). Jangan asal isi jika tidak relevan.",
                                nullable: true
                            }
                        },
                        required: ["id", "user_id", "name", "target_duration", "priority", "category"]
                    }
                }
            }
        });

        const prompt = `
Anda adalah Chroniq AI, Asisten Produktivitas Bawah Sadar.
Tugas Anda: Membaca mentahan To-Do List yang diketik User secara buru-buru, lalu "Merapikan, Memecah, dan Mengkoreksi" agar sesuai standar algoritma penjadwalan.

Aturan Wajib:
1. Jika ada tugas dengan target_duration > 90 menit, PECAH tugas tersebut menjadi beberapa object dalam array (misal: "Coding Part 1" (60m) dan "Coding Part 2" (60m)). Gunakan suffix 'part1', 'part2' pada ID-nya.
2. CIRCADIAN GATEKEEPER (Penting!): Anda adalah penjaga aliran energi.
   - Jika kategori tugas adalah 'Tugas Ringan (Email/Kord)', 'Fisik (Beres-beres)', atau 'Ad-Hoc (Dadakan)' -> MAKSIMALKAN priority di angka 3. Jangan pernah beri nilai 4 atau 5 untuk tugas receh, meskipun user menaruhnya di 5. Ini menjaga agar Engine tidak membuang Peak Energy untuk tugas receh.
   - Jika kategori tugas adalah 'Fokus Tinggi (Analitis)', 'Belajar/Membaca' -> MINIMALKAN priority di angka 4. Jangan biarkan user menaruh tugas mikir berat di priority 1 atau 2, karena Engine akan menaruhnya di zona ngantuk/Low Energy.
3. Koreksi KATEGORI yang salah. Misal user menulis "Sapu rumah" tapi kategorinya "Fokus Tinggi", ubah menjadi "Fisik (Beres-beres)".
4. SUSUNAN KRONOLOGIS (Sangat Penting!): Evaluasi nama tugas berdasarkan logika manusia sehari-hari. Jika tugas mensyaratkan waktu tertentu (contoh: "Sarapan", "Mandi Pagi", "Olahraga Pagi", "Tidur Siang"), ANDA WAJIB mengisi field 'preferred_start' (contoh: "07:00", "06:30"). Biarkan kosong/null untuk tugas yang bebas dikerjakan kapan saja.
5. Kembalikan array berisi seluruh aktivitas (baik yang dipecah maupun yang tidak, pastikan tidak ada yang hilang).
6. OUTPUT HARUS BERUPA ARRAY JSON STRICT.

Input Mentah User:
${JSON.stringify(activities, null, 2)}
`;

        const textResponse = await retryChroniqAi(async () => {
            const result = await withAiTimeout(model.generateContent(prompt), "Chroniq AI refine");
            return readAiText(result, "Chroniq AI refine");
        }, "Chroniq AI refine");

        try {
            const parsedArray = extractJsonPayload<unknown[]>(textResponse, "array");
            if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
                throw new Error("AI returned empty or non-array JSON");
            }
            const normalized = refineActivitiesOffline(normalizeAiActivities(parsedArray, fallbackActivities));
            return NextResponse.json({ refinedActivities: normalized });
        } catch (parseError) {
            console.warn("Chroniq AI refine returned invalid JSON, using local refine:", parseError);
            return NextResponse.json({
                refinedActivities: refineActivitiesOffline(fallbackActivities),
                mode: "offline-fallback",
                warning: "Chroniq AI sedang memakai mode refine lokal."
            });
        }

    } catch (error: unknown) {
        console.warn('AI Refine fell back to offline mode:', error);
        if (fallbackActivities.length === 0) {
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
        }
        return NextResponse.json({
            refinedActivities: refineActivitiesOffline(fallbackActivities),
            mode: "offline-fallback",
            warning: "Chroniq AI sedang memakai mode refine lokal."
        });
    }
}
