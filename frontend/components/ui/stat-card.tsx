import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SpotlightCard } from "./spotlight-card"

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral"

const iconTone: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-success-bg text-success-700 ring-success-border",
  warning: "bg-warning-bg text-warning-700 ring-warning-border",
  danger: "bg-danger-bg text-danger-700 ring-danger-border",
  info: "bg-info-bg text-info-700 ring-info-border",
  neutral: "bg-ink-50 text-ink-600 ring-border",
}

/** Kartu KPI: label, angka besar, ikon, dan baris keterangan/status. */
export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "brand",
  trend,
  badge,
  className,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  trend?: { value: string; direction: "up" | "down" }
  badge?: React.ReactNode
  className?: string
}) {
  return (
    <SpotlightCard className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-600">{label}</p>
        {icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md ring-1 [&_svg]:h-4 [&_svg]:w-4", iconTone[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-[28px] font-semibold leading-none tracking-tight text-ink-950 tabular-nums">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-600">
        {badge}
        {trend ? (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", trend.direction === "up" ? "text-success-700" : "text-danger-700")}>
            {trend.direction === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {trend.value}
          </span>
        ) : null}
        {detail ? <span>{detail}</span> : null}
      </div>
    </SpotlightCard>
  )
}
