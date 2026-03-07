"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Brain, Map } from "lucide-react";
import Image from "next/image";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ThemeToggle } from "@/components/ThemeToggle";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "AI Coach", href: "/coach", icon: Brain },
    { name: "Insights", href: "/analytics", icon: Map },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <header className="sticky top-4 z-50 w-full flex justify-center px-4 mb-8">
            <nav className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-full bg-white/70 dark:bg-[#1e1e24]/80 backdrop-blur-xl border border-white/50 dark:border-[#2d2d35]/50 shadow-sm transition-all duration-300">

                {/* Brand/Logo Area */}
                <div className="flex items-center gap-2 pl-3 pr-2 mr-2 border-r border-[#efebe9]/50 dark:border-[#2d2d35]/80">
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Image src="/icon.png" alt="Chroniq Logo" width={32} height={32} className="object-contain drop-shadow-sm" />
                    </div>
                    <span className="font-extrabold text-[#5d4037] dark:text-[#e4d8cd] hidden sm:block tracking-tight text-lg">
                        Chroniq<span className="text-[#a1887f] dark:text-[#a19d9b] font-medium text-xs ml-1">v1.0</span>
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
                                            ? "text-[#bf360c] dark:text-[#ffccbc]"
                                            : "text-[#8d6e63] dark:text-[#a19d9b] hover:text-[#ff8a65] dark:hover:text-[#ffab91]"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="hidden md:block">{item.name}</span>
                                </Link>

                                {/* Animated active background bubble */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-bubble"
                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffe0b2]/50 to-[#ffccbc]/50 dark:from-[#ff8a65]/20 dark:to-[#ffccbc]/20 border border-white/60 dark:border-[#ff8a65]/30 shadow-sm"
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

                {/* Controls Area */}
                <div className="pl-1 pr-1 border-l border-[#efebe9]/50 dark:border-[#2d2d35]/80 ml-1">
                    <ThemeToggle />
                </div>
            </nav>
        </header>
    );
}
