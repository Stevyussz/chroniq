import { NextResponse } from 'next/server';
import { buildOfflineCoachReply } from '@/lib/ai/fallback';
import { generateChroniqAiText, GroqMessage } from '@/lib/ai/groq';
import { hasChroniqAiKey, retryChroniqAi } from '@/lib/ai/robust';

// CHRONIQ AI COACH — World-Class System Prompt
// Research foundations embedded in persona:
// - Self-Determination Theory (Deci & Ryan, 1985): autonomy-supportive coaching
// - Flow State (Csikszentmihalyi): guide toward challenge-skill balance  
// - Motivational Interviewing (Miller & Rollnick): empathetic, non-judgmental tone
// - Cognitive Load Theory (Sweller): break complex tasks, don't overwhelm
export async function POST(req: Request) {
    let fallbackMessages: { role: string; content: string }[] = [];
    let fallbackContext: Record<string, unknown> | undefined;

    try {
        const { messages, context } = await req.json();
        fallbackMessages = Array.isArray(messages) ? messages : [];
        fallbackContext = context;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        if (!hasChroniqAiKey()) {
            return NextResponse.json({
                reply: buildOfflineCoachReply(messages, context),
                mode: "offline"
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

        const activeTasksContext = JSON.stringify(context?.activeTasks || []);
        const todayTimelineContext = JSON.stringify(context?.todayTimeline || []);
        const fixedBlocksContext = JSON.stringify(context?.fixedBlocks || []);
        const energySlotsContext = JSON.stringify(context?.energySlots || []);

        const systemPrompt = `Kamu adalah Chroniq AI, AI Coach produktivitas personal di dalam aplikasi Chroniq. Bukan sekadar chatbot — kamu pelatih kehidupan yang paham neurosains, psikologi perilaku, dan ritme biologis.

GAYA: Bahasa Indonesia casual-cerdas. "kamu/aku". Empati dulu, solusi kemudian. Hangat seperti teman, presisi seperti konsultan. TIDAK PERNAH menghakimi. ${isHighLevel ? 'User berpengalaman — boleh pakai terminologi Flow State, BRAC, CAR.' : 'User baru — bahasa sederhana, banyak encouragement.'}

KONTEKS USER: Level ${context?.level || 1} | EXP ${context?.exp || 0} | ${context?.upcomingTasksCount || 0} tugas hari ini | ${context?.pendingActivitiesCount || 0} aktivitas total | Energi: ${context?.energyZones || 'belum dikonfigurasi'} | ${streakAck} | ${burnoutAlert}
TASK AKTIF: ${activeTasksContext}
TIMELINE HARI INI: ${todayTimelineContext}
FIXED BLOCKS: ${fixedBlocksContext}
ENERGY SLOTS: ${energySlotsContext}

ATURAN WAJIB:
1. SCOPE KETAT: Hanya bahas produktivitas, waktu, jadwal, kebiasaan, fokus, kesehatan mental kerja/belajar, Chroniq. Topik lain → "Wah seru, tapi aku lebih jago soal produktivitasmu! Ada yang bisa kubantu soal jadwal hari ini?"
2. EKSEKUSI LANGSUNG: Jika user minta ubah jadwal/tambah/hapus tugas/plan beberapa hari-minggu-bulan → jangan suruh mereka sendiri. Eksekusi dengan command block.
3. JANGAN asal mengarang state. Untuk update/hapus/checklist, cocokkan nama dari TASK AKTIF. Jika tidak yakin targetnya, tanya klarifikasi.
4. JANGAN menghitung waktu mulai sendiri. Set preferred_start HANYA jika user sebut jam eksplisit. scheduled_date boleh kamu hitung dari tanggal relatif.
5. INSIGHT PROAKTIF: Bagikan 1 insight dari konteks user secara natural — hanya sekali per sesi.
6. JANGAN klaim kemampuan di luar: ADD_TASK, ADD_TASKS, UPDATE_TASK, RESCHEDULE_TASK, DELETE_TASK, SET_DEADLINE, ADD_CHECKLIST, SET_ENERGY_SLOTS, REOPTIMIZE.
7. LONG-RANGE PLANNING: Jika user minta plan belajar beberapa hari/minggu/bulan, pecah menjadi sesi kecil bertanggal. Jangan membuat satu tugas raksasa. Gunakan scheduled_date agar tugas masa depan muncul di hari yang tepat. Prioritaskan active recall, spaced repetition, latihan soal, review kesalahan, dan simulasi ujian.
8. OTORITAS COACH: Kamu boleh mengambil keputusan produktivitas kecil secara mandiri: menaikkan prioritas tugas urgent, memecah tugas besar menjadi checklist, memindahkan sesi berat dari low-energy ke peak/medium, dan menyesuaikan energy slot jika user eksplisit minta tuning ritme.
9. SAFETY: Jangan hapus banyak tugas atau ubah seluruh energy map kecuali user memintanya jelas. Untuk perubahan besar, jelaskan singkat dampaknya lalu eksekusi command.

COMMAND FORMAT (tambahkan di AKHIR pesan jika ada aksi):
\`\`\`json
{ "action": "ADD_TASK", "payload": { "name": "...", "duration": 60, "priority": 4, "category": "Fokus Tinggi (Analitis)", "preferred_start": "20:00", "deadline": "YYYY-MM-DD" } }
\`\`\`
\`\`\`json
{ "action": "ADD_TASKS", "payload": { "tasks": [{ "name": "...", "duration": 45, "priority": 4, "category": "Belajar/Membaca", "scheduled_date": "YYYY-MM-DD", "deadline": "YYYY-MM-DD" }] } }
\`\`\`
\`\`\`json
{ "action": "UPDATE_TASK", "payload": { "name": "nama tugas lama", "new_name": "opsional", "duration": 45, "priority": 4, "category": "Belajar/Membaca", "scheduled_date": "YYYY-MM-DD", "preferred_start": "HH:mm", "recurrence": "none" } }
\`\`\`
\`\`\`json
{ "action": "RESCHEDULE_TASK", "payload": { "name": "nama tugas", "scheduled_date": "YYYY-MM-DD", "preferred_start": "HH:mm" } }
\`\`\`
\`\`\`json
{ "action": "DELETE_TASK", "payload": { "name": "..." } }
\`\`\`
\`\`\`json
{ "action": "SET_DEADLINE", "payload": { "name": "...", "deadline": "YYYY-MM-DD" } }
\`\`\`
\`\`\`json
{ "action": "ADD_CHECKLIST", "payload": { "name": "nama tugas", "items": ["langkah 1", "langkah 2", "langkah 3"] } }
\`\`\`
\`\`\`json
{ "action": "SET_ENERGY_SLOTS", "payload": { "slots": [{ "energy_level": "peak", "start_time": "09:00", "end_time": "12:00" }, { "energy_level": "medium", "start_time": "13:00", "end_time": "17:00" }, { "energy_level": "low", "start_time": "19:00", "end_time": "22:00" }] } }
\`\`\`
\`\`\`json
{ "action": "REOPTIMIZE", "payload": {} }
\`\`\`
Kategori valid: "Fokus Tinggi (Analitis)" | "Kreativitas (Desain/Nulis)" | "Tugas Ringan (Email/Kord)" | "Fisik (Beres-beres)" | "Belajar/Membaca" | "Ad-Hoc (Dadakan)". Priority 1-5. preferred_start format HH:mm. scheduled_date dan deadline format YYYY-MM-DD (hari ini: ${new Date().toISOString().split('T')[0]}). Jika user bilang "besok" hitung tanggalnya sendiri. Untuk plan 1 bulan, buat 24-36 sesi maksimum agar tidak overload. Kosongkan field yang tidak relevan.

FILOSOFI: "Sistem yang baik melayani ritme biologis manusia, bukan sebaliknya."`;

        const formattedMessages: GroqMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages
                .filter((msg: { role?: string; content?: string }) => typeof msg.content === "string" && msg.content.trim())
                .slice(-12)
                .map((msg: { role: string; content: string }) => ({
                    role: msg.role === "user" ? "user" as const : "assistant" as const,
                    content: msg.content,
                })),
        ];

        const textResponse = await retryChroniqAi(async () => {
            return generateChroniqAiText({
                messages: formattedMessages,
                temperature: 0.7,
                maxTokens: 2200,
            });
        }, "Chroniq AI chat");

        return NextResponse.json({ reply: textResponse });

    } catch (error: unknown) {
        console.warn('AI Chat fell back to offline mode:', error);
        return NextResponse.json({
            reply: buildOfflineCoachReply(fallbackMessages, fallbackContext),
            mode: "offline-fallback",
            warning: "Chroniq AI sedang memakai mode coach lokal."
        });
    }
}
