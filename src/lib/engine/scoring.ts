import { ExecutionLog, ScheduleBlock, Activity } from '@/types';

/**
 * Calculates Discipline Score: Completed Blocks / Planned Blocks
 */
export function calculateDisciplineScore(logs: ExecutionLog[], schedule: ScheduleBlock[]): number {
    if (schedule.length === 0) return 0;
    const activityBlocks = schedule.filter(b => b.type === "activity");
    if (activityBlocks.length === 0) return 0;

    const completed = logs.filter(l => l.status === "complete").length;
    return Math.round((completed / activityBlocks.length) * 100);
}

/**
 * Calculates Priority Alignment Score: (High priority in Peak + Medium priority in Medium) / Total Activities
 */
export function calculatePriorityAlignment(schedule: ScheduleBlock[], activities: Activity[]): number {
    if (schedule.length === 0 || activities.length === 0) return 0;

    let alignedCount = 0;
    let totalActivityBlocks = 0;

    for (const block of schedule) {
        if (block.type !== "activity") continue;
        totalActivityBlocks++;
        const act = activities.find(a => a.id === block.activity_id);
        if (!act) continue;

        if (act.priority >= 4 && block.energy_zone === "peak") alignedCount++;
        else if (act.priority === 3 && block.energy_zone === "medium") alignedCount++;
        else if (act.priority <= 2 && block.energy_zone === "low") alignedCount++;
    }

    return totalActivityBlocks === 0 ? 0 : Math.round((alignedCount / totalActivityBlocks) * 100);
}

/**
 * Calculates True Productivity Index (TPI): Σ(EffectiveWork) - Σ(DistractionPenalty)
 * EffectiveWork = duration * (focus / 5)
 */
export function calculateTPI(logs: ExecutionLog[]): number {
    if (logs.length === 0) return 0;

    let index = 0;
    for (const log of logs) {
        if (log.status !== "complete") continue;
        const effectiveWork = log.actual_duration * (log.focus_score / 5);
        // penalty: 2 minutes per distraction (arbitrary weight for MVP)
        const penalty = log.distraction_count * 2;
        index += (effectiveWork - penalty);
    }

    return Math.max(0, Math.round(index));
}

/**
 * Calculates Energy Reliability: Average focus score per energy zone? Overall avg focus mapped to 0-100.
 */
export function calculateEnergyReliability(logs: ExecutionLog[], schedule: ScheduleBlock[]): number {
    const completeLogs = logs.filter(l => l.status === "complete");
    if (completeLogs.length === 0) return 0;

    let reliableMatches = 0;
    for (const log of completeLogs) {
        const block = schedule.find(b => b.id === log.schedule_block_id);
        if (!block) continue;

        // Assess if energy state supported the work reliably
        if (block.energy_zone === "peak" && log.focus_score >= 4) reliableMatches++;
        else if (block.energy_zone === "medium" && log.focus_score >= 3) reliableMatches++;
        else if (block.energy_zone === "low" && log.focus_score >= 1) reliableMatches++;
        else if (log.focus_score >= 3) reliableMatches++; // Fallback leniency
    }

    return Math.round((reliableMatches / completeLogs.length) * 100);
}
