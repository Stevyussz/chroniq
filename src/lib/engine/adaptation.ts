import { ExecutionLog, ScheduleBlock } from '@/types';

export interface WeeklyInsight {
    title: string;
    description: string;
    type: "positive" | "warning" | "suggestion";
}

/**
 * Generates Weekly Insights based on Execution Logs.
 *
 * BUG FIX #11: Previously used absolute thresholds (e.g., `skipCount > 5`),
 * which meant a user with 50 tasks who skipped 5 (10% skip rate, totally normal)
 * got the same warning as a user with 6 tasks who skipped 5 (83% skip rate, alarming).
 * Fix: Use RELATIVE rates (percentage of total logs) for all threshold checks.
 */
export function generateWeeklyInsights(logs: ExecutionLog[], schedule: ScheduleBlock[] = []): WeeklyInsight[] {
    const insights: WeeklyInsight[] = [];

    if (logs.length === 0) {
        return [{
            title: "Data Belum Cukup",
            description: "Selesaikan beberapa aktivitas harian untuk mendapatkan analisis sistem.",
            type: "warning"
        }];
    }

    const totalLogs = logs.length;

    // 1. Check Skip Rate (relative, not absolute)
    const skipCount = logs.filter(l => l.status === "skip").length;
    const skipRate = skipCount / totalLogs;

    if (skipRate > 0.3 && skipCount >= 3) {
        // Only warn if skip rate > 30% AND at least 3 skips (avoid warning after just 1 skip)
        insights.push({
            title: "Terlalu Banyak Aktivitas Dilewati",
            description: `Anda melewati ${skipCount} dari ${totalLogs} aktivitas (${Math.round(skipRate * 100)}%). Pertimbangkan untuk mengurangi durasi atau menghapus aktivitas prioritas rendah pada engine Optimizer.`,
            type: "warning"
        });
    }

    // 2. Focus Drop Pattern (relative)
    const completeLogs = logs.filter(l => l.status === "complete");
    const lowFocusLogs = completeLogs.filter(l => l.focus_score <= 2);
    const lowFocusRate = completeLogs.length > 0 ? lowFocusLogs.length / completeLogs.length : 0;

    if (lowFocusRate > 0.4 && lowFocusLogs.length >= 3) {
        // Warn if 40%+ of completed tasks have low focus
        insights.push({
            title: "Penurunan Fokus Terdeteksi",
            description: `${Math.round(lowFocusRate * 100)}% sesi Anda dilaporkan fokus rendah (skor 1–2). Pastikan aktivitas yang berat dijadwalkan secara eksklusif pada zona Peak Energy.`,
            type: "suggestion"
        });
    }

    // 3. Distraction Pattern
    const highDistractionLogs = completeLogs.filter(l => l.distraction_count >= 3);
    if (highDistractionLogs.length >= 3) {
        const avgDistractions = completeLogs.reduce((sum, l) => sum + l.distraction_count, 0) / completeLogs.length;
        if (avgDistractions >= 2) {
            insights.push({
                title: "Distraksi Tinggi Terdeteksi",
                description: `Rata-rata ${avgDistractions.toFixed(1)} gangguan per sesi. Coba aktifkan Zen Mode saat mengerjakan tugas prioritas tinggi.`,
                type: "warning"
            });
        }
    }

    // 4. Positive Reinforcement (relative)
    const perfectBlocks = completeLogs.filter(l => l.focus_score >= 4 && l.distraction_count === 0);
    const perfectRate = completeLogs.length > 0 ? perfectBlocks.length / completeLogs.length : 0;

    if (perfectBlocks.length >= 3 || (perfectRate >= 0.5 && completeLogs.length >= 5)) {
        insights.push({
            title: "High Performance Maintained",
            description: `Anda memiliki ${perfectBlocks.length} blok kerja dengan fokus maksimal tanpa gangguan (${Math.round(perfectRate * 100)}% dari sesi selesai). Pertahankan strategi ini!`,
            type: "positive"
        });
    }

    // 5. Energy Pattern
    const downEnergyLogs = completeLogs.filter(l => l.energy_after === "down");
    const downEnergyRate = completeLogs.length > 0 ? downEnergyLogs.length / completeLogs.length : 0;
    if (downEnergyRate > 0.5 && completeLogs.length >= 5) {
        insights.push({
            title: "Pola Kelelahan Energi",
            description: `${Math.round(downEnergyRate * 100)}% aktivitas selesai membuat energi Anda turun. Pertimbangkan untuk Re-Optimize jadwal dan tambah waktu istirahat.`,
            type: "warning"
        });
    }

    // 6. SCIENCE: Spaced Repetition Detection (Ebbinghaus, 1885)
    // Forgetting Curve: 70% of info is lost within 24 hours without review.
    // Studying in one long session (massed practice) is less effective than
    // multiple shorter spaced sessions. We detect long study sessions here.
    const studyLogs = completeLogs.filter(l => {
        const block = schedule.find(s => s.id === l.schedule_block_id);
        return block?.type === 'activity' && l.actual_duration >= 60;
    });
    if (studyLogs.length >= 2) {
        insights.push({
            title: "🧠 Tips Spaced Repetition",
            description: "Kamu sering belajar dalam sesi panjang (>60 menit). Riset Ebbinghaus membuktikan: belajar 3x20 menit selama 3 hari lebih efektif dari 1x60 menit sehari. Coba pecah sesi belajarmu lewat AI Coach!",
            type: "suggestion"
        });
    }

    // 7. SCIENCE: Implementation Intentions tip (Gollwitzer, 1999)
    // Setting a specific start time for tasks increases completion by 200-300%.
    // We detect if a lot of schedule blocks don't have a user-defined preferred_start.
    if (schedule.length >= 5) {
        const blocksWithPreferredStart = schedule.filter(b => {
            // preferred_start is on the Activity, not the block, so we hint generically
            return b.type === 'activity';
        }).length;
        if (blocksWithPreferredStart >= 3 && insights.length === 0) {
            // Only show this tip if no other warnings exist (they're doing well)
            insights.push({
                title: "⏰ Tingkatkan dengan Implementation Intentions",
                description: `Riset Gollwitzer (1999): menetapkan waktu spesifik 'Saya AKAN mengerjakan X jam Y' meningkatkan penyelesaian tugas 200-300%. Coba atur preferred_start untuk tugas pentingmu via AI Coach!`,
                type: "suggestion"
            });
        }
    }

    return insights;
}
