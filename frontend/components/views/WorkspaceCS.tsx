"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ChatCopilotView } from "./ChatCopilotView"
import { QueueView } from "./QueueView"
import { TemplatePackView } from "./TemplatePackView"

const TABS = [
  { id: "satu", label: "Satu pesan", sub: "Jalur B" },
  { id: "antrean", label: "Mode antrean", sub: "Jalur C" },
  { id: "template", label: "Paket template", sub: "Jalur A" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function WorkspaceCS() {
  const [tab, setTab] = useState<TabId>("satu")

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    if (mode && TABS.some((t) => t.id === mode)) setTab(mode as TabId)
  }, [])

  function select(id: TabId) {
    setTab(id)
    const url = new URL(window.location.href)
    url.searchParams.set("mode", id)
    window.history.replaceState(null, "", url.toString())
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Jalur kerja CS" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => select(item.id)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === item.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-ink-100"
            )}
          >
            {item.label} <span className={cn("ml-1 font-mono text-[10.5px]", tab === item.id ? "text-white/80" : "text-ink-500")}>{item.sub}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "satu" ? <ChatCopilotView /> : tab === "antrean" ? <QueueView /> : <TemplatePackView />}
      </div>
    </div>
  )
}
