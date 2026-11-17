"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Info, ListOrdered, MessageCircle, RefreshCw, ShieldCheck, TrendingUp, Truck, Wallet } from "lucide-react"
import { api } from "@/lib/api"
import { actionableItems, completenessLabel, formatPercent, formatRupiah, numberValue, OverviewResponse } from "@/lib/metrics"
import { Alert } from "@/components/ui/alert"
import { Badge, MarketplaceBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/ui/stat-card"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const levelStyle = {
  danger: { box: "bg-danger-bg text-danger-700 ring-danger-border", Icon: AlertTriangle, badge: "danger" as const, label: "Mendesak" },
  warning: { box: "bg-warning-bg text-warning-700 ring-warning-border", Icon: AlertTriangle, badge: "warning" as const, label: "Perlu dicek" },
  info: { box: "bg-info-bg text-info-700 ring-info-border", Icon: Info, badge: "info" as const, label: "Info" },
}

export function HomeDashboard() {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    api
      .get<OverviewResponse>("/api/insights/overview")
      .then(setData)
      .catch(() => {
        const message = "Ringkasan belum bisa dimuat. Periksa koneksi lalu coba lagi."
        setError(message)
        toast({ title: "Ringkasan gagal dimuat", description: message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <HomeSkeleton />
  if (error || !data)
    return (
      <Alert
        variant="destructive"
        title="Gagal memuat ringkasan"
        action={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw /> Coba lagi
          </Button>
        }
      >
        {error || "Ringkasan belum tersedia."}
      </Alert>
    )

  const kpi = data.kpi || {}
  const items = actionableItems(data)
  const complete = kpi.complete_count ?? 0
  const total = kpi.transaction_count ?? 0
  const status = completenessLabel(kpi)
  const statusTone = (kpi.reconciliation_count ?? 0) > 0 ? "danger" : (kpi.partial_count ?? 0) > 0 ? "warning" : "success"
  const channels = data.by_marketplace || []
  const maxProfit = Math.max(1, ...channels.map((c) => Math.abs(numberValue(c.lk1) ?? 0)))

  return (
    <div className="space-y-8">
      {/* Prioritas */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Prioritas hari ini</p>
            <h2 className="mt-1 text-2xl">Perlu tindakan hari ini</h2>
          </div>
          <Badge tone={items.length ? "warning" : "success"}>{items.length} hal utama</Badge>
        </div>
        <div className="card divide-y divide-line-soft overflow-hidden">
          {items.length === 0 ? (
            <div className="flex items-center gap-3 p-5 text-sm text-ink-600">
              <ShieldCheck className="h-5 w-5 text-success-600" /> Tidak ada tindakan mendesak untuk periode ini.
            </div>
          ) : (
            items.map((item) => {
              const s = levelStyle[item.level] ?? levelStyle.warning
              const href = item.link || "/"
              return (
                <div key={`${item.type}-${item.title}`} className="flex flex-col gap-3 p-4 transition-colors hover:bg-ink-50/60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3.5">
                    <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1", s.box)}>
                      <s.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-sm font-semibold text-ink-950">{item.title}</h3>
                        <Badge tone={s.badge}>{s.label}</Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-[13px] leading-6 text-ink-600">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="self-start sm:self-center">
                    <Link href={href}>
                      Periksa <ArrowRight />
                    </Link>
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </section>

      {!data.finance_visible ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/asisten" className="card card-pad block transition-colors hover:border-brand-300">
            <MessageCircle className="h-5 w-5 text-brand-700" />
            <h3 className="mt-2 font-semibold text-ink-950">Workspace CS</h3>
            <p className="mt-1 text-[13px] text-ink-600">Tempel pesan pembeli, salin draf bersumber dengan Enter.</p>
          </Link>
          <Link href="/asisten?mode=antrean" className="card card-pad block transition-colors hover:border-brand-300">
            <ListOrdered className="h-5 w-5 text-brand-700" />
            <h3 className="mt-2 font-semibold text-ink-950">Mode antrean</h3>
            <p className="mt-1 text-[13px] text-ink-600">Tempel banyak pesan; keluhan otomatis di urutan teratas.</p>
          </Link>
          <div className="card card-pad">
            <Truck className="h-5 w-5 text-brand-700" />
            <h3 className="mt-2 font-semibold text-ink-950">Batas kirim</h3>
            <p className="mt-1 text-[13px] text-ink-600">
              Senin–Jumat {data.operations?.shipping_rule?.cutoff_weekday ?? "14:00"} WIB · Sabtu {data.operations?.shipping_rule?.cutoff_saturday ?? "12:00"} WIB · Minggu tidak kirim.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* KPI */}
          <section>
            <p className="eyebrow">Semua data transaksi yang sudah diunggah</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <StatCard label="Omzet" value={formatRupiah(kpi.gross_sales)} detail={`${total} baris produk · dana dilepas ${formatRupiah(data.contribution?.dana_dilepas)}`} icon={<Wallet />} tone="brand" />
              <StatCard
                label="Laba Kontribusi I"
                value={formatRupiah(data.contribution?.lk1)}
                detail={data.contribution?.lk1_margin_pct ? `Margin ${formatPercent(data.contribution.lk1_margin_pct)} dari omzet · omzet − potongan − modal` : "Menunggu data lengkap"}
                icon={<TrendingUp />}
                tone="success"
              />
              <StatCard
                label="Kelengkapan data biaya"
                value={formatPercent(kpi.completeness_pct)}
                detail={`${complete} dari ${total} baris lengkap · LK II ${data.contribution?.lk2_status?.toLowerCase() ?? "—"}`}
                icon={<ShieldCheck />}
                tone={statusTone}
                badge={<Badge tone={statusTone}>{status}</Badge>}
              />
            </div>
          </section>

          {/* Channel & produk */}
          <section className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
            <div className="card overflow-hidden">
              <div className="border-b border-line-soft px-5 py-4">
                <p className="eyebrow">Kanal</p>
                <h2 className="mt-1 text-lg">Laba Kontribusi I per kanal</h2>
              </div>
              <div className="divide-y divide-line-soft">
                {channels.length === 0 ? <p className="p-5 text-sm text-ink-600">Belum ada data kanal.</p> : null}
                {channels.map((channel) => {
                  const profit = numberValue(channel.lk1)
                  return (
                    <div key={channel.marketplace} className="space-y-2 px-5 py-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <MarketplaceBadge marketplace={channel.marketplace} className="text-[13px] text-ink-900" />
                        <span className={cn("font-semibold tabular-nums", profit !== null && profit < 0 ? "text-danger-700" : "text-ink-950")}>
                          {formatRupiah(channel.lk1)} <span className="font-normal text-ink-500">({formatPercent(channel.lk1_margin_pct)})</span>
                        </span>
                      </div>
                      <Progress value={(Math.abs(profit ?? 0) / maxProfit) * 100} tone={profit !== null && profit < 0 ? "danger" : "brand"} />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-end justify-between border-b border-line-soft px-5 py-4">
                <div>
                  <p className="eyebrow">Produk</p>
                  <h2 className="mt-1 text-lg">Penyumbang laba terbesar</h2>
                </div>
                <Link href="/laba" className="link-quiet">Semua SKU</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th className="text-right">Terjual</th>
                      <th className="text-right">LK I</th>
                      <th className="text-right">Harga impas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.top_sku_lk1 || []).map((product) => (
                      <tr key={product.sku}>
                        <td>
                          <div className="font-semibold text-ink-950">{product.product_name || product.sku}</div>
                          <div className="font-mono text-[11px] text-ink-500">{product.sku}</div>
                        </td>
                        <td className="text-right tabular-nums">{product.qty}</td>
                        <td className="text-right font-semibold tabular-nums text-ink-950">
                          {formatRupiah(product.lk1)} <span className="block text-[11px] font-normal text-ink-500">{formatPercent(product.lk1_margin_pct)}</span>
                        </td>
                        <td className="text-right tabular-nums">{formatRupiah(product.break_even_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      <Alert variant="info" hideIcon={false} className="text-xs">
        Data simulasi Toko Husin. Laba yang ditampilkan adalah Laba Kontribusi (bukan laba bersih); biaya tetap seperti gaji dan sewa tidak dihitung.
      </Alert>
    </div>
  )
}

function HomeSkeleton() {
  const bone = "animate-pulse rounded-md bg-ink-100"
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat ringkasan toko">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className={cn(bone, "h-3 w-28")} />
          <div className={cn(bone, "h-7 w-56")} />
        </div>
        <div className={cn(bone, "h-6 w-24 rounded-full")} />
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="space-y-3 p-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <div className={cn(bone, "h-9 w-9 shrink-0 rounded-md")} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={cn(bone, "h-3 w-2/5")} />
                <div className={cn(bone, "h-3 w-4/5")} />
              </div>
              <div className={cn(bone, "hidden h-8 w-16 sm:block")} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-card p-5">
            <div className="flex items-center justify-between">
              <div className={cn(bone, "h-3 w-20")} />
              <div className={cn(bone, "h-8 w-8 rounded-md")} />
            </div>
            <div className={cn(bone, "mt-5 h-8 w-32")} />
            <div className={cn(bone, "mt-4 h-3 w-4/5")} />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-card p-5">
            <div className={cn(bone, "h-3 w-24")} />
            <div className={cn(bone, "mt-3 h-6 w-52")} />
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <div className={cn(bone, "h-3 w-24")} />
                    <div className={cn(bone, "h-3 w-20")} />
                  </div>
                  <div className={cn(bone, "h-1.5 w-full rounded-full")} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
