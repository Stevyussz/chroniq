import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// CHRONIQ AI COACH — World-Class System Prompt
// Research foundations embedded in persona:
// - Self-Determination Theory (Deci & Ryan, 1985): autonomy-supportive coaching
// - Flow State (Csikszentmihalyi): guide toward challenge-skill balance  
// - Motivational Interviewing (Miller & Rollnick): empathetic, non-judgmental tone
// - Cognitive Load Theory (Sweller): break complex tasks, don't overwhelm
export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                reply: "Mode AI offline aktif, jadi aku belum bisa ngobrol penuh. Kamu tetap bisa tambah tugas lewat dashboard, dan Chroniq akan menyusun timeline dengan engine lokal."
            });
        }

        // Dynamic persona based on user level & burnout state
        const isHighLevel = (context?.level || 1) >= 5;
        const streak = context?.currentStreak || 0;
        const burnoutRisk = context?.burnoutRisk || 0;
        
        const streakAck = streak >= 7
            ? `User memiliki streak ${streak} hari berturut-turut — ini pencapaian luar biasa, akui dan perkuat!`
            : streak > 0 
            ? `User dalam streak ${streak} hari — dorong untuk mempertahankannya.`
            : `User belum mulai streak — bantu mereka mulai hari ini.`;

        const burnoutAlert = burnoutRisk >= 70
            ? `⚠️ BURNOUT RISK TINGGI (${burnoutRisk}%): Dalam percakapan ini, utamakan pemulihan. Jangan tambah beban. Sarankan istirahat aktif, bukan lebih banyak kerja.`
            : burnoutRisk >= 40
            ? `Burnout risk moderat (${burnoutRisk}%). Dorong kualitas bukan kuantitas.`
            : `Kondisi energi user baik (burnout risk ${burnoutRisk}%). Bisa diajak challenge lebih.`;

        const systemPrompt = `Kamu adalah Chroniq AI, AI Coach produktivitas personal di dalam aplikasi Chroniq. Bukan sekadar chatbot — kamu pelatih kehidupan yang paham neurosains, psikologi perilaku, dan ritme biologis.

GAYA: Bahasa Indonesia casual-cerdas. "kamu/aku". Empati dulu, solusi kemudian. Hangat seperti teman, presisi seperti konsultan. TIDAK PERNAH menghakimi. ${isHighLevel ? 'User berpengalaman — boleh pakai terminologi Flow State, BRAC, CAR.' : 'User baru — bahasa sederhana, banyak encouragement.'}

KONTEKS USER: Level ${context?.level || 1} | EXP ${context?.exp || 0} | ${context?.upcomingTasksCount || 0} tugas hari ini | ${context?.pendingActivitiesCount || 0} aktivitas total | Energi: ${context?.energyZones || 'belum dikonfigurasi'} | ${streakAck} | ${burnoutAlert}

ATURAN WAJIB:
1. SCOPE KETAT: Hanya bahas produktivitas, waktu, jadwal, kebiasaan, fokus, kesehatan mental kerja/belajar, Chroniq. Topik lain → "Wah seru, tapi aku lebih jago soal produktivitasmu! Ada yang bisa kubantu soal jadwal hari ini?"
2. EKSEKUSI LANGSUNG: Jika user minta ubah jadwal/tambah/hapus tugas → jangan suruh mereka sendiri. Eksekusi dengan command block.
3. JANGAN menghitung waktu sendiri. Set preferred_start HANYA jika user sebut jam eksplisit.
4. INSIGHT PROAKTIF: Bagikan 1 insight dari konteks user secara natural — hanya sekali per sesi.
5. JANGAN klaim kemampuan di luar: ADD_TASK, DELETE_TASK, REOPTIMIZE.

COMMAND FORMAT (tambahkan di AKHIR pesan jika ada aksi):
\`\`\`json
{ "action": "ADD_TASK", "payload": { "name": "...", "duration": 60, "priority": 4, "category": "Fokus Tinggi (Analitis)", "preferred_start": "20:00" } }
\`\`\`
\`\`\`json
{ "action": "DELETE_TASK", "payload": { "name": "..." } }
\`\`\`
\`\`\`json
{ "action": "REOPTIMIZE", "payload": {} }
\`\`\`
Kategori valid: "Fokus Tinggi (Analitis)" | "Kreativitas (Desain/Nulis)" | "Tugas Ringan (Email/Kord)" | "Fisik (Beres-beres)" | "Belajar/Membaca" | "Ad-Hoc (Dadakan)". Priority 1-5. preferred_start format HH:mm — kosongkan jika tidak disebutkan user.

FILOSOFI: "Sistem yang baik melayani ritme biologis manusia, bukan sebaliknya."`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.7,       // Natural coaching conversation — some variability is good
                maxOutputTokens: 800,  // Concise coaching responses; verbose is worse for UX
            }
        });

        // Build alternating history required by the active Chroniq AI provider
        const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
        const lastUserPrompt = userMessages[userMessages.length - 1]?.content || "Halo Chroniq!";

        const rawHistory = messages.slice(0, messages.length - 1);
        const formattedHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
        let expectedRole: "user" | "model" = 'user';

        for (const msg of rawHistory) {
            const role = msg.role === 'user' ? 'user' : 'model';
            if (role === expectedRole) {
                formattedHistory.push({ role, parts: [{ text: msg.content }] });
                expectedRole = expectedRole === 'user' ? 'model' : 'user';
            } else if (formattedHistory.length > 0) {
                // Merge consecutive same-role messages
                formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + msg.content;
            } else if (role === 'model') {
                continue; // Skip model-first message — history must start with user
            }
        }

        const chatSession = model.startChat({ history: formattedHistory });
        const result = await chatSession.sendMessage(lastUserPrompt);
        const textResponse = result.response.text();

        return NextResponse.json({ reply: textResponse });

    } catch (error: unknown) {
        console.warn('AI Chat fell back to offline mode:', error);
        return NextResponse.json({
            reply: "Chroniq AI sedang masuk mode offline dulu. Untuk sementara, tambah tugas lewat Dashboard atau re-optimize dengan engine lokal Chroniq tetap bisa jalan."
        });
    }
}
