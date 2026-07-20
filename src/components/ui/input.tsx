import * as React from "react"
import { cn } from "./button"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-4 py-2 text-sm text-[#1f2937] dark:text-[#e5edf8] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#94a3b8] dark:placeholder:text-[#64748b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7d2fe] dark:focus-visible:ring-[#818cf8]/35 focus-visible:border-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50",
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
