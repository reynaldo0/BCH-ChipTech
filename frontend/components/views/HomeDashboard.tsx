"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, AlertTriangle, Package, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { actionableItems, completenessLabel, formatPercent, formatRupiah, OverviewResponse } from "@/lib/metrics"

export function HomeDashboard() {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<OverviewResponse>("/api/insights/overview").then(setData).catch(() => setError("Ringkasan belum bisa dimuat. Periksa koneksi lalu coba lagi.")).finally(() => setLoading(false))
  }, [])

  if (loading) return <HomeSkeleton />
  if (error || !data) return <div className="card card-pad"><p className="text-sm text-danger">{error || "Ringkasan belum tersedia."}</p><button className="mt-4 inline-flex items-center gap-2 rounded-sm border border-line-strong px-3 py-2 text-sm font-semibold" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /> Coba lagi</button></div>

  const kpi = data.kpi || {}
  const items = actionableItems(data)
  const complete = kpi.complete_count ?? 0
  const total = kpi.transaction_count ?? 0

  return <div className="space-y-8">
    <section>
      <div className="mb-3 flex items-end justify-between gap-4"><div><p className="eyebrow">Prioritas hari ini</p><h2 className="mt-1 font-display text-2xl font-semibold">Perlu tindakan hari ini</h2></div><span className="text-sm text-ink-600">{items.length} hal utama</span></div>
      <div className="card divide-y divide-line-soft">
        {items.length === 0 ? <div className="card-pad text-sm text-ink-600">Tidak ada tindakan mendesak untuk periode ini.</div> : items.map((item) => <div key={`${item.type}-${item.title}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${item.level === "danger" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"}`}><AlertTriangle className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-ink-950">{item.title}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-ink-600">{item.description}</p></div></div>
          <Link href={item.link === "/profit" ? "/laba?filter=RECONCILIATION_REQUIRED" : item.link === "/complaints" ? "/keluhan?severity=tinggi" : "/produk?filter=stok"} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-line-strong px-3 py-2 text-sm font-semibold text-brand-800 hover:border-brand-500 hover:bg-brand-50">Periksa <ArrowRight className="h-4 w-4" /></Link>
        </div>)}
      </div>
    </section>
    <section><p className="eyebrow">Ringkasan 30 hari terakhir</p><div className="mt-3 grid gap-4 md:grid-cols-3">
      <MetricCard label="Penjualan kotor" value={formatRupiah(kpi.gross_sales)} detail={`${total} transaksi`} />
      <MetricCard label="Laba bersih" value={formatRupiah(kpi.profit_complete)} detail={kpi.margin_complete_pct ? `Margin ${formatPercent(kpi.margin_complete_pct)}` : "Menunggu data lengkap"} />
      <MetricCard label="Kelengkapan data biaya" value={formatPercent(kpi.completeness_pct)} detail={`${complete} dari ${total} transaksi lengkap`} status={completenessLabel(kpi)} />
    </div></section>
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="card overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="eyebrow">Performa</p><h2 className="mt-1 font-display text-lg font-semibold">Laba per channel</h2></div><div className="divide-y divide-line-soft">{(data.by_marketplace || []).map((channel) => <div key={channel.marketplace} className="flex items-center justify-between px-5 py-4 text-sm"><span>{channel.marketplace}</span><span className="font-semibold tabular-nums">{formatRupiah(channel.profit_complete)}</span></div>)}</div></div>
      <div className="card overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="eyebrow">Produk</p><h2 className="mt-1 font-display text-lg font-semibold">Produk terlaris</h2></div><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Produk</th><th>Terjual</th><th>Stok</th><th>Laba</th></tr></thead><tbody>{(data.top_products || []).slice(0, 5).map((product) => <tr key={product.sku}><td><div className="font-semibold">{product.product_name || product.sku}</div><div className="text-xs text-ink-500">{product.sku}</div></td><td>{product.qty ?? "—"}</td><td>{product.stock ?? "—"}</td><td className="font-semibold tabular-nums">{formatRupiah(product.profit_complete)}</td></tr>)}</tbody></table></div></div>
    </section>
    <p className="text-xs text-ink-500">Angka berasal dari transaksi demo Toko Husin. Status kelengkapan dihitung dari transaksi yang sama dengan daftar tindakan di atas.</p>
  </div>
}

function MetricCard({ label, value, detail, status }: { label: string; value: string; detail: string; status?: string }) {
  return <div className="card card-pad"><p className="text-sm font-medium text-ink-600">{label}</p><p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-950">{value}</p><p className="mt-2 text-sm text-ink-600">{status ? <span className="font-semibold text-warning">{status}</span> : detail}</p>{status && <p className="mt-1 text-xs text-ink-500">{detail}</p>}</div>
}

function HomeSkeleton() {
  return <div className="space-y-8" aria-busy="true"><div className="h-7 w-56 animate-pulse rounded-sm bg-line-soft" /><div className="card h-48 animate-pulse bg-line-soft" /><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="card h-36 animate-pulse bg-line-soft" />)}</div><div className="grid gap-6 lg:grid-cols-2"><div className="card h-56 animate-pulse bg-line-soft" /><div className="card h-56 animate-pulse bg-line-soft" /></div></div>
}
