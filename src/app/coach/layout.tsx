import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI Coach",
    description: "Chat with Chroniq AI to reflect, re-plan, and automatically manage your daily schedule based on your focus levels.",
    openGraph: {
        title: "Chroniq AI Coach",
        description: "Your personal AI productivity assistant. Automatically schedules your day and prevents burnout.",
        url: "https://chroniq.yusrilastaghina.my.id/coach",
    }
};

export default function CoachLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
