"use client";

import { useCloudSync } from "@/hooks/useCloudSync";
import { ThemeProvider } from "./ThemeProvider";
import { useNotifications } from "@/hooks/useNotifications";

export function Providers({ children }: { children: React.ReactNode }) {
    // This hook will now run persistently at the root of the app
    // to silently backup local Zustand state to Firebase
    // and hydrate state from Firebase on fresh logins.
    useCloudSync();

    // This hook runs persistently to poll and trigger Web Push Notifications
    // exactly 5 minutes before the next scheduled task begins
    useNotifications();

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    );
}
