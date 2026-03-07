import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffccbc] disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                default:
                    "bg-[#ffab91] text-white shadow-[0_4px_14px_0_rgba(255,171,145,0.39)] hover:bg-[#ff8a65] hover:shadow-[0_6px_20px_rgba(255,171,145,0.23)] hover:-translate-y-0.5",
                destructive:
                    "bg-[#ef5350] text-white shadow-sm hover:bg-[#e53935] hover:-translate-y-0.5",
                outline:
                    "border-2 border-[#ffccbc] bg-transparent text-[#ff8a65] hover:bg-[#fff3e0] hover:-translate-y-0.5",
                secondary:
                    "bg-[#a5d6a7] text-[#1b5e20] shadow-sm hover:bg-[#81c784] hover:-translate-y-0.5",
                ghost: "text-[#8d6e63] hover:bg-[#efebe9] hover:text-[#5d4037]",
                link: "text-[#ff8a65] underline-offset-4 hover:underline",
            },
            size: {
                default: "h-12 px-6 py-2",
                sm: "h-9 rounded-full px-4 text-xs",
                lg: "h-14 rounded-full px-10 text-base",
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
