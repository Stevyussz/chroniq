import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { executionLogs, activities } = await request.json();

        if (!executionLogs || !activities) {
            return NextResponse.json({ error: 'executionLogs and activities are required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Ciptakan promp yang menugaskan AI untuk menjadi pelatih produktivitas
        const prompt = `
Anda adalah "Chroniq AI", seorang pelatih produktivitas dan keseimbangan hidup yang sangat empatik, suportif, dan analitis.
Pengguna aplikasi Anda memberikan data eksekusi (log) kegiatan mereka selama beberapa waktu terakhir.

Berikut adalah aktivitas mereka:
${JSON.stringify(activities.slice(0, 30))} // Membatasi agar token tidak kepanjangan

Berikut adalah log eksekusi mereka (berisi durasi, skor fokus (1-5), level energi setelahnya, dan jumlah distraksi):
${JSON.stringify(executionLogs.slice(-50))}

Tugas Anda:
1. Analisa pola dari data di atas (misalnya, jika fokus sering rendah, atau distraksi sering tinggi di aktivitas tertentu).
2. Tuliskan teks refleksi mingguan (Weekly Reflection) singkat untuk pengguna.
3. Terdiri dari MAKSIMAL 2 paragraf.
4. Paragraf pertama: Apresiasi, soroti apa saja yang sudah berjalan baik (pencapaian fokus tertinggi, konsistensi metrik).
5. Paragraf kedua: Saran perbaikan yang lembut dan bisa dieksekusi (contoh: "Saya perhatikan kamu sering kehilangan energi setelah sesi deep work yang panjang, cobalah pecah waktumu..." dll).
6. Gunakan bahasa Indonesia yang santai, memotivasi, hangat, dan seolah-olah Anda benar-benar peduli dengan kesejahteraan/kesehatan mental mereka (cozy tone).
7. Jangan gunakan sapaan formal seperti "Halo Tuan/Nyonya", gunakan bahasa yang natural (misalnya sapaan universal yang ramah atau langsung masuk ke observasi).
8. Kembalikan responsnya HANYA sebuah format JSON tulisan biasa yang berisi properti 'reflectionText'.
    
Contoh Respons JSON:
{
  "reflectionText": "Minggu ini kamu luar biasa! Aku perhatikan fokusmu sangat tajam saat mengerjakan tugas-tugas kreatif di pagi hari.\\n\\nNamun, di hari Jumat sore, jumlah distraksimu agak meningkat. Jangan lupa sisipkan waktu istirahat yang cukup ya, kamu berhak mendapatkan *break* yang santai!"
}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // AI terkadang menyelipkan format Markdown ```json ... ```, kita membersihkannya
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanedText);

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error("Gemini Reflection Error:", error);
        return NextResponse.json({ error: 'Failed to generate AI reflection' }, { status: 500 });
    }
}
