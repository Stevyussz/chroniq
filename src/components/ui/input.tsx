import * as React from "react"
import { cn } from "./button"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-2xl border-2 border-[#efebe9] dark:border-[#2d2d35] bg-white dark:bg-[#1e1e24] px-4 py-2 text-sm text-[#5d4037] dark:text-[#e4d8cd] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#a1887f] dark:placeholder:text-[#a19d9b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffccbc] dark:focus-visible:ring-[#ff8a65]/40 focus-visible:border-[#ff8a65] disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
