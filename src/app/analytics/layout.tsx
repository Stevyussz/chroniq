import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Analytics",
    description: "Track your productivity trends, focus scores, and real-time biological rhythm synchronization with Chroniq Analytics.",
    openGraph: {
        title: "Chroniq Analytics",
        description: "Visualize your focus and optimize your prime time.",
        url: "https://chroniq.yusrilastaghina.my.id/analytics",
    }
};

export default function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
