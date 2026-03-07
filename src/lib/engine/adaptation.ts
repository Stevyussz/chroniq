import { ExecutionLog, ScheduleBlock } from '@/types';

export interface WeeklyInsight {
    title: string;
    description: string;
    type: "positive" | "warning" | "suggestion";
}

/**
 * Generates Weekly Insights based on Execution Logs and the Schedule
 */
export function generateWeeklyInsights(logs: ExecutionLog[]): WeeklyInsight[] {
    const insights: WeeklyInsight[] = [];

    if (logs.length === 0) {
        return [{
            title: "Data Belum Cukup",
            description: "Selesaikan beberapa aktivitas harian untuk mendapatkan analisis sistem.",
            type: "warning"
        }];
    }

    // 1. Check Skip Frequency
    const skipCount = logs.filter(l => l.status === "skip").length;
    if (skipCount > 5) {
        insights.push({
            title: "Terlalu Banyak Aktivitas Dilewati",
            description: `Anda melewati ${skipCount} aktivitas. Pertimbangkan untuk mengurangi durasi atau menghapus aktivitas prioritas rendah pada engine Optimizer.`,
            type: "warning"
        });
    }

    // 2. Focus Drop Pattern
    const lowFocusLogs = logs.filter(l => l.status === "complete" && l.focus_score <= 2);
    if (lowFocusLogs.length > 3) {
        insights.push({
            title: "Penurunan Fokus Terdeteksi",
            description: "Anda sering melaporkan fokus rendah (1-2). Pastikan aktivitas yang berat dijadwalkan secara eksklusif pada zona Peak Energy.",
            type: "suggestion"
        });
    }

    // 3. Positive Reinforcement
    const perfectBlocks = logs.filter(l => l.status === "complete" && l.focus_score >= 4 && l.distraction_count === 0);
    if (perfectBlocks.length >= 3) {
        insights.push({
            title: "High Performance Kept",
            description: `Anda memiliki ${perfectBlocks.length} blok kerja dengan fokus maksimal tanpa gangguan. Pertahankan strategi ini!`,
            type: "positive"
        });
    }

    return insights;
}
