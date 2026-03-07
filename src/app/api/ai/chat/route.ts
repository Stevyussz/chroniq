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
- "DELETE_TASK" : Menghapus tugas dari antrean/jadwal berdasarkan nama. Parameter wajib payload: name (string yang mendekati nama tugas yang ingin dihapus).
- "REOPTIMIZE" : Meminta sistem menghitung ulang dan menyusun ulang jadwal sekarang. Payload kosong: {}.

Jika Anda memberikan saran psikologis atau sekadar mengobrol, jangan keluarkan JSON block.
Jika user meminta menambah atau menghapus tugas, gunakan ADD_TASK atau DELETE_TASK. Sistem tidak akan otomatis melakukan optimasi jadwal, jadi beri tahu user bahwa tugas sudah masuk daftar/dihapus. Untuk Reoptimize hanya lakukan jika user secara eksplisit memintanya.
Selalu optimis bahwa human error itu wajar. Gunakan filosofi: "Sistem yang baik harus melayani ritme biologis manusia, bukan manusia yang menjadi budak jam."
`;

        model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        // The last message is conceptually the prompt, but we already have history.
        const userMessages = messages.filter((m: any) => m.role === 'user');
        const lastUserPrompt = userMessages[userMessages.length - 1]?.content || "Halo Chroniq!";

        // Ensure history strictly alternates and starts with 'user'
        const rawHistory = messages.slice(0, messages.length - 1);
        const formattedHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
        let expectedRole: "user" | "model" = 'user';

        for (const msg of rawHistory) {
            const role = msg.role === 'user' ? 'user' : 'model';

            if (role === expectedRole) {
                formattedHistory.push({
                    role,
                    parts: [{ text: msg.content }]
                });
                expectedRole = expectedRole === 'user' ? 'model' : 'user';
            } else if (formattedHistory.length > 0) {
                // If same role consecutively, merge them
                formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + msg.content;
            } else if (role === 'model') {
                // Skip model if it's the very first message because history MUST start with user
                continue;
            }
        }

        const chatSession = model.startChat({
            history: formattedHistory
        });

        const result = await chatSession.sendMessage(lastUserPrompt);
        const textResponse = result.response.text();

        return NextResponse.json({ reply: textResponse });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
