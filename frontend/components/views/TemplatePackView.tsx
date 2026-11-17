"use client"

import React, { useEffect, useState } from "react"
import { Check, Copy, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { copyText, formatStamp } from "./cs-shared"

interface TemplateItem {
  key: string
  title: string
  category: string
  text: string
  sources: string[]
}

interface TemplatePack {
  generated_at: string
  count: number
  items: TemplateItem[]
  text: string
  note: string
}

export function TemplatePackView() {
  const [pack, setPack] = useState<TemplatePack | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      setPack(await api.get<TemplatePack>("/api/products/template-pack"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paket template gagal dimuat.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function copy(id: string, text: string) {
    if (await copyText(text)) {
      setCopied(id)
      setTimeout(() => setCopied(null), 1600)
    }
  }

  function download() {
    if (!pack) return
    const blob = new Blob([pack.text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `paket-template-kompas-${pack.generated_at.slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-4" aria-labelledby="tpl-title">
      <div className="card card-pad flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="eyebrow">Jalur A · template bawaan marketplace</p>
          <h2 id="tpl-title" className="mt-1 font-display text-lg font-semibold text-ink-950">Paket template balasan cepat</h2>
          <p className="mt-1 text-[13px] leading-5 text-ink-600">
            {pack?.note ?? "Dibangun dari FAQ, aturan OPS, dan stok terakhir."} CS lalu memilih template langsung di Seller Center tanpa membuka KOMPAS.
          </p>
          {pack ? <p className="mt-1 text-[12px] text-ink-500">Dibuat {formatStamp(pack.generated_at)} · {pack.count} template</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} loading={loading}><RefreshCw /> Perbarui</Button>
          <Button variant="outline" onClick={() => pack && void copy("all", pack.text)} disabled={!pack}>
            {copied === "all" ? <Check /> : <Copy />} Salin semua
          </Button>
          <Button onClick={download} disabled={!pack}><Download /> Unduh .txt</Button>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[13px] text-danger-900">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {pack?.items.map((item) => (
          <article key={item.key} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-brand-700">{item.key}</p>
                <h3 className="text-[13.5px] font-semibold text-ink-950">{item.title}</h3>
              </div>
              <Badge tone={item.category === "Stok" ? "warning" : "neutral"}>{item.category}</Badge>
            </div>
            <p className="text-[13px] leading-5 text-ink-700">{item.text}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-ink-500">Sumber: {item.sources.join(", ")}</span>
              <Button size="sm" variant="ghost" onClick={() => void copy(item.key, item.text)} aria-label={`Salin template ${item.title}`}>
                {copied === item.key ? <Check /> : <Copy />} {copied === item.key ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
