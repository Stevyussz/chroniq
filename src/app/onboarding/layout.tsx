import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Onboarding",
    robots: {
        index: false, // Do not index the onboarding pipeline
        follow: false,
    }
};

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
