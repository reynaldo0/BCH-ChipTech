"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Info, PackageX, RefreshCw, ShieldCheck, TrendingUp, Wallet } from "lucide-react"
import { api } from "@/lib/api"
import { actionableItems, completenessLabel, formatPercent, formatRupiah, numberValue, OverviewResponse } from "@/lib/metrics"
import { Alert } from "@/components/ui/alert"
import { Badge, MarketplaceBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/ui/stat-card"
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

  useEffect(() => {
    api
      .get<OverviewResponse>("/api/insights/overview")
      .then(setData)
      .catch(() => setError("Ringkasan belum bisa dimuat. Periksa koneksi lalu coba lagi."))
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
  const maxProfit = Math.max(1, ...channels.map((c) => Math.abs(numberValue(c.profit_complete) ?? 0)))

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
              const href =
                item.link === "/profit" ? "/laba?filter=RECONCILIATION_REQUIRED" : item.link === "/complaints" ? "/keluhan?severity=tinggi" : "/produk?filter=stok"
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

      {/* KPI */}
      <section>
        <p className="eyebrow">Ringkasan 30 hari terakhir</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <StatCard label="Penjualan kotor" value={formatRupiah(kpi.gross_sales)} detail={`${total} transaksi`} icon={<Wallet />} tone="brand" />
          <StatCard
            label="Laba bersih"
            value={formatRupiah(kpi.profit_complete)}
            detail={kpi.margin_complete_pct ? `Margin ${formatPercent(kpi.margin_complete_pct)}` : "Menunggu data lengkap"}
            icon={<TrendingUp />}
            tone="success"
          />
          <StatCard
            label="Kelengkapan data biaya"
            value={formatPercent(kpi.completeness_pct)}
            detail={`${complete} dari ${total} transaksi lengkap`}
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
            <p className="eyebrow">Performa</p>
            <h2 className="mt-1 text-lg">Laba per channel</h2>
          </div>
          <div className="divide-y divide-line-soft">
            {channels.length === 0 ? <p className="p-5 text-sm text-ink-600">Belum ada data channel.</p> : null}
            {channels.map((channel) => {
              const profit = numberValue(channel.profit_complete)
              return (
                <div key={channel.marketplace} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <MarketplaceBadge marketplace={channel.marketplace} className="text-[13px] text-ink-900" />
                    <span className={cn("font-semibold tabular-nums", profit !== null && profit < 0 ? "text-danger-700" : "text-ink-950")}>
                      {formatRupiah(channel.profit_complete)}
                    </span>
                  </div>
                  <Progress value={(Math.abs(profit ?? 0) / maxProfit) * 100} tone={profit !== null && profit < 0 ? "danger" : "brand"} />
                </div>
              )
            })}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line-soft px-5 py-4">
            <p className="eyebrow">Produk</p>
            <h2 className="mt-1 text-lg">Produk terlaris</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Terjual</th>
                  <th className="text-right">Stok</th>
                  <th className="text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {(data.top_products || []).slice(0, 5).map((product) => {
                  const lowStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
                  return (
                    <tr key={product.sku}>
                      <td>
                        <div className="font-semibold text-ink-950">{product.product_name || product.sku}</div>
                        <div className="font-mono text-[11px] text-ink-500">{product.sku}</div>
                      </td>
                      <td className="text-right tabular-nums">{product.qty ?? "—"}</td>
                      <td className="text-right tabular-nums">
                        {lowStock ? (
                          <Badge tone="danger" icon={<PackageX className="h-3 w-3" />}>Habis</Badge>
                        ) : (
                          (product.stock ?? "—")
                        )}
                      </td>
                      <td className="text-right font-semibold tabular-nums text-ink-950">{formatRupiah(product.profit_complete)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Alert variant="info" hideIcon={false} className="text-xs">
        Angka berasal dari transaksi demo Toko Husin. Status kelengkapan dihitung dari transaksi yang sama dengan daftar tindakan di atas.
      </Alert>
    </div>
  )
}

function HomeSkeleton() {
  const bone = "animate-pulse rounded-lg bg-ink-100"
  return (
    <div className="space-y-8" aria-busy="true">
      <div className={cn(bone, "h-7 w-56")} />
      <div className={cn(bone, "h-48")} />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn(bone, "h-36")} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cn(bone, "h-56")} />
        <div className={cn(bone, "h-56")} />
      </div>
    </div>
  )
}
