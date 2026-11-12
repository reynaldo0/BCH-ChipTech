"use client"

import React, { useEffect, useState } from "react"
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Flame,
  ArrowDownRight,
  DollarSign,
  Layers,
  ShoppingBag,
  ExternalLink,
  Store,
  RefreshCw,
} from "lucide-react"
import DishOrbitCarousel, { Dish } from "@/components/ui/dish-orbit-carousel"
import { api } from "@/lib/api"
import { formatIDR, formatNumber } from "@/lib/utils"

// Product images formatted for the carousel (clean SVG / CDN images)
const SAMPLE_DISHES: Dish[] = [
  {
    title: "Kurma Premium",
    subtitle: "Ajwa Madinah",
    image: "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?w=400&auto=format&fit=crop&q=80",
    eyebrow: "#1 Best Seller Toko Husin",
    rating: 4.9,
    chef: "KRM-AJW-250",
    kitchen: "Oleh-Oleh Haji & Herbal",
    description: "Kurma Ajwa asli Madinah pilihan kualitas tertinggi. Daging lembut, manis pas alami, kaya serat dan antioksidan.",
    likes: 342,
    ingredients: ["100% Kurma Ajwa Aliyah", "Kemasan Vakum Higienis", "Halal ID0011000021345", "Kemasan 250g"],
    accent: "#10B981",
  },
  {
    title: "Kurma Basah",
    subtitle: "Sukari Al-Qassim",
    image: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&auto=format&fit=crop&q=80",
    eyebrow: "#2 Paling Disukai Pembeli",
    rating: 4.8,
    chef: "KRM-SKR-500",
    kitchen: "Oleh-Oleh Haji & Makanan",
    description: "Kurma basah Sukari dari Al-Qassim dengan tekstur sangat lembut dan rasa karamel manis yang legit.",
    likes: 289,
    ingredients: ["Kurma Sukari Basah", "Simpan Dingin", "Kemasan Kotak 500g", "Tanpa Pengawet"],
    accent: "#F59E0B",
  },
  {
    title: "Madu Murni",
    subtitle: "Habbatussauda Sunnah",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&auto=format&fit=crop&q=80",
    eyebrow: "#3 Herbal Pilihan Keluarga",
    rating: 4.9,
    chef: "SKU-HRBL-001",
    kitchen: "Herbal Alami Husin",
    description: "Madu randu asli diperkaya ekstrak habbatussauda (jintan hitam). Terdaftar resmi BPOM RI & bersertifikat Halal.",
    likes: 198,
    ingredients: ["Madu Nektar Randu 90%", "Ekstrak Habbatussauda 10%", "BPOM MD 252112001045", "Botol Kaca 350g"],
    accent: "#3B82F6",
  },
  {
    title: "Kacang Pistachio",
    subtitle: "Panggang Gurih Renyah",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80",
    eyebrow: "#4 Camilan Sehat Favorit",
    rating: 4.7,
    chef: "KCG-PST-250",
    kitchen: "Kacang & Biji-Bijian",
    description: "Kacang pistachio panggang dengan kulit terbuka alami. Gurih renyah tanpa garam berlebih, kaya protein nabati.",
    likes: 176,
    ingredients: ["Kacang Pistachio Pilihan", "Panggang Alami", "Garam Halus 0.5%", "Kemasan 250g"],
    accent: "#10B981",
  },
  {
    title: "Minyak Wangi Non-Alkohol",
    subtitle: "Kasturi Putih Asli",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&auto=format&fit=crop&q=80",
    eyebrow: "#5 Parfum Sunnah Best Seller",
    rating: 4.9,
    chef: "SKU-PRFM-001",
    kitchen: "Scentra Parfume Official",
    description: "Parfum roll-on biang konsentrat murni tanpa campuran alkohol. Aroma lembut menenangkan dan tahan lama seharian.",
    likes: 412,
    ingredients: ["100% Fragrance Oil", "Non-Alkohol", "Botol Roll-on Kaca 6ml", "Aman untuk Sholat"],
    accent: "#6366F1",
  },
]

