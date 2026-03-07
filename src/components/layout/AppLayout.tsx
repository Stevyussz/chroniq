import React from 'react';
import Link from 'next/link';

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 flex flex-col">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="font-bold text-lg tracking-tight">
                        POE <span className="text-slate-500 font-normal">v1.0</span>
                    </div>
                    <nav className="flex gap-4 text-sm font-medium">
                        <Link href="/" className="hover:text-amber-500 transition-colors">Dashboard</Link>
                        <Link href="/onboarding" className="hover:text-amber-500 transition-colors">Setup</Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>

            <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-sm text-slate-500">
                Productivity Optimization Engine &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}
