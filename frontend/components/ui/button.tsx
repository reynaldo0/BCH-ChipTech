"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Button (shadcn/ui pattern).
 * Varian semantik: default, success, warning, destructive, info.
 * Alias lama (primary, danger, subtle) tetap didukung.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-brand-700 bg-brand-600 text-white shadow-[0_2px_5px_rgba(55,84,247,0.24)] hover:border-brand-800 hover:bg-brand-700 hover:shadow-[0_3px_8px_rgba(55,84,247,0.3)]",
        secondary:
          "border border-brand-100 bg-brand-50 text-brand-900 hover:bg-brand-100",
        outline:
          "border border-input bg-card text-ink-900 shadow-2xs hover:border-ink-400 hover:bg-ink-50",
        ghost:
          "border border-transparent text-ink-700 hover:bg-ink-100 hover:text-ink-950",
        link: "h-auto border-0 p-0 text-brand-700 underline-offset-4 hover:underline",
        success:
          "border border-success-700 bg-success-600 text-white shadow-[0_2px_5px_rgba(33,114,71,0.28)] hover:border-success-800 hover:bg-success-700 hover:shadow-[0_3px_8px_rgba(33,114,71,0.34)]",
        warning:
          "border border-warning-500 bg-warning-400 text-warning-950 shadow-xs hover:bg-warning-300",
        destructive:
          "border border-danger-700 bg-danger-600 text-white shadow-xs hover:bg-danger-700",
        info: "border border-info-700 bg-info-600 text-white shadow-xs hover:bg-info-700",
        // alias lama
        primary:
          "border border-brand-700 bg-brand-600 text-white shadow-[0_2px_5px_rgba(55,84,247,0.24)] hover:border-brand-800 hover:bg-brand-700 hover:shadow-[0_3px_8px_rgba(55,84,247,0.3)]",
        danger:
          "border border-danger-700 bg-danger-600 text-white shadow-xs hover:bg-danger-700",
        subtle:
          "border border-brand-100 bg-brand-50 text-brand-900 hover:bg-brand-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, title, "aria-label": ariaLabel, ...props }, ref) => {
    const tooltip = ariaLabel || title
    if (asChild) {
      return (
        <Slot ref={ref} title={title} aria-label={ariaLabel} data-tooltip={tooltip} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        title={title}
        aria-label={ariaLabel}
        data-tooltip={tooltip}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  label: string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = "ghost", children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      data-tooltip={label}
      className={cn(buttonVariants({ variant, size: "icon" }), "tooltip-trigger h-8 w-8", className)}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = "IconButton"

export { Button, IconButton, buttonVariants }
