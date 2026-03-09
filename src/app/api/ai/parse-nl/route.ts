import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid text input.' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: {
                                type: SchemaType.STRING,
                                description: "Nama tugas yang spesifik dan konkrit (Bahasa Indonesia)"
                            },
                            target_duration: {
                                type: SchemaType.INTEGER,
                                description: "Estimasi durasi waktu yang logis dalam menit. Jika tidak disebutkan, tebak durasi umum yang wajar."
                            },
                            priority: {
                                type: SchemaType.INTEGER,
                                description: "Angka 1-5. Tingkat prioritas (1: Rendah, 5: Sangat Tinggi/Kritis). Tebak dari nada atau kata kunci."
                            },
                            category: {
                                type: SchemaType.STRING,
                                description: "Pilih salah satu paling cocok: 'Fokus Tinggi (Analitis)', 'Kreativitas (Desain/Nulis)', 'Tugas Ringan (Email/Kord)', 'Fisik (Beres-beres)', 'Belajar/Membaca', 'Ad-Hoc (Dadakan)'. Default: 'Ad-Hoc (Dadakan)'"
                            },
                            preferred_start: {
                                type: SchemaType.STRING,
                                description: "Opsional. Jika user menyebutkan jam/waktu spesifik (misal 'jam 2 siang', '14:30'), gunakan format 24-jam 'HH:mm' (misal '14:00'). Kosongkan jika tidak ada permintaan waktu khusus."
                            }
                        },
                        required: ["name", "target_duration", "priority", "category"]
                    }
                }
            }
        });

        const prompt = `
Anda adalah Chroniq AI, asisten NLP yang membaca input bahasa alami user.
Tugas Anda: Ekstrak informasi menjadi array berisikan objek tugas yang berstruktur.

Aturan Wajib:
1. Jika kata-kata user menyiratkan beberapa tugas (misal: "mandi, sarapan lalu ngerjain laporan"), kembalikan lebih dari 1 objek di dalam array.
2. Jika tidak ada durasi secara eksplisit, BERIKAN estimasi durasi terbaik yang wajar dalam menit. (Misal: ujian/belajar berat = 60-120 menit).
3. Tetapkan 'priority' berdasarkan urgensi yang tersirat (misal "ujian", "segera" = priority 5).
4. Jika user menyebut "tugas sementara", "sisipan", "dadakan", atau mirip, set category menjadi 'Ad-Hoc (Dadakan)'.
5. KUNCI WAKTU (High Smart Logic): Jika user meminta serangkaian tugas dimulai pada JAM TERTENTU (misal: "belajar A, B, C mulai jam 14:30"), JANGAN MENCOBA MENGHITUNG WAKTU SATU PERSATU. Cukup isi 'preferred_start' dengan "14:30" (format 24-jam) PADA KETIGA TUGAS TERSEBUT. Mesin akan otomatis mengurutkannya.
   Contoh:
   - Tugas A -> preferred_start: "14:30"
   - Tugas B -> preferred_start: "14:30"
   - Tugas C -> preferred_start: "14:30"
6. Kembalikan array JSON solid sesuai Schema yang diberikan.

Input dari user:
"${text}"
`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        try {
            const parsedArray = JSON.parse(textResponse);
            return NextResponse.json({ activities: parsedArray });
        } catch {
            return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('AI NLP Parse Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
