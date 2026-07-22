"use client";

import React from "react";
import { Activity } from "@/types";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trash2 } from "lucide-react";

interface LongRangePlanPanelProps {
    activities: Activity[];
    onDeleteActivity: (activityId: string) => void;
}

function formatDate(dateISO: string) {
    return new Date(`${dateISO}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

export function LongRangePlanPanel({ activities, onDeleteActivity }: LongRangePlanPanelProps) {
    const today = new Date().toISOString().split("T")[0];
    const upcomingActivities = activities
        .filter((activity) => !activity.is_completed && activity.scheduled_date && activity.scheduled_date > today)
        .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))
        .slice(0, 18);

    if (upcomingActivities.length === 0) return null;

    const grouped = upcomingActivities.reduce<Record<string, Activity[]>>((acc, activity) => {
        const date = activity.scheduled_date || today;
        acc[date] = [...(acc[date] || []), activity];
        return acc;
    }, {});

    return (
        <section className="rounded-3xl border border-[#c7d2fe]/60 bg-white/55 p-5 shadow-sm backdrop-blur-md dark:border-[#818cf8]/20 dark:bg-[#1e1e24]/55">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5] dark:bg-[#312e81]/40 dark:text-[#c7d2fe]">
                        <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-[#1f2937] dark:text-[#e5edf8]">Upcoming Study Plan</h2>
                        <p className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">
                            {upcomingActivities.length} sesi tersimpan untuk hari berikutnya
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {Object.entries(grouped).map(([date, items]) => (
                    <div key={date} className="grid gap-2 sm:grid-cols-[6rem_1fr]">
                        <div className="text-xs font-black uppercase tracking-wide text-[#4f46e5] dark:text-[#c7d2fe]">
                            {formatDate(date)}
                        </div>
                        <div className="space-y-2">
                            {items.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-[#111827]/45"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate font-bold text-[#334155] dark:text-[#dbeafe]">{activity.name}</div>
                                        <div className="mt-0.5 text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">
                                            {activity.target_duration} menit · Priority {activity.priority} · {activity.category}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-xl text-[#ef4444] hover:bg-[#fee2e2] dark:hover:bg-[#7f1d1d]/25"
                                        onClick={() => onDeleteActivity(activity.id)}
                                        aria-label={`Hapus ${activity.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
