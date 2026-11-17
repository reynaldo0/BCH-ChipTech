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
