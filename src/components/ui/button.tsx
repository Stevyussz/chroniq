import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7d2fe] disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                default:
                    "bg-[#4f46e5] dark:bg-[#818cf8] text-white dark:text-[#111827] shadow-[0_4px_14px_0_rgba(79,70,229,0.24)] dark:shadow-none hover:bg-[#4338ca] dark:hover:bg-[#a5b4fc] hover:shadow-[0_6px_20px_rgba(79,70,229,0.2)] dark:hover:shadow-none hover:-translate-y-0.5",
                destructive:
                    "bg-[#ef4444] dark:bg-[#f87171] text-white shadow-sm hover:bg-[#dc2626] dark:hover:bg-[#fca5a5] hover:-translate-y-0.5",
                outline:
                    "border border-[#cbd5e1] dark:border-[#334155] bg-white/70 dark:bg-[#0f172a]/50 text-[#334155] dark:text-[#dbeafe] hover:bg-[#eef2ff] dark:hover:bg-[#1e293b] hover:-translate-y-0.5",
                secondary:
                    "bg-[#d1fae5] dark:bg-[#064e3b]/50 text-[#047857] dark:text-[#a7f3d0] shadow-sm hover:bg-[#a7f3d0] dark:hover:bg-[#065f46] hover:-translate-y-0.5",
                ghost: "text-[#64748b] dark:text-[#94a3b8] hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] hover:text-[#1f2937] dark:hover:text-[#e5edf8]",
                link: "text-[#4f46e5] dark:text-[#a5b4fc] underline-offset-4 hover:underline",
            },
            size: {
                default: "h-12 px-6 py-2",
                sm: "h-9 rounded-lg px-4 text-xs",
                lg: "h-14 rounded-lg px-10 text-base",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
