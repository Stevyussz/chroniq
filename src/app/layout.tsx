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
    title: "Chroniq",
    description: "Work with your rhythm.",
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
