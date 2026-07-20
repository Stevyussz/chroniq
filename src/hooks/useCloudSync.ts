"use client";

import { useEffect, useState } from 'react';
import { usePoeStore } from '@/store/useStore';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useCloudSync() {
    const {
        user,
        activities,
        currentSchedule,
        executionLogs,
        exp,
        level,
        fixedBlocks,
        energySlots,
        aiReflectionText,
        aiReflectionDate,
        aiSuggestedEnergySlots,
        restoreData,
    } = usePoeStore();
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
                            restoreData(data.state);
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
    }, [restoreData]); // Run once on mount unless the store action reference changes

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
                    user,
                    activities,
                    currentSchedule,
                    executionLogs,
                    exp,
                    level,
                    fixedBlocks,
                    energySlots,
                    aiReflectionText,
                    aiReflectionDate,
                    aiSuggestedEnergySlots
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
        activities,
        aiReflectionDate,
        aiReflectionText,
        aiSuggestedEnergySlots,
        currentSchedule,
        energySlots,
        executionLogs,
        exp,
        fixedBlocks,
        isSyncing,
        level,
        user
    ]);

    return {
        isSyncing,
        lastSyncedMs
    };
}
