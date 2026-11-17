"use client"

import React from "react"
import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"

export type MessageClass = "GENERAL_QUESTION" | "UNCERTAIN_INFORMATION" | "COMPLAINT"

export interface Evidence {
  source: string
  ref: string
  label: string
  status: string
  updated_at?: string | null
}

export interface JevDecision {
  status: string
  ok: boolean
  model: string
  category: "umum" | "belum_pasti" | "keluhan" | null
  category_probs: Record<string, number>
  injection_prob: number | null
  severity: string | null
  severity_score: number | null
  latency_ms: number | null
  cost_usd: number | null
  input_tokens: number | null
  request_id: string | null
  cached: boolean
  threshold: number
  detail: string | null
  effect: string
}

export interface ChatResult {
  message?: string
  message_class: MessageClass
  intent: string
  decision: string
  severity: string
  complaint: boolean
  injection: boolean
  provider: string
  provider_status: string
  jev?: JevDecision | null
  sku: string | null
  product_name: string | null
  draft: string
  alternatives: string[]
  copy_allowed: boolean
  evidence: Evidence[]
  warnings: string[]
  complaint_ticket: string | null
  order_ref: string | null
  analysis_id: number | null
  reason: string
  latency_ms: number | null
  position?: number
}

export const CLASS_META: Record<MessageClass, { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2; hint: string }> = {
  GENERAL_QUESTION: {
    label: "Pertanyaan umum",
    tone: "success",
    icon: CheckCircle2,
    hint: "Draf dari katalog/FAQ/OPS. Baca sekali, lalu salin.",
  },
  UNCERTAIN_INFORMATION: {
    label: "Belum pasti",
    tone: "warning",
    icon: CircleHelp,
    hint: "Jangan kirim fakta sebelum staf memeriksa. Gunakan balasan tunggu.",
  },
  COMPLAINT: {
    label: "Keluhan",
    tone: "danger",
    icon: AlertTriangle,
    hint: "Prioritas teratas. Minta nomor pesanan dan bukti; jangan janjikan refund/nominal.",
  },
}

export const HOLDING_REPLY =
  "Terima kasih Kak, pesannya sudah kami terima. Kami cek dulu ke tim terkait dan kabari secepatnya ya."

export function ClassBadge({ value }: { value: MessageClass }) {
  const meta = CLASS_META[value] ?? CLASS_META.UNCERTAIN_INFORMATION
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} icon={<Icon className="h-3 w-3" aria-hidden="true" />}>
      {meta.label}
    </Badge>
  )
}

