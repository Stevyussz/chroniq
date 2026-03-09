import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { executionLogs, activities, energySlots } = await request.json();

        if (!executionLogs || !activities || !energySlots) {
            return NextResponse.json({ error: 'executionLogs, activities, and energySlots are required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        // Ciptakan promp yang menugaskan AI untuk menjadi pelatih produktivitas
        const prompt = `
Anda adalah "Chroniq AI", seorang pelatih produktivitas dan keseimbangan hidup yang sangat empatik, suportif, dan analitis.
Pengguna aplikasi Anda memberikan data eksekusi (log) kegiatan mereka selama beberapa waktu terakhir.

Berikut adalah aktivitas mereka:
${JSON.stringify(activities.slice(0, 30))} // Membatasi agar token tidak kepanjangan

Berikut adalah log eksekusi mereka (berisi durasi, skor fokus (1-5), level energi setelahnya, dan jumlah distraksi):
${JSON.stringify(executionLogs.slice(-50))}

Berikut adalah pengaturan Energi (Biological Prime Time) mereka saat ini:
${JSON.stringify(energySlots)}

Tugas Anda:
1. Analisa pola dari data di atas (misalnya, jika fokus sering rendah, atau distraksi sering tinggi di aktivitas tertentu pada jam tertentu).
2. Perhatikan dengan saksama apakah jam energi (Peak/Medium/Low) mereka saat ini masih relevan dengan hasil eksekusi nyata mereka. Jika mereka sering ketiduran atau hilang fokus di jam Peak, berarti jam biologis mereka sudah bergeser.
3. Tuliskan teks refleksi mingguan (Weekly Reflection) singkat untuk pengguna. Terdiri dari MAKSIMAL 2 paragraf.
4. Paragraf pertama: Apresiasi, soroti apa saja yang sudah berjalan baik (pencapaian fokus tertinggi, konsistensi metrik).
5. Paragraf kedua: Saran perbaikan yang lembut dan bisa dieksekusi. Jika Anda menemukan pola energi yang salah, beri tahu mereka bahwa Anda telah menyarankan perubahan jam energi.
6. Gunakan bahasa Indonesia yang santai, memotivasi, hangat, dan seolah-olah Anda benar-benar peduli dengan kesejahteraan/kesehatan mental mereka (cozy tone).
7. Jika Anda menemukan bahwa pengaturan Energi (EnergySlots) saat ini SANGAT TIDAK OPTIMAL berdasarkan bukti log (misalnya sering distraksi di jam peak, atau malah sangat fokus di jam low), Anda WAJIB memberikan array \`suggestedEnergySlots\`. Jika energi saat ini sudah cukup bagus, Anda TIDAK PERLU memberikan \`suggestedEnergySlots\` (biarkan kosong atau abaikan).
8. Aturan pembuatan \`suggestedEnergySlots\`: 
   - Harus array of object dengan persis 3 zona ("peak", "medium", "low").
   - Format \`start_time\` dan \`end_time\` adalah string "HH:mm".
   - Ketiganya tidak boleh tumpang tindih dan harus logis.
9. Kembalikan responsnya HANYA sebuah format JSON tulisan biasa yang berisi properti 'reflectionText', dan opsional 'suggestedEnergySlots'.
    
Contoh Respons JSON:
{
  "reflectionText": "Minggu ini kamu luar biasa! Aku perhatikan fokusmu sangat tajam saat mengerjakan tugas-tugas kreatif di pagi hari.\\n\\nNamun, di sore hari fokusmu sering drop padahal itu jam Peak kamu. Aku udah buatin saran jadwal energi baru di bawah supaya kamu bisa istirahat pas sore dan gaspol lagi di malam hari ya!",
  "suggestedEnergySlots": [
    { "id": "slot-peak", "user_id": "user", "start_time": "19:00", "end_time": "22:00", "energy_level": "peak" },
    { "id": "slot-med", "user_id": "user", "start_time": "08:00", "end_time": "12:00", "energy_level": "medium" },
    { "id": "slot-low", "user_id": "user", "start_time": "13:00", "end_time": "17:00", "energy_level": "low" }
  ]
}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON block using Regex just in case AI adds conversational filler
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
        let parsedData;

        if (jsonMatch) {
            const jsonText = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
            parsedData = JSON.parse(jsonText);
        } else {
            // Fallback attempt
            parsedData = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error("Gemini Reflection Error:", error);
        return NextResponse.json({ error: 'Failed to generate AI reflection' }, { status: 500 });
    }
}
