"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Sparkles, Map } from "lucide-react";
import Image from "next/image";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Setup", href: "/onboarding", icon: Sparkles },
    { name: "Insights", href: "/analytics", icon: Map },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <header className="sticky top-4 z-50 w-full flex justify-center px-4 mb-8">
            <nav className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm transition-all duration-300">

                {/* Brand/Logo Area */}
                <div className="flex items-center gap-2 pl-3 pr-2 mr-2 border-r border-[#efebe9]/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffab91] to-[#ffccbc] flex items-center justify-center shadow-inner overflow-hidden">
                        <Image src="/icon.png" alt="Chroniq Logo" width={24} height={24} className="object-cover" />
                    </div>
                    <span className="font-extrabold text-[#5d4037] hidden sm:block tracking-tight text-lg">
                        Chroniq<span className="text-[#a1887f] font-medium text-xs ml-1">v1.0</span>
                    </span>
                </div>

                {/* Dynamic Links */}
                <ul className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.name} className="relative">
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors z-10",
                                        isActive
                                            ? "text-[#bf360c]"
                                            : "text-[#8d6e63] hover:text-[#ff8a65]"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="hidden md:block">{item.name}</span>
                                </Link>

                                {/* Animated active background bubble */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-bubble"
                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffe0b2]/50 to-[#ffccbc]/50 border border-white/60 shadow-sm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                        }}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
}
