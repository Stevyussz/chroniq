require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runTest() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
Anda adalah "Chroniq AI", seorang pelatih produktivitas dan keseimbangan hidup yang sangat empatik, suportif, dan analitis.
Pengguna aplikasi Anda memberikan data eksekusi (log) kegiatan mereka selama beberapa waktu terakhir.

Berikut adalah aktivitas mereka:
[{"id":"act-1","name":"Coding Backend","target_duration":60,"priority":4,"category":"Kerja"}]

Berikut adalah log eksekusi mereka (berisi durasi, skor fokus (1-5), level energi setelahnya, dan jumlah distraksi):
[
    {"id":"log-1","schedule_block_id":"blk-1","actual_duration":20,"focus_score":1,"energy_after":"down","distraction_count":15,"status":"partial"},
    {"id":"log-2","schedule_block_id":"blk-2","actual_duration":15,"focus_score":1,"energy_after":"down","distraction_count":12,"status":"partial"},
    {"id":"log-3","schedule_block_id":"blk-3","actual_duration":20,"focus_score":2,"energy_after":"down","distraction_count":10,"status":"partial"}
]

Berikut adalah pengaturan Energi (Biological Prime Time) mereka saat ini:
[
  {"id":"ES-1","user_id":"user123","start_time":"08:00","end_time":"12:00","energy_level":"peak"},
  {"id":"ES-2","user_id":"user123","start_time":"13:00","end_time":"17:00","energy_level":"medium"},
  {"id":"ES-3","user_id":"user123","start_time":"18:00","end_time":"22:00","energy_level":"low"}
]

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
`;

    try {
        const result = await model.generateContent(prompt);
        console.log("RESPONSE:", result.response.text());
    } catch (e) {
        console.error("ERR:", e);
    }
}
runTest();
