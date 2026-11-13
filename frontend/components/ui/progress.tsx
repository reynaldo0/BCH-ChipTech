import { cn } from "@/lib/utils"

/** Progress bar tipis untuk perbandingan relatif (mis. laba per channel). */
export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number
  tone?: "brand" | "success" | "warning" | "danger"
  className?: string
}) {
  const bar = { brand: "bg-brand-600", success: "bg-success-600", warning: "bg-warning-500", danger: "bg-danger-600" }[tone]
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${pct}%` }} />
    </div>
  )
}
