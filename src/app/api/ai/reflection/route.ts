import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { buildOfflineReflection } from '@/lib/ai/fallback';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * AI Weekly Reflection — Chroniq Engine
 *
 * Generates personalized productivity coaching based on behavioral data.
 * Research basis:
 * - Self-Efficacy Theory (Bandura, 1977): reinforce competence, not just outcomes
 * - Growth Mindset (Dweck, 2006): frame failures as learning data, not identity
 * - Motivational Interviewing (Miller & Rollnick): evoke intrinsic motivation
 * - Circadian Biology (Roenneberg): identify personal chronotype shifts
 */
export async function POST(request: Request) {
    let fallbackExecutionLogs = [];
    let fallbackEnergySlots = [];

    try {
        const { executionLogs, activities, energySlots, user } = await request.json();
        fallbackExecutionLogs = Array.isArray(executionLogs) ? executionLogs : [];
        fallbackEnergySlots = Array.isArray(energySlots) ? energySlots : [];

        if (!executionLogs || !activities || !energySlots) {
            return NextResponse.json({ error: 'executionLogs, activities, and energySlots are required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(buildOfflineReflection(executionLogs, energySlots));
        }

        // Use structured JSON schema to guarantee parseable output (no regex hacks needed)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,        // Slightly creative — coaching text needs natural variation
                maxOutputTokens: 1200,  // 3 paragraphs + insight + tip + optional energy slots
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        reflectionText: {
                            type: SchemaType.STRING,
                            description: "2-3 paragraf refleksi mingguan dalam Bahasa Indonesia. Paragraf 1: Apresiasi & pencapaian. Paragraf 2: Insight pola & analisis data. Paragraf 3 (opsional): Saran konkret yang bisa dieksekusi langsung."
                        },
                        mainInsight: {
                            type: SchemaType.STRING,
                            description: "Satu kalimat insight terkuat dari analisis data. Contoh: 'Fokusmu 40% lebih tinggi di pagi hari dibandingkan sore hari.'"
                        },
                        actionableTip: {
                            type: SchemaType.STRING,
                            description: "Satu saran konkret yang bisa langsung dieksekusi user minggu depan. Spesifik, bukan generik."
                        },
                        moodLabel: {
                            type: SchemaType.STRING,
                            description: "Label mood berdasarkan pattern data. Pilih satu: 'Lagi di puncak! 🔥', 'Stabil dan konsisten 🌿', 'Perlu istirahat lebih 🌙', 'Sedang berjuang, tapi kuat 💪', 'Recovery mode aktif 🌱'"
                        },
                        suggestedEnergySlots: {
                            type: SchemaType.ARRAY,
                            description: "Array 3 zona energi yang disarankan. Isi HANYA jika data menunjukkan pola yang sangat berbeda dari konfigurasi saat ini. Biarkan kosong array jika konfigurasi sudah optimal.",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    id: { type: SchemaType.STRING },
                                    user_id: { type: SchemaType.STRING },
                                    start_time: { type: SchemaType.STRING },
                                    end_time: { type: SchemaType.STRING },
                                    energy_level: { type: SchemaType.STRING }
                                },
                                required: ["id", "user_id", "start_time", "end_time", "energy_level"]
                            }
                        }
                    },
                    required: ["reflectionText", "mainInsight", "actionableTip", "moodLabel"]
                }
            }
        });

        // Compute derived stats to give AI richer data without bloating token count
        const completeLogs = executionLogs.filter((l: { status: string }) => l.status === 'complete');
        const skipLogs = executionLogs.filter((l: { status: string }) => l.status === 'skip');
        const totalFocus = completeLogs.reduce((s: number, l: { focus_score: number }) => s + l.focus_score, 0);
        const avgFocus = completeLogs.length > 0 ? (totalFocus / completeLogs.length).toFixed(1) : 'N/A';
        const avgDistractions = completeLogs.length > 0
            ? (completeLogs.reduce((s: number, l: { distraction_count: number }) => s + l.distraction_count, 0) / completeLogs.length).toFixed(1)
            : 'N/A';
        const totalMinutesWorked = completeLogs.reduce((s: number, l: { actual_duration: number }) => s + l.actual_duration, 0);
        const energyDownCount = completeLogs.filter((l: { energy_after: string }) => l.energy_after === 'down').length;
        const energyUpCount = completeLogs.filter((l: { energy_after: string }) => l.energy_after === 'up').length;
        const highFocusSessions = completeLogs.filter((l: { focus_score: number }) => l.focus_score >= 4).length;
        const zeroDistractionSessions = completeLogs.filter((l: { distraction_count: number }) => l.distraction_count === 0).length;

        const limitedActivities = activities.slice(0, 20);
        const recentLogs = executionLogs.slice(-30);

        const prompt = `
Kamu adalah Chroniq AI Coach, psikolog produktivitas berbasis data.

DATA USER MINGGU INI:
- Nama: ${user?.name || 'User'}
- Sesi selesai: ${completeLogs.length} | Sesi dilewati: ${skipLogs.length}
- Rata-rata skor fokus: ${avgFocus}/5
- Rata-rata distraksi per sesi: ${avgDistractions}
- Total menit kerja produktif: ${totalMinutesWorked} menit
- Sesi energi naik setelah kerja: ${energyUpCount} | Energi turun: ${energyDownCount}
- Sesi high-focus (≥4): ${highFocusSessions} | Sesi tanpa distraksi: ${zeroDistractionSessions}

KONFIGURASI ENERGI SAAT INI:
${JSON.stringify(energySlots)}

SAMPLE LOG TERBARU (max 30):
${JSON.stringify(recentLogs)}

AKTIVITAS AKTIF:
${JSON.stringify(limitedActivities)}

TUGAS REFLEKSIMU:
1. Baca data di atas dengan cermat seperti seorang coach berpengalaman.
2. Cari pola yang tidak obvious — bukan sekedar "fokusmu rendah". Contoh: "Kamu fokusnya bagus di pagi hari tapi terus drop setelah makan siang, ini indikasi Post-Lunch Dip yang bisa diatasi dengan power nap 20 menit."
3. Gunakan Self-Efficacy Theory: mulai dari pencapaian, baru masalah.
4. Gunakan Growth Mindset framing: "data ini menunjukkan..." bukan "kamu gagal..."
5. Saran harus SPESIFIK dan ACTIONABLE, bukan "tingkatkan fokusmu". Contoh baik: "Coba aktifkan Zen Mode di sesi antara jam 14:00-16:00 minggu depan."
6. Tone: hangat, supportif, seperti teman cerdas yang jujur.
7. Bahasa Indonesia yang casual tapi berbobot. Boleh emoji secukupnya.
8. Evaluasi apakah energi slot saat ini cocok dengan bukti data. Jika ada ketidakcocokan signifikan (mis: sering distraksi di jam Peak), sarankan suggestedEnergySlots baru. Jika sudah optimal, kembalikan array kosong [].

Kembalikan dalam format JSON sesuai schema.
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const parsedData = JSON.parse(responseText);
        return NextResponse.json(parsedData);

    } catch (error) {
        console.warn("Chroniq AI Reflection fell back to offline mode:", error);
        return NextResponse.json({
            ...buildOfflineReflection(fallbackExecutionLogs, fallbackEnergySlots),
            mode: "offline-fallback",
            warning: "Chroniq AI sedang memakai mode insight lokal."
        });
    }
}
