"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Copy, Forward, Keyboard, ListOrdered, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CLASS_META, ChatResult, ClassBadge, EvidenceList, HOLDING_REPLY, JevPanel, Warnings, copyText } from "./cs-shared"

type ItemState = "baru" | "selesai" | "diteruskan"
type QueueItem = ChatResult & { state: ItemState; choice: number }

/** Monday morning after a Sunday without CS: a typical backlog (dummy chat data). */
const SAMPLE_BACKLOG = `Kurma Sukari 500 g ready brp?

Saya bayar Sabtu jam 13, kenapa belum dikirim?

Cokelat Arab 200 g ada susu? anak saya alergi.

Kak, ongkir ke Surabaya berapa?

Pesan Ajwa 500 g kok yang datang Sukari?

Kak bisa COD ke rumah saya?

Mau Ajwa 250 g 30 bungkus, bisa harga grosir?

Coklat turkey yang 200 gram masih ready nggak?

Kacang Arab 500 g saya beli 3 tapi datang 2.

CS online jam berapa?`

function optionsFor(item: QueueItem): string[] {
  if (!item.copy_allowed) return [HOLDING_REPLY]
  return item.alternatives?.length ? item.alternatives : [item.draft]
}

export function QueueView() {
  const [raw, setRaw] = useState("")
  const [platform, setPlatform] = useState("Shopee")
  const [items, setItems] = useState<QueueItem[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [announce, setAnnounce] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const runQueue = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      setLoading(true)
      setError("")
      try {
        const res = await api.post<{ items: ChatResult[]; counts: Record<string, number> }>("/api/chat/queue", {
          text,
          platform,
          prefer_provider: "auto",
        })
        setItems(res.items.map((item) => ({ ...item, state: "baru", choice: 0 })))
        setActive(0)
        const complaints = res.counts.COMPLAINT ?? 0
        setAnnounce(`${res.items.length} pesan dipisah. ${complaints} keluhan di urutan teratas.`)
        setTimeout(() => listRef.current?.focus(), 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Antrean gagal diproses.")
      } finally {
        setLoading(false)
      }
    },
    [platform]
  )

  const current = items[active]

  const finish = useCallback(
    async (index: number) => {
      const item = items[index]
      if (!item) return
      const text = optionsFor(item)[item.choice] ?? optionsFor(item)[0]
      const ok = await copyText(text)
      if (!ok) return setAnnounce("Gagal menyalin; salin manual.")
      setItems((list) => list.map((it, i) => (i === index ? { ...it, state: "selesai" } : it)))
      setAnnounce(`Pesan ${index + 1} tersalin dan selesai.`)
      const next = items.findIndex((it, i) => i > index && it.state === "baru")
      if (next >= 0) setActive(next)
    },
    [items]
  )

  const escalate = useCallback(
    async (index: number) => {
      const item = items[index]
      if (!item || item.state === "diteruskan") return
      try {
        if (!item.complaint_ticket) {
          const res = await api.post<{ ticket_no: string }>("/api/complaints", {
            summary: item.message ?? item.draft,
            category: item.message_class === "COMPLAINT" ? "Lainnya" : "Perlu cek staf",
            severity: item.severity,
            platform,
            sku: item.sku,
            notes: `Diteruskan dari Mode Antrean. Alasan sistem: ${item.reason}`,
          })
          item.complaint_ticket = res.ticket_no
        }
        setItems((list) => list.map((it, i) => (i === index ? { ...it, state: "diteruskan", complaint_ticket: item.complaint_ticket } : it)))
        setAnnounce(`Pesan ${index + 1} diteruskan ke staf (${item.complaint_ticket}).`)
      } catch (err) {
        setAnnounce(err instanceof Error ? err.message : "Gagal meneruskan.")
      }
    },
    [items, platform]
  )

  // Keyboard map (proposal §3.1 Jalur C): J/K move, Enter copy, E forward, 1-3 pick draft.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!items.length) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault()
        setActive((i) => Math.min(items.length - 1, i + 1))
      } else if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault()
        setActive((i) => Math.max(0, i - 1))
      } else if (event.key === "Enter" && target?.tagName !== "BUTTON" && target?.tagName !== "A") {
        event.preventDefault()
        void finish(active)
      } else if (key === "e") {
        event.preventDefault()
        void escalate(active)
      } else if (["1", "2", "3"].includes(event.key)) {
        const choice = Number(event.key) - 1
        const opts = items[active] ? optionsFor(items[active]) : []
        if (choice < opts.length) {
          event.preventDefault()
          setItems((list) => list.map((it, i) => (i === active ? { ...it, choice } : it)))
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items, active, finish, escalate])

  useEffect(() => {
    document.getElementById(`queue-item-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  const remaining = items.filter((it) => it.state === "baru").length

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite" role="status">{announce}</p>

      <section className="card card-pad space-y-3" aria-labelledby="queue-input">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Jalur C · mode antrean</p>
            <h2 id="queue-input" className="mt-1 font-display text-lg font-semibold text-ink-950">Tempel banyak pesan sekaligus</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink-600">
              Pisahkan pesan dengan baris kosong (atau satu pesan per baris). KOMPAS memecahnya, menaruh keluhan di urutan teratas, lalu
              Anda bergerak hanya dengan keyboard.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="field-label" htmlFor="queue-platform">Kanal</label>
              <select id="queue-platform" className="field-control h-9" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option>Shopee</option>
                <option>TikTok Shop</option>
                <option>Lazada</option>
              </select>
            </div>
          </div>
        </div>
        <label className="sr-only" htmlFor="queue-raw">Pesan pembeli</label>
        <textarea
          id="queue-raw"
          rows={5}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text")
            if (text.trim()) {
              e.preventDefault()
              setRaw(text)
              void runQueue(text)
            }
          }}
          placeholder={"Kurma Sukari 500 g ready brp?\n\nPaket saya belum sampai…"}
          className="field-control font-mono text-[12.5px] leading-relaxed"
        />
        {error ? <p role="alert" className="text-[13px] text-danger-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void runQueue(raw)} loading={loading} disabled={!raw.trim()}>
            <ListOrdered /> Pecah & urutkan
          </Button>
          <Button variant="outline" onClick={() => { setRaw(SAMPLE_BACKLOG); void runQueue(SAMPLE_BACKLOG) }}>
            Coba 10 pesan contoh
          </Button>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-500">
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="kbd">J</kbd>/<kbd className="kbd">K</kbd> pindah · <kbd className="kbd">Enter</kbd> salin · <kbd className="kbd">E</kbd> teruskan · <kbd className="kbd">1</kbd>–<kbd className="kbd">3</kbd> pilih draf
          </span>
        </div>
      </section>

      {loading ? (
        <div className="card card-pad flex items-center gap-2 text-[13px] text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Memproses antrean…</div>
      ) : items.length ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div
            ref={listRef}
            tabIndex={0}
            role="listbox"
            aria-label={`Antrean pesan, ${remaining} belum selesai`}
            aria-activedescendant={`queue-item-${active}`}
            className="card max-h-[34rem] overflow-y-auto p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="px-2 pb-2 pt-1 text-[12px] text-ink-500">{remaining} dari {items.length} belum selesai</p>
            {items.map((item, index) => (
              <div
                id={`queue-item-${index}`}
                key={index}
                role="option"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  "mb-1 cursor-pointer rounded-md border px-3 py-2.5 transition-colors",
                  index === active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30" : "border-transparent hover:bg-ink-50",
                  item.state !== "baru" && "opacity-60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <ClassBadge value={item.message_class} />
                  <span className="text-[11px] text-ink-500">
                    {item.state === "selesai" ? "✓ selesai" : item.state === "diteruskan" ? "→ diteruskan" : `#${item.position}`}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-900">{item.message}</p>
              </div>
            ))}
          </div>

          {current ? (
            <section className="card card-pad space-y-4" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <ClassBadge value={current.message_class} />
                {current.product_name ? <span className="text-[13px] font-medium">{current.product_name}</span> : null}
                {current.complaint_ticket ? <span className="font-mono text-[12px] text-danger-700">{current.complaint_ticket}</span> : null}
              </div>
              <blockquote className="rounded-md border-l-4 border-ink-300 bg-ink-50 px-3 py-2 text-[13.5px] text-ink-900">{current.message}</blockquote>
              <p className="text-[13px] text-ink-600">{CLASS_META[current.message_class].hint}</p>
              <Warnings items={current.warnings} injection={current.injection} />

              <fieldset>
                <legend className="field-label">{current.copy_allowed ? "Pilih draf (1–3)" : "Balasan tunggu (tanpa fakta)"}</legend>
                <div className="space-y-2">
                  {optionsFor(current).map((option, index) => (
                    <label key={index} className={cn("flex cursor-pointer gap-2.5 rounded-md border p-2.5 text-[13px] leading-5", current.choice === index ? "border-brand-500 bg-brand-50" : "border-border")}>
                      <input
                        type="radio"
                        name="draft-choice"
                        className="mt-1 accent-brand-700"
                        checked={current.choice === index}
                        onChange={() => setItems((list) => list.map((it, i) => (i === active ? { ...it, choice: index } : it)))}
                      />
                      <span><kbd className="kbd mr-1.5">{index + 1}</kbd>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void finish(active)} disabled={current.state === "selesai"}>
                  <Copy /> Salin & selesai <kbd className="kbd-inverse">Enter</kbd>
                </Button>
                <Button variant="outline" onClick={() => void escalate(active)} disabled={current.state === "diteruskan"}>
                  <Forward /> Teruskan ke staf <kbd className="kbd">E</kbd>
                </Button>
              </div>

              <JevPanel jev={current.jev} compact />

              <details>
                <summary className="cursor-pointer text-[13px] font-medium text-ink-800">Sumber ({current.evidence.length})</summary>
                <div className="mt-2"><EvidenceList items={current.evidence} /></div>
              </details>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
