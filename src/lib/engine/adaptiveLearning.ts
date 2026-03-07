import { ExecutionLog, ScheduleBlock, EnergySlot, Activity } from '@/types';
import { timeToMinutes } from './constraint';

export interface AdaptationAnalysis {
    adjustedEnergySlots: EnergySlot[];
    suggestedMaxBlockDuration: number;
    burnoutRiskIndex: number;
    isBurnoutWarning: boolean;
    categoryPenalties: Record<string, string[]>; // Map of Category -> array of penalized Energy Zones
}

/**
 * Analyzes past execution logs to calculate Burnout Risk and dynamically adjust scheduling rules.
 */
export function analyzeExecutionHistory(
    logs: ExecutionLog[],
    schedule: ScheduleBlock[],
    baseEnergySlots: EnergySlot[],
    activities: Activity[] = []
): AdaptationAnalysis {
    let burnoutRiskIndex = 0;
    let suggestedMaxBlockDuration = 90; // Default max deep work block

    // Deep copy base slots to avoid mutating state directly
    const adjustedEnergySlots: EnergySlot[] = baseEnergySlots.map(s => ({ ...s }));
    const categoryPenalties: Record<string, string[]> = {};

    if (logs.length === 0) {
        return {
            adjustedEnergySlots,
            suggestedMaxBlockDuration,
            burnoutRiskIndex,
            isBurnoutWarning: false,
            categoryPenalties
        };
    }

    // 1. Burnout Risk Index Calculation
    // Factors: consecutive "down" energies, consecutive skipped blocks, poor focus scores
    let consecutiveDowns = 0;

    for (const log of logs) {
        if (log.status === "skip") {
            burnoutRiskIndex += 10;
        } else if (log.status === "complete") {
            if (log.energy_after === "down") {
                consecutiveDowns++;
                burnoutRiskIndex += 15 * consecutiveDowns; // compounding risk
            } else {
                consecutiveDowns = Math.max(0, consecutiveDowns - 1);
            }

            if (log.focus_score < 3) {
                burnoutRiskIndex += 5;
            }
        }
    }

    // Cap Risk
    burnoutRiskIndex = Math.min(100, burnoutRiskIndex);
    const isBurnoutWarning = burnoutRiskIndex >= 70;

    // 2. Dynamic Deep Work Duration
    // If burnout risk is high or recent energy is crashing, shorten blocks
    if (isBurnoutWarning) {
        suggestedMaxBlockDuration = 45; // Force shorter blocks to prevent exhaustion
    } else if (burnoutRiskIndex > 40) {
        suggestedMaxBlockDuration = 60;
    }

    // 3. Energy Correction Loop
    // Find time slots that are currently "Peak" but consistently yield poor focus/energy
    // For MVP, we'll do a simplified grouping by hour block (0-24)
    const hourStats = new Map<number, { count: number, totalFocus: number }>();

    // Group logs by hour
    for (const log of logs) {
        if (log.status !== "complete") continue;
        const block = schedule.find(b => b.id === log.schedule_block_id);
        if (!block) continue;

        const startMin = timeToMinutes(block.planned_start);
        const hour = Math.floor(startMin / 60);

        if (!hourStats.has(hour)) {
            hourStats.set(hour, { count: 0, totalFocus: 0 });
        }

        const stats = hourStats.get(hour)!;
        stats.count++;
        stats.totalFocus += log.focus_score;
    }

    // Downgrade energy slots if average focus is poor (< 3)
    for (const [hour, stats] of Array.from(hourStats.entries())) {
        if (stats.count >= 3) { // Require at least 3 occurrences to adjust
            const avgFocus = stats.totalFocus / stats.count;
            if (avgFocus < 3) {
                // Find and downgrade the overlapping energy slot
                for (const slot of adjustedEnergySlots) {
                    const startH = Math.floor(timeToMinutes(slot.start_time) / 60);
                    let endH = Math.floor(timeToMinutes(slot.end_time) / 60);
                    if (endH < startH) endH += 24;
                    const checkHour = (hour < startH && startH > 12) ? hour + 24 : hour;

                    if (checkHour >= startH && checkHour < endH) {
                        if (slot.energy_level === "peak") slot.energy_level = "medium";
                    }
                }
            }
        }
    }

    // 4. Predictive Categorical Learning
    // Map: Category -> EnergyZone -> { count, totalFocus }
    const catStats: Record<string, Record<string, { count: number, totalFocus: number }>> = {};

    for (const log of logs) {
        if (log.status !== "complete") continue;
        const block = schedule.find(b => b.id === log.schedule_block_id);
        if (!block || block.type !== "activity") continue;

        const activity = activities.find(a => a.id === block.activity_id);
        if (!activity || !activity.category) continue;

        const cat = activity.category;
        const zone = block.energy_zone;

        if (!catStats[cat]) catStats[cat] = {};
        if (!catStats[cat][zone]) catStats[cat][zone] = { count: 0, totalFocus: 0 };

        catStats[cat][zone].count++;
        catStats[cat][zone].totalFocus += log.focus_score;
    }

    // Populate Category Penalties
    for (const cat in catStats) {
        for (const zone in catStats[cat]) {
            const stats = catStats[cat][zone];
            if (stats.count >= 2) { // Need at least 2 logs to form a pattern
                const avgFocus = stats.totalFocus / stats.count;
                if (avgFocus < 3) {
                    if (!categoryPenalties[cat]) categoryPenalties[cat] = [];
                    if (!categoryPenalties[cat].includes(zone)) {
                        categoryPenalties[cat].push(zone);
                    }
                }
            }
        }
    }

    return {
        adjustedEnergySlots,
        suggestedMaxBlockDuration,
        burnoutRiskIndex,
        isBurnoutWarning,
        categoryPenalties
    };
}