export function formatStamp(value?: string | null) {
  if (!value) return null
  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return value
  return `${date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
}

export function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items?.length) {
    return <p className="text-[13px] text-ink-500">Tidak ada sumber yang dipakai untuk pesan ini.</p>
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => {
        const bad = ["MISSING", "STALE", "INVALID", "EXPIRED"].includes(item.status)
        return (
          <li key={`${item.ref}-${index}`} className="flex items-start justify-between gap-3 rounded-md border border-border bg-ink-50/60 px-3 py-2 text-[12.5px]">
            <span className="min-w-0">
              <span className="font-mono text-[11px] text-ink-500">{item.ref}</span>
              <span className="block text-ink-900">{item.label}</span>
              {item.updated_at ? <span className="text-[11px] text-ink-500">Cap waktu: {formatStamp(item.updated_at)}</span> : null}
            </span>
            <Badge tone={bad ? "warning" : "neutral"}>{bad ? `${item.status} ⚠` : item.status}</Badge>
          </li>
        )
      })}
    </ul>
  )
}

export function Warnings({ items, injection }: { items: string[]; injection?: boolean }) {
  if (!items?.length && !injection) return null
  return (
    <div className="space-y-1.5">
      {injection ? (
        <p className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Pesan berisi perintah ke sistem. Diperlakukan sebagai data, bukan instruksi.
        </p>
      ) : null}
      {items.map((warning, index) => (
        <p key={index} className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-[12.5px] text-warning-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      ))}
    </div>
  )
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement("textarea")
    area.value = text
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(area)
    return ok
  }
}

export async function reportWrongRoute(analysisId: number | null, expected?: MessageClass) {
  if (!analysisId) return
  await api.post(`/api/chat/${analysisId}/wrong-route`, { expected_class: expected ?? null })
}

export function useProviderMode() {
  const [mode, setMode] = React.useState<{ mode_label: string; reason: string; mode: string } | null>(null)
  React.useEffect(() => {
    let active = true
    api
      .get<{ mode_label: string; reason: string; mode: string }>("/api/chat/provider")
      .then((info) => active && setMode(info))
      .catch(() => active && setMode(null))
    return () => {
      active = false
    }
  }, [])
  return mode
}

const JEV_LABEL: Record<string, string> = { umum: "Umum", belum_pasti: "Belum pasti", keluhan: "Keluhan" }
const IDR_PER_USD = 16500

/** "Keputusan Jev": the typed decision Jev returned, beside what it changed (or not). */
export function JevPanel({ jev, compact = false }: { jev?: JevDecision | null; compact?: boolean }) {
  if (!jev) return null
  const raised = /MENAIKKAN/.test(jev.effect)
  const tone = !jev.ok ? "neutral" : raised ? "warning" : "success"
  return (
    <section aria-label="Keputusan Jev" className="rounded-lg border border-border bg-ink-50/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-[13.5px] font-semibold text-ink-950">Keputusan Jev</h3>
        <Badge tone={tone}>
          {!jev.ok ? "Tidak dipakai" : raised ? "Menaikkan kewaspadaan" : "Sejalan dengan aturan"}
        </Badge>
      </div>

      {jev.ok ? (
        <>
          <dl className="mt-2.5 space-y-1.5" aria-label="Probabilitas kategori">
            {(["umum", "belum_pasti", "keluhan"] as const).map((key) => {
              const value = jev.category_probs[key] ?? 0
              const chosen = jev.category === key
              return (
                <div key={key} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-[12.5px]">
                  <dt className={chosen ? "font-semibold text-ink-950" : "text-ink-600"}>
                    {JEV_LABEL[key]}
                    {chosen ? <span className="sr-only"> (pilihan Jev)</span> : null}
                  </dt>
                  <dd className="m-0">
                    <div className="h-2 overflow-hidden rounded-full bg-ink-200" role="presentation">
                      <div className={chosen ? "h-full bg-brand-600" : "h-full bg-ink-400"} style={{ width: `${Math.round(value * 100)}%` }} />
                    </div>
                  </dd>
                  <dd className="tnum m-0 text-right font-mono text-[12px] text-ink-800">{(value * 100).toFixed(0)}%</dd>
                </div>
              )
            })}
          </dl>
          <p className="mt-2 text-[12.5px] text-ink-700">
            Instruksi tersembunyi: <strong className="tnum">{((jev.injection_prob ?? 0) * 100).toFixed(0)}%</strong>
            {jev.severity ? <> · Urgensi: <strong>{jev.severity}</strong></> : null}
            <span className="text-ink-500"> · ambang naik {Math.round(jev.threshold * 100)}%</span>
          </p>
        </>
      ) : null}

      <p className={`mt-2.5 rounded-md border px-2.5 py-1.5 text-[12.5px] ${raised ? "border-warning-border bg-warning-bg text-warning-900" : "border-border bg-card text-ink-800"}`}>
        {jev.effect}
      </p>

      {!compact ? (
        <p className="mt-2 font-mono text-[11px] text-ink-500">
          {jev.model}
          {jev.latency_ms != null ? ` · ${jev.cached ? "dari cache" : `${jev.latency_ms} ms`}` : ""}
          {jev.cost_usd != null && !jev.cached ? ` · $${jev.cost_usd.toFixed(6)} (≈Rp${(jev.cost_usd * IDR_PER_USD).toFixed(2)})` : ""}
          {jev.detail ? ` · ${jev.detail}` : ""}
        </p>
      ) : null}
    </section>
  )
}
