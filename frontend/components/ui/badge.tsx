import * as React from "react"
import { cva } from "class-variance-authority"
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Info,
  MinusCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { cn, statusLabel } from "@/lib/utils"

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5",
  {
    variants: {
      tone: {
        success: "border-success-border bg-success-bg text-success-800",
        warning: "border-warning-border bg-warning-bg text-warning-800",
        danger: "border-danger-border bg-danger-bg text-danger-800",
        info: "border-info-border bg-info-bg text-info-800",
        neutral: "border-border bg-ink-50 text-ink-700",
        brand: "border-brand-100 bg-brand-50 text-brand-800",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon}
      {children}
    </span>
  )
}

function toneFromStatus(status: string | null | undefined): Tone {
  if (!status) return "neutral"
  if (["COMPLETE", "VERIFIED", "RESOLVED", "SELESAI", "VALID", "AMAN"].includes(status)) return "success"
  if (["PARTIAL", "UNVERIFIED", "STALE", "REVIEW", "MENUNGGU", "PERLU_PERHATIAN", "MENIPIS", "KEDALUWARSA", "JAWAB_TERBATAS"].includes(status)) return "warning"
  if (["RECONCILIATION_REQUIRED", "RECON", "INVALID", "ESCALATED", "DITOLAK", "ESKALASI", "HABIS", "EXPIRED"].includes(status)) return "danger"
  if (["SIMULATED", "JAWAB_LANGSUNG"].includes(status)) return "info"
  return "neutral"
}

const toneIcon = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: CircleDot,
  brand: CircleDot,
} as const

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string | null | undefined
  label?: string
  className?: string
}) {
  const tone = toneFromStatus(status)
  const Icon = toneIcon[tone]
  return (
    <Badge tone={tone} className={className} icon={<Icon className="h-3 w-3" aria-hidden="true" />}>
      {label ?? statusLabel(status)}
    </Badge>
  )
}

export function MarketplaceBadge({
  marketplace,
  className,
}: {
  marketplace: string | null | undefined
  className?: string
}) {
  const dot =
    marketplace === "Shopee"
      ? "bg-mp-shopee"
      : marketplace === "TikTok Shop" || marketplace === "TikTok"
        ? "bg-mp-tiktok"
        : marketplace === "Lazada"
          ? "bg-mp-lazada"
          : "bg-chart-neutral"
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-700", className)}>
      <span className={cn("h-2 w-2 rounded-full ring-2 ring-white", dot)} aria-hidden="true" />
      {marketplace || "Tidak diketahui"}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string | null | undefined }) {
  const tone: Tone =
    severity === "kritis" || severity === "tinggi" ? "danger" : severity === "sedang" ? "warning" : "neutral"
  const Icon = tone === "danger" ? ShieldAlert : tone === "warning" ? AlertTriangle : MinusCircle
  return (
    <Badge tone={tone} icon={<Icon className="h-3 w-3" aria-hidden="true" />}>
      {severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Belum dinilai"}
    </Badge>
  )
}

export function DecisionBadge({ decision }: { decision: string | null | undefined }) {
  const tone: Tone =
    decision === "JAWAB_LANGSUNG" ? "success" : decision === "JAWAB_TERBATAS" ? "warning" : decision === "ESKALASI" ? "danger" : "neutral"
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? Info : tone === "danger" ? AlertTriangle : CircleDot
  return (
    <Badge tone={tone} icon={<Icon className="h-3 w-3" aria-hidden="true" />}>
      {statusLabel(decision)}
    </Badge>
  )
}
