import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function BrandMark({ variant = "dark", className, compact = false }: { variant?: "dark" | "light"; className?: string; compact?: boolean }) {
  const light = variant === "light"
  return (
    <span className={cn("flex items-center gap-2.5", className)} aria-label="Kompas">
      {compact ? (
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl shadow-xs ring-1",
            light ? "bg-sand-400 text-ink-950 ring-sand-300" : "bg-brand-500 text-white ring-brand-200"
          )}
        >
          <Image
            src="/fonts/logosmall.png"
            alt=""
            width={64}
            height={64}
            className={cn("h-7 w-7 object-contain", light && "brightness-0 invert")}
          />
        </span>
      ) : (
        <Image
          src="/fonts/logo.png"
          alt="KOMPAS"
          width={320}
          height={91}
          priority
          className={cn("h-auto w-[10.5rem] object-contain", light && "brightness-0 invert")}
        />
      )}
    </span>
  )
}
