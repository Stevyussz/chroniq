import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// BUG FIX #4: Changed "POE v1.0" → "Chroniq" (brand identity)
// BUG FIX #5: Added /coach and /analytics links to navigation
export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const navLinks = [
        { href: '/', label: 'Dashboard' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/coach', label: 'AI Coach' },
        { href: '/onboarding', label: 'Setup' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 flex flex-col">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="font-black text-lg tracking-tight text-[#bf360c] dark:text-[#ffab91]">
                        Chroniq
                    </div>
                    <nav className="flex gap-1 text-sm font-medium">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${
                                    pathname === link.href
                                        ? 'bg-[#ffccbc] dark:bg-[#ff8a65]/20 text-[#bf360c] dark:text-[#ffab91] font-bold'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-[#bf360c] dark:hover:text-[#ffab91] hover:bg-[#fff3e0] dark:hover:bg-[#ff8a65]/10'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>

            <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
                Chroniq &copy; {new Date().getFullYear()} — Productivity powered by neuroscience
            </footer>
        </div>
    );
}
