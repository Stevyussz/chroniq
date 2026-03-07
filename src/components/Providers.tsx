"use client";

import { useCloudSync } from "@/hooks/useCloudSync";

export function Providers({ children }: { children: React.ReactNode }) {
    // This hook will now run persistently at the root of the app
    // to silently backup local Zustand state to Firebase
    // and hydrate state from Firebase on fresh logins.
    useCloudSync();

    return <>{children}</>;
}
