"use client";

import { useEffect, useState } from 'react';
import { usePoeStore } from '@/store/useStore';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useCloudSync() {
    const store = usePoeStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedMs, setLastSyncedMs] = useState(0);

    // 1. Listen for Auth Changes and Hydrate
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
            if (fbUser) {
                console.log("[CloudSync] User logged in:", fbUser.uid);
                setIsSyncing(true);
                try {
                    const docRef = doc(db, 'users', fbUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Merge important store state if exists
                        if (data.state) {
                            console.log("[CloudSync] Hydrating from Cloud:", data.state);
                            store.restoreData(data.state);
                        }
                    } else {
                        console.log("[CloudSync] No cloud save found. Creating new document.");
                    }
                } catch (error) {
                    console.error("[CloudSync] Error fetching cloud data.", error);
                } finally {
                    setIsSyncing(false);
                }
            }
        });

        return () => unsubscribe();
    }, []); // Run once on mount

    // 2. Push Changes Automatically (Debounced)
    useEffect(() => {
        // We only want to auto-push if the user is actively logged in
        if (!auth.currentUser || isSyncing) return;

        const pushData = async () => {
            try {
                const uid = auth.currentUser!.uid;
                const docRef = doc(db, 'users', uid);

                // We only save core persistent state, skipping transient UI state
                const payload = {
                    user: store.user,
                    activities: store.activities,
                    currentSchedule: store.currentSchedule,
                    executionLogs: store.executionLogs,
                    exp: store.exp,
                    level: store.level,
                    fixedBlocks: store.fixedBlocks,
                    energySlots: store.energySlots,
                    aiReflectionText: store.aiReflectionText,
                    aiReflectionDate: store.aiReflectionDate,
                    aiSuggestedEnergySlots: store.aiSuggestedEnergySlots
                };

                await setDoc(docRef, {
                    state: payload,
                    lastUpdated: new Date().toISOString() // Server tracking
                }, { merge: true });

                setLastSyncedMs(Date.now());
                console.log("[CloudSync] Auto-saved to Cloud!");

            } catch (error) {
                console.error("[CloudSync] Auto-save failed:", error);
            }
        };

        // Debounce logic: only save if state hasn't changed for 3 seconds
        const timeoutId = setTimeout(() => {
            pushData();
        }, 3000);

        return () => clearTimeout(timeoutId);

    }, [
        // Dependencies that trigger a push:
        store.activities,
        store.currentSchedule,
        store.executionLogs,
        store.user,
        store.exp,
        store.fixedBlocks
    ]);

    return {
        isSyncing,
        lastSyncedMs
    };
}
