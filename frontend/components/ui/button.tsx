"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle"
type ButtonSize = "sm" | "md" | "icon"

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white border border-brand-700 hover:bg-brand-800 hover:border-brand-800",
  secondary:
    "bg-surface text-ink-900 border border-line-strong hover:bg-surface-muted",
  ghost:
    "bg-transparent text-ink-700 border border-transparent hover:bg-surface-muted hover:text-ink-950",
  danger:
    "bg-danger text-white border border-danger hover:bg-[#8b352f] hover:border-[#8b352f]",
  subtle:
    "bg-brand-50 text-brand-900 border border-brand-100 hover:bg-brand-100",
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
  icon: "h-9 w-9 justify-center",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
)
Button.displayName = "Button"

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: ButtonVariant
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = "ghost", children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-colors focus-visible:outline-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = "IconButton"
