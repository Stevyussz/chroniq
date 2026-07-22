import { NextResponse } from 'next/server';
import { parseTasksOffline, refineActivitiesOffline } from '@/lib/ai/fallback';
import { generateChroniqAiText } from '@/lib/ai/groq';
import { extractJsonPayload, hasChroniqAiKey, normalizeAiActivities, retryChroniqAi } from '@/lib/ai/robust';

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
    let fallbackText = "";

    const normalizeParsedActivities = (items: unknown[]) => {
        return refineActivitiesOffline(normalizeAiActivities(items));
    };

    try {
        const { text, userContext } = await req.json();
        fallbackText = typeof text === "string" ? text : "";

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid text input.' }, { status: 400 });
        }

        if (!hasChroniqAiKey()) {
            return NextResponse.json({ activities: normalizeParsedActivities(parseTasksOffline(text)), mode: "offline" });
        }

        // Inject user's wake time for smarter time anchoring
        const wakeTime = userContext?.wakeUpTime || '07:00';
        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'pagi' : currentHour < 15 ? 'siang' : currentHour < 18 ? 'sore' : 'malam';

        const todayISO = new Date().toISOString().split('T')[0];
        const prompt = `
Kamu adalah Chroniq AI Parser — mesin NLP ultra-presisi yang mengekstrak tugas dari teks bebas Bahasa Indonesia.

KONTEKS PENTING:
- Sekarang adalah waktu ${timeOfDay} (jam ${currentHour}:00)
- User bangun jam ${wakeTime}, jadi semua referensi "pagi/siang/malam" relatif ke jam bangunnya
- Tanggal hari ini: ${todayISO}

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

7. **RECURRENCE DETECTION**: Deteksi pola pengulangan dari kata kunci:
   - "tiap hari/setiap hari/rutin/daily" → recurrence: "daily"
   - "hari kerja/senin-jumat/weekday" → recurrence: "weekdays"
   - "tiap minggu/setiap minggu/weekly" → recurrence: "weekly"
   - Tidak ada kata kunci → recurrence: "none"

8. **DEADLINE DETECTION**: Hitung dari tanggal hari ini (${todayISO}):
   - "besok" → esok hari YYYY-MM-DD
   - "lusa" → dua hari dari sekarang
   - nama hari ("jumat", "senin", dst) → hari tersebut di minggu ini atau depan jika sudah lewat
   - "deadline [tgl]/dikumpul [tgl]/kumpul [tgl]" → parse tanggalnya
   - Tidak ada → JANGAN isi field deadline

9. **SCHEDULED DATE**: Jika user menyebut kapan tugas ingin DIKERJAKAN (besok, lusa, senin, minggu depan, selama 1 bulan), isi "scheduled_date" dengan YYYY-MM-DD. Jika hanya menyebut deadline, isi deadline dan pilih scheduled_date beberapa hari sebelum deadline bila memungkinkan. Jangan isi scheduled_date jika tugas bisa dikerjakan hari ini.

Input user:
"${text}"

Kembalikan JSON object valid dengan bentuk:
{
  "activities": [
    {
      "name": "Nama tugas spesifik",
      "target_duration": 30,
      "priority": 3,
      "category": "Ad-Hoc (Dadakan)",
      "preferred_start": "HH:mm atau kosongkan",
      "recurrence": "none",
      "scheduled_date": "YYYY-MM-DD atau kosongkan",
      "deadline": "YYYY-MM-DD atau kosongkan"
    }
  ]
}
Jangan tambahkan teks apapun di luar JSON.
`;

        const textResponse = await retryChroniqAi(async () => {
            return generateChroniqAiText({
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                maxTokens: 1500,
                jsonMode: true,
            });
        }, "Chroniq AI parser");

        try {
            const parsedObject = extractJsonPayload<{ activities?: unknown[] } | unknown[]>(textResponse, "object");
            const parsedArray = Array.isArray(parsedObject) ? parsedObject : parsedObject.activities;
            if (!Array.isArray(parsedArray)) {
                throw new Error("AI returned non-array JSON");
            }
            return NextResponse.json({ activities: normalizeParsedActivities(parsedArray) });
        } catch (parseError) {
            console.warn("Chroniq AI parser returned invalid JSON, using local parser:", parseError);
            return NextResponse.json({
                activities: normalizeParsedActivities(parseTasksOffline(text)),
                mode: "offline-fallback",
                warning: "Chroniq AI sedang memakai mode parser lokal."
            });
        }

    } catch (error: unknown) {
        console.warn('AI NLP Parse fell back to offline mode:', error);
        if (!fallbackText) {
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
        }
        return NextResponse.json({
            activities: normalizeParsedActivities(parseTasksOffline(fallbackText)),
            mode: "offline-fallback",
            warning: "Chroniq AI sedang memakai mode parser lokal."
        });
    }
}
