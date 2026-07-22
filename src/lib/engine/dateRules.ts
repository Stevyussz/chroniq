import { Activity } from "@/types";

export function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(dateISO: string) {
    return new Date(`${dateISO}T00:00:00`).getDay();
}

export function isActivityDueOnDate(activity: Activity, dateISO: string) {
    const anchorDate = activity.scheduled_date || activity.date_added;

    if (anchorDate && anchorDate > dateISO) return false;

    if (!activity.recurrence || activity.recurrence === "none") {
        // Past unfinished planned tasks roll forward instead of disappearing.
        return !activity.scheduled_date || activity.scheduled_date <= dateISO;
    }

    if (activity.recurrence === "daily") return true;
    if (activity.recurrence === "weekdays") {
        const day = getDayOfWeek(dateISO);
        return day >= 1 && day <= 5;
    }
    if (activity.recurrence === "weekly") {
        return getDayOfWeek(anchorDate || dateISO) === getDayOfWeek(dateISO);
    }

    return true;
}
