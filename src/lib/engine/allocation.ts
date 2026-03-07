import { Activity } from '@/types';

export interface AllocatedActivity extends Activity {
    allocated_duration: number; // The actual time allocated by the engine
}

/**
 * Allocates flexible time based on priority weights.
 * TotalPriorityWeight = Σ(priority × target_duration)
 * ActivityShare = (priority / total_priority) × FlexibleTime
 * If target_duration > ActivityShare -> Trim lower priority
 */
export function allocateTime(activities: Activity[], flexibleTimeMinutes: number): AllocatedActivity[] {
    if (activities.length === 0 || flexibleTimeMinutes <= 0) return [];

    // Step 1: Calculate Total Priority Weight
    let totalPriorityWeight = 0;
    for (const activity of activities) {
        totalPriorityWeight += (activity.priority * activity.target_duration);
    }

    // Step 2: Tentative Allocation
    const allocatedActivities: AllocatedActivity[] = [];
    let totalAllocated = 0;

    for (const activity of activities) {
        const weight = activity.priority * activity.target_duration;

        // Theoretical fair share based on weight
        const theoreticalShare = Math.floor((weight / totalPriorityWeight) * flexibleTimeMinutes);

        // We shouldn't allocate MORE than they requested
        const allocated_duration = Math.min(activity.target_duration, theoreticalShare);

        totalAllocated += allocated_duration;
        allocatedActivities.push({ ...activity, allocated_duration });
    }

    // Step 3: Redistribute unused time if we actually allocated less than target because of fair share,
    // or if we have leftover flexible time because target < theoreticalShare for some tasks.
    let leftoverTime = flexibleTimeMinutes - totalAllocated;

    if (leftoverTime > 0) {
        // Sort by priority descending to give leftovers to high priority first
        const sortedDesc = [...allocatedActivities].sort((a, b) => b.priority - a.priority);
        for (const act of sortedDesc) {
            if (leftoverTime <= 0) break;
            const shortage = act.target_duration - act.allocated_duration;
            if (shortage > 0) {
                const amountToAdd = Math.min(shortage, leftoverTime);
                act.allocated_duration += amountToAdd;
                leftoverTime -= amountToAdd;

                // update the original array instance
                const index = allocatedActivities.findIndex(a => a.id === act.id);
                if (index >= 0) {
                    allocatedActivities[index].allocated_duration = act.allocated_duration;
                }
            }
        }
    }

    // Step 4: Minimum threshold trim (e.g. don't schedule a 5 min task if it's supposed to be 60. Actually just keep it for now)

    return allocatedActivities;
}
