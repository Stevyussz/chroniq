import { FixedBlock, EnergySlot, ScheduleBlock, ExecutionLog, Activity } from '@/types';
import { AllocatedActivity } from './allocation';
import { getZoneAtMinute } from './energyMapping';
import { analyzeExecutionHistory } from './adaptiveLearning';
import { timeToMinutes, minutesToTime } from './constraint';

/**
 * The core compiler that builds a sequential array of 24-hr schedule blocks.
 * Simplified algorithm for MVP:
 * 1. Mark FixedBlocks and Sleep.
 * 2. Find available time gaps.
 * 3. Place highest priority tasks in Peak zones, then Medium, then Low.
 * 4. Split tasks into Deep Work chunks (max 90 mins).
 */
export function generateSchedule(
    date: string,
    sleepHours: number,
    wakeUpTime: string, // typical "06:00"
    fixedBlocks: FixedBlock[],
    energySlots: EnergySlot[],
    allocatedActivities: AllocatedActivity[],
    executionLogs: ExecutionLog[] = [], // Pass in historical logs for self-learning
    historicalSchedule: ScheduleBlock[] = [], // Pass in historical schedule
    rawActivities: Activity[] = [] // Needed for category lookup
): ScheduleBlock[] {
    const schedule: ScheduleBlock[] = [];

    // Phase 4 & Phase 14: Adaptive Learning!
    const learningAnalysis = analyzeExecutionHistory(executionLogs, historicalSchedule, energySlots, rawActivities);
    const activeEnergySlots = learningAnalysis.adjustedEnergySlots;
    const dynamicMaxBlock = learningAnalysis.suggestedMaxBlockDuration;
    const catPenalties = learningAnalysis.categoryPenalties;

    const wakeUpTarget = timeToMinutes(wakeUpTime);
    const sleepStartTarget = (wakeUpTarget - (sleepHours * 60) + 24 * 60) % (24 * 60);

    // 1. Mark Fixed Blocks
    for (const block of fixedBlocks) {
        schedule.push({
            id: `fixed-${block.id}`,
            user_id: block.user_id,
            date,
            activity_id: block.id, // reference to fixed block ID
            planned_start: block.start_time,
            planned_end: block.end_time,
            energy_zone: getZoneAtMinute(timeToMinutes(block.start_time), activeEnergySlots),
            type: "fixed"
        });
    }

    // 2. Mark Sleep Block
    schedule.push({
        id: `sleep-block`,
        user_id: "user", // to be injected later or replaced
        date,
        activity_id: "sleep",
        planned_start: minutesToTime(sleepStartTarget),
        planned_end: wakeUpTime,
        energy_zone: "low",
        type: "sleep"
    });

    // 2.5 Mark Wind Down Buffer (60 mins before sleep)
    const windDownDuration = 60;
    const windDownStartTarget = sleepStartTarget - windDownDuration < 0 ? (sleepStartTarget - windDownDuration + 24 * 60) : (sleepStartTarget - windDownDuration);
    schedule.push({
        id: `wind-down-block`,
        user_id: "user",
        date,
        activity_id: "wind-down",
        planned_start: minutesToTime(windDownStartTarget),
        planned_end: minutesToTime(sleepStartTarget),
        energy_zone: "low",
        type: "sleep" // Fallback to a valid union type, since wind-down is treated like a low energy rest
    });

    // 2.6 Constraints: AI 'preferred_start' is now treated as a soft 'earliest_start' constraint, NOT a forced pseudo-fixed block.
    // This allows activities to dynamically stack sequentially instead of fighting for the exact same minute.

    // Sort existing blocks to find gaps
    const occupiedRanges: { start: number, end: number }[] = [];

    for (const s of schedule) {
        const sStart = timeToMinutes(s.planned_start);
        const sEnd = timeToMinutes(s.planned_end);

        if (sEnd < sStart) {
            // It's an overnight block (e.g. 22:00 to 06:00)
            // We split it into two: [start, 24:00] and [00:00, end]
            occupiedRanges.push({ start: sStart, end: 24 * 60 });
            occupiedRanges.push({ start: 0, end: sEnd });
        } else {
            occupiedRanges.push({ start: sStart, end: sEnd });
        }
    }

    occupiedRanges.sort((a, b) => a.start - b.start);

    // Flatten overlaps in occupiedRanges
    const mergedRanges: { start: number, end: number }[] = [];
    for (const r of occupiedRanges) {
        if (mergedRanges.length === 0) {
            mergedRanges.push(r);
        } else {
            const last = mergedRanges[mergedRanges.length - 1];
            if (r.start <= last.end) {
                last.end = Math.max(last.end, r.end);
            } else {
                mergedRanges.push(r);
            }
        }
    }

    // Find free gaps
    const freeGaps: { start: number, end: number, duration: number }[] = [];
    for (let i = 0; i < mergedRanges.length - 1; i++) {
        const gapStart = mergedRanges[i].end;
        const gapEnd = mergedRanges[i + 1].start;
        if (gapEnd > gapStart) {
            freeGaps.push({ start: gapStart, end: gapEnd, duration: gapEnd - gapStart });
        }
    }
    // Also gap before first and after last
    const first = mergedRanges[0];
    const last = mergedRanges[mergedRanges.length - 1];
    if (first && first.start > 0) {
        freeGaps.push({ start: 0, end: first.start, duration: first.start });
    }
    if (last && last.end < 24 * 60) {
        freeGaps.push({ start: last.end, end: 24 * 60, duration: 24 * 60 - last.end });
    }

    freeGaps.sort((a, b) => a.start - b.start);

    // 3. Place Activities
    // Sort activities by priority FIRST, then by Category to group similar tasks (minimizing Attention Residue / Context Switching),
    // THEN by longest duration first (Bin Packing heuristic LPT).
    const activitiesToPlace = [...allocatedActivities].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority; // Primary: Priority
        const catA = rawActivities.find(ra => ra.id === a.id)?.category || "none";
        const catB = rawActivities.find(ra => ra.id === b.id)?.category || "none";
        if (catA !== catB) return catA.localeCompare(catB); // Secondary: Group by category
        return b.allocated_duration - a.allocated_duration; // Tertiary: Longest tasks first
    });

    // Parkinson's Law Compression
    // Time expands to fill the space allotted. To force efficiency, we slightly compress (10%) the allocated time for Low Priority (<=2) or Ad-Hoc tasks.
    activitiesToPlace.forEach(act => {
        const cat = rawActivities.find(ra => ra.id === act.id)?.category || "";
        if (act.priority <= 2 || cat.includes("Ad-Hoc") || cat.includes("Tugas Ringan")) {
            act.allocated_duration = Math.max(15, Math.floor(act.allocated_duration * 0.9)); // Reduce by 10%, min 15m
        }
    });

    // Greedy placement with Deep Work rules
    // Max block is now dynamic based on burnout risk
    const maxBlock = dynamicMaxBlock; // mins
    const breakDuration = 10; // mins
    let currentConsecutiveBlocks = 0;
    let lastPlacedEnd: number | null = null;

    for (const activity of activitiesToPlace) {
        let remainingToPlace = activity.allocated_duration;

        while (remainingToPlace > 0) {
            const minChunkSize = 25;

            // 1. Determine preferred zones based on priority (STRICT CIRCADIAN RULES)
            let targetZones: ("peak" | "medium" | "low")[] = [];
            if (activity.priority === 5) targetZones = ["peak", "medium"]; // Scientifically reject 'low' energy for critical tasks
            else if (activity.priority === 4) targetZones = ["peak", "medium", "low"]; // Try Peak first
            else if (activity.priority === 3) targetZones = ["medium", "peak", "low"]; // Try Medium first
            else targetZones = ["low", "medium", "peak"]; // Try Low first

            // 1.5 Phase 14: AI Penalty Check
            // Check if this activity's category is historically penalized in any zone
            const activityCategory = rawActivities.find(a => a.id === activity.id)?.category;
            const penalizedZones = (activityCategory && catPenalties[activityCategory]) ? catPenalties[activityCategory] : [];

            let bestGapIndex = -1;

            // 1.8 AI Time Constraint Engine (Superior Smart System)
            // If the AI gave this activity a preferred_start (e.g. "14:30"), we truncate the available gaps dynamically
            // so we ONLY search gaps AFTER that time.
            let allowedGaps = freeGaps.map(g => ({ ...g })); // shallow copy

            if (activity.preferred_start) {
                const earliestMin = timeToMinutes(activity.preferred_start);
                allowedGaps = allowedGaps.map(g => {
                    if (g.end <= earliestMin) return null; // Too early, drop it
                    if (g.start < earliestMin) {
                        return { start: earliestMin, end: g.end, duration: g.end - earliestMin }; // Trim it
                    }
                    return g; // Valid
                }).filter(Boolean) as { start: number, end: number, duration: number }[];
            }

            // Search gaps matching preferred zones first, STRICTLY avoiding penalized zones
            for (const zone of targetZones) {
                if (penalizedZones.includes(zone)) continue; // AI says don't do this here!

                bestGapIndex = allowedGaps.findIndex(g => g.duration >= minChunkSize && getZoneAtMinute(g.start, activeEnergySlots) === zone);
                if (bestGapIndex !== -1) break;
            }

            // Fallback 1: Any non-penalized zone
            if (bestGapIndex === -1) {
                bestGapIndex = allowedGaps.findIndex(g => {
                    if (g.duration < minChunkSize) return false;
                    const zone = getZoneAtMinute(g.start, activeEnergySlots);
                    return !penalizedZones.includes(zone as "peak" | "medium" | "low");
                });
            }

            // Fallback 2: Any gap ignoring penalties (Desperation mode, timeline is full)
            if (bestGapIndex === -1) {
                bestGapIndex = allowedGaps.findIndex(g => g.duration >= minChunkSize);
            }

            if (bestGapIndex === -1) break; // no more capacity anywhere

            const chosenGap = allowedGaps[bestGapIndex];
            const originalGapIndex = freeGaps.findIndex(g => g.end === chosenGap.end);

            const gap = originalGapIndex !== -1 ? freeGaps[originalGapIndex] : null;
            if (!gap) break;

            const chunkDuration = Math.min(remainingToPlace, chosenGap.duration, maxBlock);

            const chunkStart = chosenGap.start;
            const chunkEnd = chunkStart + chunkDuration;

            // Reset deep work consecutive blocks if a natural gap occurred (brain rested naturally)
            if (lastPlacedEnd !== null && chunkStart > lastPlacedEnd) {
                currentConsecutiveBlocks = 0;
            }

            schedule.push({
                id: `act-${activity.id}-${Date.now()}-${Math.random()}`,
                user_id: activity.user_id,
                date,
                activity_id: activity.id,
                planned_start: minutesToTime(chunkStart),
                planned_end: minutesToTime(chunkEnd),
                energy_zone: getZoneAtMinute(chunkStart, activeEnergySlots),
                type: "activity"
            });

            remainingToPlace -= chunkDuration;
            currentConsecutiveBlocks++;
            lastPlacedEnd = chunkEnd;

            // Adjust true freeGap
            if (gap.start === chunkStart) {
                gap.start += chunkDuration;
                gap.duration -= chunkDuration;
            } else {
                // We trimmed the start of the gap, meaning we cut a hole in it!
                // For simplicity in this heuristic engine, we just advance the global gap start
                // to consume whatever preceded it so we don't back-track.
                gap.start = chunkEnd;
                gap.duration = gap.end - chunkEnd;
            }

            // Deep work break injection
            if (currentConsecutiveBlocks >= 3 && gap.duration >= breakDuration) {
                schedule.push({
                    id: `break-${Date.now()}-${Math.random()}`,
                    user_id: activity.user_id,
                    date,
                    activity_id: "break",
                    planned_start: minutesToTime(gap.start),
                    planned_end: minutesToTime(gap.start + breakDuration),
                    energy_zone: getZoneAtMinute(gap.start, activeEnergySlots),
                    type: "break"
                });
                gap.start += breakDuration;
                gap.duration -= breakDuration;
                currentConsecutiveBlocks = 0;
                lastPlacedEnd = chunkEnd + breakDuration;
            }
        }
    }

    // Sort final schedule by start time
    schedule.sort((a, b) => {
        return timeToMinutes(a.planned_start) - timeToMinutes(b.planned_start);
    });

    return schedule;
}
