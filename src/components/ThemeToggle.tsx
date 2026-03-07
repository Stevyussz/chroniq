"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="w-9 h-9 opacity-50 cursor-default">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            </Button>
        );
    }

    const isDark = resolvedTheme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative w-9 h-9 rounded-full overflow-hidden bg-transparent hover:bg-[--border-subtle] text-[--text-muted] hover:text-[--foreground] transition-colors"
            title={`Beralih ke Mode ${isDark ? 'Terang' : 'Gelap'}`}
        >
            <motion.div
                initial={false}
                animate={{
                    y: isDark ? -30 : 0,
                    opacity: isDark ? 0 : 1,
                    scale: isDark ? 0.5 : 1
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center p-2"
            >
                <Sun className="h-5 w-5" />
            </motion.div>

            <motion.div
                initial={false}
                animate={{
                    y: isDark ? 0 : 30,
                    opacity: isDark ? 1 : 0,
                    scale: isDark ? 1 : 0.5
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center p-2"
            >
                <Moon className="h-4 w-4" />
            </motion.div>
        </Button>
    );
}
