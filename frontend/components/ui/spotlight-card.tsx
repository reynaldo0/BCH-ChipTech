"use client"

import * as React from "react"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * Spotlight Card — terinspirasi Aceternity UI "Card Spotlight".
 * Efek cahaya mengikuti kursor, sengaja dibuat sangat tipis (alpha 8%)
 * agar angka KPI tetap menjadi fokus. Nonaktif otomatis di perangkat sentuh.
 */
export function SpotlightCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const background = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgba(27,127,120,0.08), transparent 70%)`

  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left)
        y.set(e.clientY - rect.top)
      }}
      onMouseLeave={() => {
        x.set(-200)
        y.set(-200)
      }}
      className={cn("card group relative overflow-hidden transition-shadow hover:shadow-soft-md", className)}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
