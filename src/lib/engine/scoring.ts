import { ExecutionLog, ScheduleBlock, Activity } from '@/types';

/**
 * Calculates Discipline Score: Completed Blocks / Planned Blocks
 *
 * BUG FIX: Previously, `logs.filter(l => l.status === "complete").length` counted ALL
 * historical logs ever recorded, including logs from past schedule sessions.
 * This caused inflated/incorrect discipline scores when comparing against the
 * CURRENT schedule's block count. Fix: only count logs whose block ID exists in
 * the current schedule.
 */
export function calculateDisciplineScore(logs: ExecutionLog[], schedule: ScheduleBlock[]): number {
    const activityBlocks = schedule.filter(b => b.type === "activity");
    if (activityBlocks.length === 0) return 0;

    // Only count logs that belong to blocks in the current schedule
    const currentBlockIds = new Set(activityBlocks.map(b => b.id));
    const completed = logs.filter(
        l => l.status === "complete" && currentBlockIds.has(l.schedule_block_id)
    ).length;

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
 * Calculates True Productivity Index (TPI).
 *
 * SCIENCE FIX #2: Attention Residue Theory (Sophie Leroy, 2009)
 * Research shows a single distraction creates an "attention residue" that costs
 * 15-25 minutes of recovery time (Gloria Mark, UC Irvine, 2008: avg 23 min 15 sec).
 * The previous penalty of 2 minutes per distraction was a 10-12x underestimate.
 * We now use a conservative 15-minute penalty per distraction.
 *
 * Additionally: Flow State research (Csikszentmihalyi) shows that distracted sessions
 * never reach flow — so high-distraction sessions have near-zero effective productivity
 * regardless of duration. The formula now reflects this with a distraction modifier.
 */
export function calculateTPI(logs: ExecutionLog[]): number {
    if (logs.length === 0) return 0;

    let index = 0;
    for (const log of logs) {
        if (log.status !== "complete") continue;

        const effectiveWork = log.actual_duration * (log.focus_score / 5);

        // Attention Residue penalty: 15 minutes per distraction (Leroy 2009, Mark 2008)
        // Capped at total session duration to avoid negative values per session
        const attentionResidualLoss = Math.min(log.actual_duration, log.distraction_count * 15);

        // Flow state modifier: if distractions > 2, session never entered flow (Csikszentmihalyi)
        // Apply a multiplier that degrades session value
        const flowModifier = log.distraction_count > 2 ? 0.5 : 1.0;

        index += (effectiveWork - attentionResidualLoss) * flowModifier;
    }

    return Math.max(0, Math.round(index));
}


/**
 * Calculates Energy Reliability: how often focus matches the expected energy zone.
 *
 * BUG FIX: Same as calculateDisciplineScore — previously used ALL historical logs
 * without filtering to the current schedule. This led to stale data from old
 * sessions skewing the reliability score. Fix: filter logs by current schedule IDs.
 */
export function calculateEnergyReliability(logs: ExecutionLog[], schedule: ScheduleBlock[]): number {
    const currentBlockIds = new Set(schedule.map(b => b.id));
    const completeLogs = logs.filter(
        l => l.status === "complete" && currentBlockIds.has(l.schedule_block_id)
    );
    if (completeLogs.length === 0) return 0;

    let reliableMatches = 0;
    for (const log of completeLogs) {
        const block = schedule.find(b => b.id === log.schedule_block_id);
        if (!block) continue;

        if (block.energy_zone === "peak" && log.focus_score >= 4) reliableMatches++;
        else if (block.energy_zone === "medium" && log.focus_score >= 3) reliableMatches++;
        else if (block.energy_zone === "low" && log.focus_score >= 1) reliableMatches++;
        else if (log.focus_score >= 3) reliableMatches++; // Fallback leniency
    }

    return Math.round((reliableMatches / completeLogs.length) * 100);
}
