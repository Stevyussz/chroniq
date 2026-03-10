import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chroniq - Master Your Time with Biological AI Scheduling",
    description: "Align your tasks with your biological rhythm. Maximize focus with Chroniq's AI-driven automated scheduling engine.",
    openGraph: {
        title: "Chroniq - Biological AI Productivity",
        description: "Work with your rhythm. Prevent burnout and optimize your deep work sessions with Chroniq.",
        url: "https://chroniq.yusrilastaghina.my.id",
    }
};

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
