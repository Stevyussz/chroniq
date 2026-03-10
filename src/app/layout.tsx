import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor: "#FDFBF7",
};

export const metadata: Metadata = {
    metadataBase: new URL("https://chroniq.yusrilastaghina.my.id"),
    title: {
        default: "Chroniq - Biological Rhythm & AI Productivity Scheduler",
        template: "%s | Chroniq"
    },
    description: "Chroniq is a cutting-edge productivity app that auto-tunes your schedule according to your biological prime time and energy levels using Advanced AI.",
    keywords: ["Chroniq", "AI Productivity", "Schedule Optimizer", "Time Blocking", "Biological Prime Time", "Habit Tracker", "Yusril Astaghina"],
    authors: [{ name: "Yusril Astaghina" }],
    creator: "Yusril Astaghina",
    openGraph: {
        type: "website",
        locale: "id_ID",
        url: "https://chroniq.yusrilastaghina.my.id",
        title: "Chroniq - Smart Productivity Engine",
        description: "Align your tasks with your biological rhythm. Maximize focus with AI-driven automated scheduling.",
        siteName: "Chroniq"
    },
    twitter: {
        card: "summary_large_image",
        title: "Chroniq - AI Productivity Planner",
        description: "Work with your rhythm. Prevent burnout and optimize your deep work sessions with Chroniq.",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Chroniq",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    return (
        <html lang="id">
            <body className={`${inter.className} min-h-screen bg-[#FDFBF7] text-[#4a4a4a] antialiased pb-[max(1rem,env(safe-area-inset-bottom))]`}>
                <GoogleOAuthProvider clientId={clientId}>
                    <Providers>
                        <Navbar />
                        <main>
                            {children}
                        </main>
                    </Providers>
                </GoogleOAuthProvider>
            </body>
        </html>
    );
}
