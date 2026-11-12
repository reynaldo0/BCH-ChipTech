import React from "react"

export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5" aria-label="KOMPAS">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 text-brand-700">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 7.5 19.2 16 16 24.5 12.8 16 16 7.5Z" fill="currentColor" />
        <path d="M7.5 16h17" stroke="currentColor" strokeWidth="1.2" opacity=".45" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-[-0.04em] text-ink-950">KOMPAS</span>
    </span>
  )
}
