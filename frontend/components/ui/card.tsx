import * as React from "react"
import { cn } from "@/lib/utils"

/** Card (shadcn/ui pattern) + API lama (CardHeader title/description/action, CardBody). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  if (children && !title) {
    return <div className={cn("flex flex-col gap-1.5 p-5", className)}>{children}</div>
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-semibold text-ink-950">{title}</h3>
        {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-display text-[15px] font-semibold leading-none tracking-tight", className)} {...props} />
)

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-[13px] text-ink-600", className)} {...props} />
)

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />
}
export const CardContent = CardBody

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-ink-50/50 px-5 py-3", className)}
      {...props}
    />
  )
}
