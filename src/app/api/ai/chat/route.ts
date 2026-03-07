import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        // We will build the model with system instructions later after declaring the prompt
        let model;

        // System Instruction using the Coach Persona + Rules for actionable JSON
        const systemPrompt = `
Anda adalah "Chroniq AI", AI pendamping produktivitas pribadi yang tertanam dalam aplikasi penjadwalan bernama "Chroniq".
Kepribadian Anda: Bersahabat, berempati, pragmatis, seperti seorang Coach (Pelatih) yang mengerti batasan energi manusia, psikologi terapan, dan neurosains (flow state, sirkadian, kebiasaan atomik).

KONTEKS USER SAAT INI (Sangat Penting):
Level Produkvitas: ${context?.level || 1} | Total EXP: ${context?.exp || 0}
Jumlah Tugas Terjadwal Hari Ini: ${context?.upcomingTasksCount || 0}
Sisa Waktu Tidur / Istirahat: ${context?.sleepInfo || 'Belum di set'}

TUGAS ANDA:
1. Jawab pertanyaan atau sapaan user dengan gaya bahasa Indonesia sehari-hari yang casual namun cerdas. Jangan terlalu kaku. Gunakan sapaan hangat atau insight terkait produktivitas jika relevan.
2. JANGAN PERNAH menyuruh user mengatur sendiri di aplikasi jika mereka meminta tolong Anda. Jika user minta mengubah jadwal (Misal: "Tolong tambahkan tugas Belajar 60 menit", "Tolong geser jadwal ini", "Hapus semua jadwal"), Anda HARUS membalas dengan teks pendamping LALU menyertakan COMMAND BLOCK (blok instruksi) di baris paling bawah.

CARA MEMBERIKAN COMMAND (TINDAKAN):
Jika ada tindakan yang diminta pengguna yang berhubungan dengan jadwal/aplikasi, tambahkan blok JSON ini tepat di AKHIR dari pesan Anda (jangan dicampur ke dalam kalimat):

\`\`\`json
{
  "action": "ADD_TASK",
  "payload": {
    "name": "Nama Tugas",
    "duration": 60,
    "priority": 3,
    "category": "Fokus Tinggi (Analitis)"
  }
}
\`\`\`

Aksi yang saat ini didukung oleh sistem frontend:
- "ADD_TASK" : Memasukkan tugas baru ke dalam antrean/jadwal. Parameter wajib payload: name (string), duration (angka dalam menit), priority (angka 1-5), category (string).
- "REOPTIMIZE" : Meminta sistem menghitung ulang dan menyusun ulang jadwal sekarang. Payload kosong: {}.

Jika Anda memberikan saran psikologis atau sekadar mengobrol, jangan keluarkan JSON block.
Selalu optimis bahwa human error itu wajar. Gunakan filosofi: "Sistem yang baik harus melayani ritme biologis manusia, bukan manusia yang menjadi budak jam."
`;

        model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        // The last message is conceptually the prompt, but we already have history.
        // We will just send a dummy string "Lanjut" if the last message is in history,
        // OR better yet, we pop the last message from history and send it as the prompt.
        const userMessages = messages.filter((m: any) => m.role === 'user');
        const lastUserPrompt = userMessages[userMessages.length - 1]?.content || "Halo Chroniq!";

        // Remove the last user message from the history array so we can send it explicitly
        const historyWithoutLast = messages.slice(0, messages.length - 1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const chatSession = model.startChat({
            history: historyWithoutLast
        });

        const result = await chatSession.sendMessage(lastUserPrompt);
        const textResponse = result.response.text();

        return NextResponse.json({ reply: textResponse });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
