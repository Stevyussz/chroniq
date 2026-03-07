import { FixedBlock } from '@/types';

/**
 * Helper to parse "HH:mm" into minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Helper to format minutes since midnight to "HH:mm"
 */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calculates the total flexible time available in minutes
 * FlexibleTime = 24h - sleep_hours - fixed_blocks_total
 */
export function calculateFlexibleTime(sleepHours: number, fixedBlocks: FixedBlock[]): number {
    const totalMinutesInDay = 24 * 60;
    const sleepMinutes = sleepHours * 60;

    let fixedBlocksMinutes = 0;
    for (const block of fixedBlocks) {
        const startObj = timeToMinutes(block.start_time);
        let endObj = timeToMinutes(block.end_time);

        // Handle overnight blocks (e.g., 23:00 to 02:00)
        if (endObj < startObj) {
            endObj += 24 * 60;
        }

        fixedBlocksMinutes += (endObj - startObj);
    }

    const flexibleTime = totalMinutesInDay - sleepMinutes - fixedBlocksMinutes;

    return Math.max(0, flexibleTime);
}

/**
 * Validates if the schedule is feasible
 */
export function validateFeasibility(sleepHours: number, fixedBlocks: FixedBlock[]): { isFeasible: boolean; error?: string } {
    const flexibleTime = calculateFlexibleTime(sleepHours, fixedBlocks);
    if (flexibleTime <= 0) {
        return { isFeasible: false, error: 'Tidak ada waktu luang (waktu fleksibel habis).' };
    }

    if (sleepHours < 4) {
        return { isFeasible: false, error: 'Peringatan: Waktu tidur tidak realistis (< 4 jam).' };
    }

    return { isFeasible: true };
}
