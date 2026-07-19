import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * AI Natural Language Parser — Chroniq Engine
 *
 * Converts free-form Indonesian text into structured Activity objects.
 * Research basis:
 * - Cognitive Load Theory (Sweller, 1988): minimize friction at task input
 * - Implementation Intentions (Gollwitzer, 1999): capture when/where details if mentioned
 * - Parkinson's Law: cap durations to prevent scope creep
 */
export async function POST(req: Request) {
    try {
        const { text, userContext } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid text input.' }, { status: 400 });
        }

        // Inject user's wake time for smarter time anchoring
        const wakeTime = userContext?.wakeUpTime || '07:00';
        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'pagi' : currentHour < 15 ? 'siang' : currentHour < 18 ? 'sore' : 'malam';

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,       // Deterministic structured output, no creativity needed
                maxOutputTokens: 512,  // 5 task objects max ≈ 200-300 tokens; cap for safety
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: {
                                type: SchemaType.STRING,
                                description: "Nama tugas yang spesifik, actionable, dan konkrit (Bahasa Indonesia). Bukan generik. Contoh BAIK: 'Review bab 3 Statistik', 'Balas email klien Andi'. Contoh BURUK: 'Belajar', 'Kerja'."
                            },
                            target_duration: {
                                type: SchemaType.INTEGER,
                                description: "Estimasi durasi realistis dalam menit. Batas MAKSIMAL per satu tugas adalah 90 menit (ultradian cycle). Jika user menyebut durasi > 90 menit, kembalikan sebagai task terpisah. Jika tidak disebutkan, tebak berdasarkan jenis tugas: email = 15-20, belajar materi = 45-60, presentasi/laporan = 60-90, olahraga = 30-45."
                            },
                            priority: {
                                type: SchemaType.INTEGER,
                                description: "Angka 1-5. Deteksi dari kata kunci: 'urgent/deadline/mati-matian/besok ujian' = 5, 'penting' = 4, 'biasa' = 3, 'nanti/kalau sempat' = 2, 'opsional' = 1. Tebak dari konteks jika tidak disebut."
                            },
                            category: {
                                type: SchemaType.STRING,
                                description: "Pilih SATU yang paling sesuai: 'Fokus Tinggi (Analitis)' untuk coding/matematika/analisis, 'Kreativitas (Desain/Nulis)' untuk menulis/desain/brainstorm, 'Tugas Ringan (Email/Kord)' untuk email/admin/koordinasi, 'Fisik (Beres-beres)' untuk olahraga/bersih-bersih/memasak, 'Belajar/Membaca' untuk membaca/review materi/latihan soal, 'Ad-Hoc (Dadakan)' untuk tugas mendadak/tidak terklasifikasi."
                            },
                            preferred_start: {
                                type: SchemaType.STRING,
                                description: `OPSIONAL. Format HH:mm 24 jam. Isi HANYA jika user eksplisit menyebut waktu (mis: 'jam 2 siang'='14:00', 'malam'='19:00', 'pagi'='08:00'). User bangun jam ${wakeTime}, jadi 'pagi' relatif ke waktu bangunnya. Kosongkan jika tidak ada petunjuk waktu.`
                            }
                        },
                        required: ["name", "target_duration", "priority", "category"]
                    }
                }
            }
        });

        const prompt = `
Kamu adalah Chroniq AI Parser — mesin NLP ultra-presisi yang mengekstrak tugas dari teks bebas Bahasa Indonesia.

KONTEKS PENTING:
- Sekarang adalah waktu ${timeOfDay} (jam ${currentHour}:00)
- User bangun jam ${wakeTime}, jadi semua referensi "pagi/siang/malam" relatif ke jam bangunnya

ATURAN PARSING (WAJIB DIIKUTI):

1. **MULTI-TASK EXTRACTION**: Jika ada beberapa tugas dalam satu kalimat (kata penghubung: "terus", "lalu", "sama", "dan", "setelah itu", koma), pisahkan menjadi objek terpisah dalam array.

2. **DURASI CAP 90 MENIT**: Tidak ada tugas yang boleh > 90 menit. Jika user menyebut "belajar 3 jam", buat 2 objek: "Belajar [topik] Sesi 1" (90 menit) dan "Belajar [topik] Sesi 2" (90 menit). Ini sesuai ultradian rhythm.

3. **SPECIFICITY RULE**: Nama tugas harus actionable. Tambahkan subjek jika generik:
   - "belajar" → "Belajar [mata pelajaran yang bisa ditebak dari konteks]"
   - "nulis" → "Menulis [konten yang relevan]"
   - "kerja" → tetap "Kerja" jika tidak ada konteks lebih

4. **CHRONOLOGICAL LOGIC**: Jika tugas memiliki urutan alami manusia (mandi sebelum sarapan, sarapan sebelum kuliah), isi preferred_start yang logis berbasis jam bangun user.

5. **WAKTU RELATIF ke JAM SEKARANG**: Jika user bilang "sekarang mau X", set preferred_start ke jam saat ini (${currentHour}:00).

6. **PREFERRED_START MULTI-TASK**: Jika user bilang "mulai jam X terus Y terus Z", set preferred_start = X untuk SEMUA task tersebut. Engine akan mengatur urutan secara otomatis.

Input user:
"${text}"

Kembalikan array JSON yang valid. Jangan tambahkan teks apapun di luar JSON.
`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        try {
            const parsedArray = JSON.parse(textResponse);
            if (!Array.isArray(parsedArray)) {
                throw new Error("AI returned non-array JSON");
            }
            return NextResponse.json({ activities: parsedArray });
        } catch {
            // Attempt regex extraction as fallback
            const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return NextResponse.json({ activities: JSON.parse(jsonMatch[0]) });
            }
            return NextResponse.json({ error: 'AI did not return valid JSON array' }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('AI NLP Parse Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
