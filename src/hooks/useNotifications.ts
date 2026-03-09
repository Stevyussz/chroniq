"use client";

import { useEffect, useRef } from 'react';
import { usePoeStore } from '@/store/useStore';

export function useNotifications() {
    const { currentSchedule, pushNotificationsEnabled, setPushNotificationsEnabled } = usePoeStore();
    const notifiedBlocksRef = useRef<Set<string>>(new Set());

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

    // 2. Schedule Polling Interval
    useEffect(() => {
        if (!pushNotificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
            return; // Exit if disabled or not allowed
        }

        const checkSchedule = () => {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const todayStr = now.toISOString().split('T')[0];

            currentSchedule.forEach(block => {
                // Only consider blocks for today
                if (block.date !== todayStr) return;

                // Parse planned_start to minutes
                const [h, m] = block.planned_start.split(':').map(Number);
                const startMins = h * 60 + m;

                const diff = startMins - currentMins;

                // If the block starts exactly in 5 minutes (or 4-5 mins window)
                if (diff > 0 && diff <= 5) {
                    // Check if we already notified for this block ID
                    if (!notifiedBlocksRef.current.has(block.id)) {
                        
                        // Fire Notification
                        new Notification("Chroniq: Bersiap!", {
                            body: `Tugas selanjutnya akan dimulai dalam ${diff} menit. Siapkan dirimu!`,
                            icon: "/icon.png"
                        });

                        // Mark as notified so we don't spam every interval tick
                        notifiedBlocksRef.current.add(block.id);
                    }
                }
            });
        };

        // Run the check immediately, then every 30 seconds
        checkSchedule();
        const intervalId = setInterval(checkSchedule, 30000);

        return () => clearInterval(intervalId);

    }, [currentSchedule, pushNotificationsEnabled]);

    // Optional: Return a helper function to manually request permission
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert("Browser kamu tidak mendukung notifikasi desktop.");
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
