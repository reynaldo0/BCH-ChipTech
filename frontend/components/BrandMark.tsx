import React from "react"
import { cn } from "@/lib/utils"

export function BrandMark({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  const light = variant === "light"
  return (
    <span className={cn("flex items-center gap-2.5", className)} aria-label="Kompas">
      {/* <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shadow-xs ring-1",
          light ? "bg-brand-600 text-white ring-white/10" : "bg-primary text-white ring-brand-800"
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6">
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.8" opacity=".9" />
          <path d="M16 7.5 19.2 16 16 24.5 12.8 16 16 7.5Z" fill="currentColor" />
          <path d="M7.5 16h17" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
        </svg>
      </span> */}
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[17px] font-semibold tracking-[-0.03em]", light ? "text-white" : "text-ink-950")}>Kompas</span>
        <span className={cn("mt-1 font-mono text-[9.5px] tracking-[0.16em]", light ? "text-sidebar-foreground" : "text-ink-500")}>
          Toko Husin
        </span>
      </span>
    </span>
  )
}
