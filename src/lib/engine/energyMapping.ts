import { EnergySlot } from '@/types';
import { timeToMinutes } from './constraint';

export type EnergyZone = "peak" | "medium" | "low";

/**
 * Returns the recommended energy zone for a given priority
 * Rule: Priority 4-5 -> Peak, Priority 3 -> Medium, Priority 1-2 -> Low
 */
export function getRecommendedZone(priority: number): EnergyZone {
    if (priority >= 4) return "peak";
    if (priority === 3) return "medium";
    return "low";
}

/**
 * Helper to identify what zone a specific minute belongs to.
 * This is a simplified mapper assuming EnergySlots cover the whole day or default to Medium.
 */
export function getZoneAtMinute(minute: number, energySlots: EnergySlot[]): EnergyZone {
    let resolvedZone: EnergyZone = "medium"; // default fallback

    for (const slot of energySlots) {
        const start = timeToMinutes(slot.start_time);
        let end = timeToMinutes(slot.end_time);
        if (end < start) end += 24 * 60;

        // handle minute wrapping for overnight checks
        const checkMinute = (minute < start && start > 12 * 60) ? minute + 24 * 60 : minute;

        if (checkMinute >= start && checkMinute < end) {
            resolvedZone = slot.energy_level;
            break;
        }
    }

    // SCIENCE FIX #4: Post-Lunch Dip Protection (Tietzel & Lack, 2001)
    // Universal circadian dip occurs between 13:00 and 15:00 (780 - 900 minutes)
    // If a zone is "peak" during this time, we downgrade it to "medium" to protect against
    // cognitive overload during the biological slump.
    const normalizedMinute = minute % (24 * 60);
    if (normalizedMinute >= 780 && normalizedMinute <= 900 && resolvedZone === "peak") {
        resolvedZone = "medium";
    }

    return resolvedZone;
}