export function OverviewView({ onNavigate }: { onNavigate?: (tab: any) => void } = {}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMarketTab, setActiveMarketTab] = useState<string>("ALL")

  useEffect(() => {
    loadOverview()
  }, [])

  async function loadOverview() {
    setLoading(true)
    try {
      const res = await api.get("/api/insights/overview")
      setData(res)
    } catch (err) {
      console.error("Gagal memuat overview:", err)
    } finally {
      setLoading(false)
    }
  }

  const kpi = data?.kpi || {}
  const ops = data?.operations || {}
  const todayCap = ops?.today_capacity || { capacity: 700, used: 240, remaining: 460 }
  const usedPct = Math.round((todayCap.used / (todayCap.capacity || 1)) * 100)

  return (
    <div className="space-y-6 pb-12">
      {/* Attention / Alerts Bar (if any) */}
      {data?.attention && data.attention.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.attention.map((item: any, idx: number) => (
            <div
              key={idx}
              onClick={() => onNavigate && onNavigate(item.link?.replace("/", "") || "overview")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-sm ${
                item.level === "danger"
                  ? "bg-rose-50/80 border-rose-200 text-rose-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.level === "danger" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{item.title}</div>
                  <div className="text-[11px] opacity-75 truncate">{item.description}</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
            </div>
          ))}
        </div>
      )}

      {/* Top 4 Key Metric Cards (Clean Modern Soft UI - Reference Image 3 & 4) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Sales */}
        <div className="modern-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Penjualan Bruto</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              156 Order
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 font-display tabular-nums">
            {formatIDR(kpi.gross_sales)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="flex items-center text-emerald-600 font-bold">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +100%
            </span>
            <span>Shopee, TikTok, Lazada</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <DollarSign className="h-20 w-20 text-blue-600" />
          </div>
        </div>

        {/* Net Revenue */}
        <div className="modern-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pendapatan Bersih (Net)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Status Lengkap
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-blue-600 font-display tabular-nums">
            {formatIDR(kpi.net_revenue_complete)}
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500">
            Setelah diskon toko & retur barang
          </div>
        </div>

        {/* Net Profit */}
        <div className="modern-card p-5 relative overflow-hidden border-emerald-200/80 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Laba Bersih Terverifikasi</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Margin {kpi.margin_complete_pct || "13.87"}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600 font-display tabular-nums">
            {formatIDR(kpi.profit_complete)}
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Matematika eksak (Decimal exact)</span>
          </div>
        </div>

        {/* Data Completeness */}
        <div className="modern-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Kelengkapan Biaya</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
              {kpi.completeness_pct || "96.79"}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            {kpi.overall_status || "Lengkap"}
          </div>
          <div className="mt-2 text-[11px] font-medium text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{kpi.reconciliation_count || 5} transaksi rekonsiliasi</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Left Central Area (8 cols) + Right Summary Column (4 cols) (Reference Image 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Hero Dish Orbit Carousel + Order Performance */}
        <div className="lg:col-span-8 space-y-6">
          {/* Dish Orbit Carousel Showcase */}
          <div className="modern-card p-6 border-slate-200/90 shadow-soft-md">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Katalog Unggulan Toko Husin</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Orbit Interaktif Produk Terlaris
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                Putar piringan / klik navigasi bawah
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl bg-slate-50/50 p-2 border border-slate-100">
              <DishOrbitCarousel
                dishes={SAMPLE_DISHES}
                height="440px"
                onPlay={(d) => onNavigate && onNavigate("products")}
                onOrder={(d) => onNavigate && onNavigate("profit")}
              />
            </div>
          </div>

          {/* Recent Orders Table (Reference Image 4) */}
          <div className="modern-card overflow-hidden">
            <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Transaksi Terkini (Multi-Marketplace)
                </h3>
                <p className="text-xs text-slate-500">
                  Riwayat 156 transaksi dummy dengan pemisahan status deterministik
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate("profit")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 font-semibold text-slate-500">
                    <th className="px-4 py-3">Order ID / Tanggal</th>
                    <th className="px-4 py-3">Marketplace</th>
                    <th className="px-4 py-3">SKU Produk</th>
                    <th className="px-4 py-3 text-right">Penjualan</th>
                    <th className="px-4 py-3 text-right">Laba Bersih</th>
                    <th className="px-4 py-3 text-center">Status Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[
                    { id: "ORD-SHP-101", date: "2026-11-06", market: "Shopee", sku: "KRM-AJW-250", gross: 90000, profit: 18450, status: "COMPLETE" },
                    { id: "ORD-TKT-204", date: "2026-11-06", market: "TikTok", sku: "SKU-PRFM-001", gross: 120000, profit: 24600, status: "COMPLETE" },
                    { id: "ORD-LAZ-305", date: "2026-11-05", market: "Lazada", sku: "SKU-HRBL-001", gross: 150000, profit: 22500, status: "COMPLETE" },
                    { id: "ORD-SHP-188", date: "2026-11-05", market: "Shopee", sku: "KRM-SKR-500", gross: 85000, profit: 11200, status: "RECON" },
                    { id: "ORD-TKT-241", date: "2026-11-04", market: "TikTok", sku: "KCG-PST-250", gross: 130000, profit: 19500, status: "COMPLETE" },
                  ].map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 font-mono">{tx.id}</div>
                        <div className="text-[10px] text-slate-400">{tx.date}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.market === "Shopee"
                              ? "bg-orange-50 text-orange-700"
                              : tx.market === "TikTok"
                              ? "bg-zinc-100 text-zinc-800"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {tx.market}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{tx.sku}</td>
                      <td className="px-4 py-3 text-right text-slate-800 tabular-nums">
                        {formatIDR(tx.gross)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 tabular-nums">
                        {formatIDR(tx.profit)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === "COMPLETE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {tx.status === "COMPLETE" ? "Lengkap" : "Rekonsiliasi"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Summary Column (4 cols) (Reference Image 3 & 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Balance & Margin Donut (Reference Image 3 "Current Balance") */}
          <div className="modern-card p-5 bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Laba Bersih Terverifikasi</span>
              <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +13.87%
              </span>
            </div>

            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 font-display tabular-nums">
              {formatIDR(kpi.profit_complete || 1738165)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total margin riil dari 156 order selesai
            </p>

            {/* Circular Gauge / Donut Simulation (Reference Image 3 & 4) */}
            <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800">Tingkat Kelengkapan</div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-bold text-emerald-600">151</span> dari 156 Order Lengkap
                </div>
                <div className="text-[10px] text-amber-600 font-medium">
                  5 Order Menunggu Biaya Ongkir
                </div>
              </div>

              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600"
                    strokeDasharray="96, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-xs font-extrabold text-slate-800">96.8%</div>
              </div>
            </div>

            {/* Marketplace Split */}
            <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  <span>Shopee</span>
                </div>
                <span className="font-bold text-slate-800 tabular-nums">Rp812.000</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-zinc-900"></span>
                  <span>TikTok Shop</span>
                </div>
                <span className="font-bold text-slate-800 tabular-nums">Rp540.000</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <span>Lazada</span>
                </div>
                <span className="font-bold text-slate-800 tabular-nums">Rp386.165</span>
              </div>
            </div>
          </div>

          {/* Card 2: Warehouse Packing Capacity (Loop ③) */}
          <div className="modern-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span>Kapasitas Gudang Hari Ini</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Cutoff {ops.shipping_rule?.cutoff_weekday || "14:00"} WIB
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 font-display">
                    {todayCap.remaining} <span className="text-xs font-normal text-slate-500">sisa kuota</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {todayCap.used} dari {todayCap.capacity} paket telah diproses
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                  {usedPct}% Terpakai
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${usedPct}%` }}
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 flex items-center gap-2 border border-slate-200/60">
                <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                <span>
                  {todayCap.remaining > 50
                    ? "Pesanan masuk sekarang dijamin kirim hari ini."
                    : "Kapasitas hampir penuh; pesanan baru masuk batch esok."}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Top Categories (Reference Image 4) */}
          <div className="modern-card p-5">
            <h3 className="font-bold text-sm text-slate-900 font-display mb-3">
              Kategori Terlaris
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                    KM
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Kurma & Makanan</div>
                    <div className="text-[10px] text-slate-500">Ajwa, Sukari, Pistachio</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-800">420 Unit</span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    PF
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Parfum & Biang</div>
                    <div className="text-[10px] text-slate-500">Kasturi Putih, Non-Alkohol</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-blue-800">310 Unit</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                    HB
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Herbal & Sunnah</div>
                    <div className="text-[10px] text-slate-500">Madu Habbatussauda, Zaitun</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-800">185 Unit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
