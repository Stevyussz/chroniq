"use client";

import { useEffect, useRef } from 'react';
import { usePoeStore } from '@/store/useStore';

export function useNotifications() {
    const { currentSchedule, activities, pushNotificationsEnabled, setPushNotificationsEnabled } = usePoeStore();
    const notifiedBlocksRef = useRef<Set<string>>(new Set());
    const deadlineNotifiedRef = useRef<Set<string>>(new Set()); // prevent duplicate deadline alerts per day

    // 1. Initial Permission Sync
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted' && !pushNotificationsEnabled) {
                setPushNotificationsEnabled(true);
            } else if (Notification.permission === 'denied' && pushNotificationsEnabled) {
                setPushNotificationsEnabled(false);
            }
        }
    }, [pushNotificationsEnabled, setPushNotificationsEnabled]);

    // 2. Schedule Polling — 5-minute task reminder
    useEffect(() => {
        if (!pushNotificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const checkSchedule = () => {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const todayStr = now.toISOString().split('T')[0];

            currentSchedule.forEach(block => {
                if (block.date !== todayStr) return;
                if (block.type !== 'activity') return;

                const [h, m] = block.planned_start.split(':').map(Number);
                const startMins = h * 60 + m;
                const diff = startMins - currentMins;

                // Remind exactly 5 minutes before
                if (diff > 0 && diff <= 5 && !notifiedBlocksRef.current.has(block.id)) {
                    const state = usePoeStore.getState();
                    const act = state.activities.find(a => a.id === block.activity_id);
                    const taskName = act?.name || 'Tugas selanjutnya';

                    new Notification("⏰ Chroniq: Segera Dimulai!", {
                        body: `"${taskName}" akan dimulai dalam ${diff} menit. Siapkan dirimu!`,
                        icon: "/icon.png",
                        badge: "/icon.png",
                    });
                    notifiedBlocksRef.current.add(block.id);
                }
            });
        };

        checkSchedule();
        const intervalId = setInterval(checkSchedule, 30000);
        return () => clearInterval(intervalId);
    }, [currentSchedule, pushNotificationsEnabled]);

    // 3. Deadline Reminder — fires once per day for urgent tasks
    useEffect(() => {
        if (!pushNotificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const urgentToday = activities.filter(a => a.deadline === todayStr && !a.is_completed);
        const urgentTomorrow = activities.filter(a => a.deadline === tomorrowStr && !a.is_completed);

        const allUrgent = [...urgentToday, ...urgentTomorrow];

        allUrgent.forEach(act => {
            const notifKey = `deadline-${act.id}-${todayStr}`;
            if (!deadlineNotifiedRef.current.has(notifKey)) {
                const isToday = act.deadline === todayStr;
                new Notification(`📅 Deadline ${isToday ? 'Hari Ini!' : 'Besok!'}`, {
                    body: `"${act.name}" ${isToday ? 'harus selesai hari ini' : 'jatuh tempo besok'}. Jangan sampai terlewat!`,
                    icon: "/icon.png",
                });
                deadlineNotifiedRef.current.add(notifKey);
            }
        });
    }, [activities, pushNotificationsEnabled]);

    // 4. Good Morning Notification — fires once when app opens in the morning
    useEffect(() => {
        if (!pushNotificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const hour = new Date().getHours();
        if (hour < 6 || hour > 11) return; // Only morning (6:00 - 11:59)

        const todayStr = new Date().toISOString().split('T')[0];
        const gmKey = `good-morning-${todayStr}`;

        if (!sessionStorage.getItem(gmKey)) {
            // Delay slightly so app can finish loading
            const t = setTimeout(() => {
                const state = usePoeStore.getState();
                const taskCount = state.currentSchedule.filter(b => b.type === 'activity' && b.date === todayStr).length;
                new Notification("🌅 Selamat Pagi dari Chroniq!", {
                    body: taskCount > 0
                        ? `Jadwalmu siap! Ada ${taskCount} blok tugas menunggumu hari ini. Mulai dari yang terberat dulu!`
                        : "Jadwal harianmu belum terisi. Yuk mulai dengan Brain Dump — ceritakan rencanamu!",
                    icon: "/icon.png",
                });
            }, 2000);
            sessionStorage.setItem(gmKey, '1');
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pushNotificationsEnabled]);

    // Optional: Return a helper function to manually request permission (no alert())
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            console.warn("Browser ini tidak mendukung notifikasi desktop.");
            return false;
        }
        try {
            const permission = await Notification.requestPermission();
            setPushNotificationsEnabled(permission === 'granted');
            return permission === 'granted';
        } catch (error) {
            console.error("Error asking for notification permission:", error);
            return false;
        }
    };

    return { requestNotificationPermission };
}
