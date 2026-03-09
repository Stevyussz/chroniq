"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check, Loader2, ArrowDownUp, RefreshCw, Bell, BellOff } from "lucide-react";
import { usePoeStore } from "@/store/useStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useGoogleLogin } from "@react-oauth/google";

export function GoogleCalendarSync() {
    const { user, addFixedBlock, setGcalToken, gcalToken, autoPushGcal, setAutoPushGcal, pushNotificationsEnabled, setPushNotificationsEnabled } = usePoeStore();
    const { requestNotificationPermission } = useNotifications();
    const [isLoading, setIsLoading] = useState(false);

    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    // Login Hook tailored for Calendar scopes
    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            // We store the access token in Zustand
            setGcalToken(codeResponse.access_token);
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    });

    const handleSignOut = () => {
        setGcalToken(null);
        setAutoPushGcal(false); // disable push if logged out
    };

    const pullEventsToday = async () => {
        if (!gcalToken) return;
        setIsLoading(true);

        try {
            // Calculate today boundaries
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`, {
                headers: {
                    Authorization: `Bearer ${gcalToken}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    setGcalToken(null); // Token expired
                    throw new Error("Token expired");
                }
                throw new Error("Failed to fetch calendar");
            }

            const data = await res.json();
            const events = data.items;

            if (events && events.length > 0) {
                events.forEach((event: { start: { dateTime: string }, end: { dateTime: string }, summary: string, id: string }) => {
                    const start = event.start?.dateTime;
                    const end = event.end.dateTime;

                    // We only care about specific timed events (not all-day events which only have 'date')
                    if (!start || !end) return;

                    // Don't pull events that Chroniq just pushed to avoid duplicate loop loops
                    if (event.summary && event.summary.startsWith("[CHRONIQ]")) return;

                    const startTimeStr = start.split('T')[1].substring(0, 5); // "HH:MM"
                    const endTimeStr = end.split('T')[1].substring(0, 5); // "HH:MM"

                    addFixedBlock({
                        id: `gcal-${event.id}`,
                        user_id: user?.id || "user",
                        title: `[GCal] ${event.summary || "Busy"}`,
                        start_time: startTimeStr,
                        end_time: endTimeStr
                    });
                });
            }
        } catch (error) {
            console.error("GCal Pull Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!CLIENT_ID || CLIENT_ID.includes("PASTE_CLIENT_ID")) {
        return (
            <Button disabled variant="outline" className="w-full justify-start text-[#a1887f] border-[#efebe9] bg-[#fffdf5] opacity-70">
                <CalendarDays className="w-4 h-4 mr-2" />
                Google Calendar (Konfigurasi .env diperlukan)
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4 bg-white border-2 border-[#efebe9] rounded-2xl">
            {!gcalToken ? (
                <Button
                    onClick={() => login()}
                    className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-md font-medium flex items-center justify-center gap-2 h-11"
                >
                    <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        <path fill="none" d="M1 1h22v22H1z" />
                    </svg>
                    Connect Google Calendar
                </Button>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#4285F4] flex items-center gap-1.5">
                            <Check className="w-4 h-4 bg-[#e8f0fe] rounded-full p-0.5" /> GCal Terhubung
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 text-xs text-[#a1887f] hover:text-[#d32f2f] hover:bg-[#ffebee]">
                            Putuskan
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={pullEventsToday}
                            disabled={isLoading}
                            variant="outline"
                            className="bg-[#fffdf5] border-[#ffccbc] text-[#bf360c] hover:bg-[#fff5f2]"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Tarik Jadwal
                        </Button>

                        <Button
                            onClick={() => setAutoPushGcal(!autoPushGcal)}
                            className={`${autoPushGcal ? 'bg-[#81c784] hover:bg-[#66bb6a] text-white' : 'bg-[#efebe9] text-[#8d6e63] hover:bg-[#e7e0db]'}`}
                        >
                            <ArrowDownUp className="w-4 h-4 mr-2" />
                            Auto-Push: {autoPushGcal ? "ON" : "OFF"}
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-[#a1887f] leading-tight mt-2 mb-2">
                        Jika Auto-Push ON, setiap kali Engine merombak jadwal, blok Chroniq akan otomatis dikirim sebagai acara &quot;Sibuk&quot; ke Kalender Anda.
                    </p>
                </>
            )}

            <div className="border-t border-[#efebe9] dark:border-[#efebe9]/10 pt-3 mt-1">
                <Button
                    onClick={async () => {
                        if (!pushNotificationsEnabled) {
                            await requestNotificationPermission();
                        } else {
                            // Turn it off manually in the store
                            setPushNotificationsEnabled(false);
                        }
                    }}
                    variant="outline"
                    className={`w-full justify-start border border-[#efebe9] ${
                        pushNotificationsEnabled 
                        ? 'bg-[#e8f0fe] text-[#1967d2] hover:bg-[#d2e3fc]' 
                        : 'bg-[#fffdf5] text-[#8d6e63] hover:bg-[#efebe9]'
                    }`}
                >
                    {pushNotificationsEnabled ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                    Web Push Notif: {pushNotificationsEnabled ? "ON" : "OFF"}
                </Button>
                <p className="text-[10px] text-[#a1887f] leading-tight text-center mt-2">
                    Notifikasi muncul 5 menit sebelum sebuah jadwal dimulai.
                </p>
            </div>
        </div>
    );
}
