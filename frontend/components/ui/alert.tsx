"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Alert (shadcn/ui pattern) — 4 status semantik:
 * info · success · warning · destructive
 */
const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border p-3.5 text-[13px] leading-relaxed",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-ink-800",
        info: "border-info-border bg-info-bg text-info-900",
        success: "border-success-border bg-success-bg text-success-900",
        warning: "border-warning-border bg-warning-bg text-warning-900",
        destructive: "border-danger-border bg-danger-bg text-danger-900",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const iconTone = {
  default: "text-ink-500",
  info: "text-info-600",
  success: "text-success-600",
  warning: "text-warning-600",
  destructive: "text-danger-600",
} as const

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: OctagonAlert,
} as const

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
  hideIcon?: boolean
}

function Alert({ className, variant, title, action, onDismiss, hideIcon, children, ...props }: AlertProps) {
  const key = (variant ?? "default") as keyof typeof icons
  const Icon = icons[key]
  return (
    <div
      role={key === "destructive" || key === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {hideIcon ? null : <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconTone[key])} aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title ? <AlertTitle>{title}</AlertTitle> : null}
        {children ? <AlertDescription className={title ? "mt-0.5" : ""}>{children}</AlertDescription> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup"
          className="-m-1 h-6 w-6 shrink-0 self-start rounded-sm p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5 className={cn("font-display text-[13px] font-semibold leading-snug tracking-tight", className)} {...props} />
)

const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("text-[13px] opacity-90 [&_p]:leading-relaxed", className)} {...props} />
)

export { Alert, AlertTitle, AlertDescription, alertVariants }
