"use client"

import React from "react"
import {
  Menu,
  Sparkles,
  RefreshCw,
  ShoppingBag,
} from "lucide-react"
import { TabType } from "./Navbar"

interface HeaderProps {
  currentTab: TabType
  jevEnabled: boolean
  onToggleJev: () => void
  onResetDemo: () => void
  isResetting?: boolean
  searchQuery?: string
  onSearchChange?: (q: string) => void
  onToggleSidebar?: () => void
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  overview: {
    title: "Ringkasan Bisnis & Operasional",
    subtitle: "Pantau margin laba, kapasitas gudang harian, dan katalog unggulan Toko Husin",
  },
  chat: {
    title: "Chat Copilot AI Workbench",
    subtitle: "Asisten CS cerdas dengan basis data terverifikasi dan perlindungan policy gate",
  },
  profit: {
    title: "Profit Engine & Rekonsiliasi",
    subtitle: "Kalkulasi laba deterministik tanpa pembulatan mengambang (Decimal exact math)",
  },
  complaints: {
    title: "Pusat Keluhan & Biaya Retur",
    subtitle: "Hubungkan tiket komplain pembeli langsung ke penyesuaian laba bersih",
  },
  products: {
    title: "Product Brain & SOP Toko",
    subtitle: "Basis pengetahuan resmi: 30 produk, 32 SOP, kalender kapasitas, dan 30 FAQ",
  },
  detective: {
    title: "Detective Margin & What-If Simulator",
    subtitle: "Identifikasi kebocoran fee dan simulasi dampak perubahan harga / diskon",
  },
  evaluation: {
    title: "Evaluasi Juri & Golden Set Benchmark",
    subtitle: "Uji independen terhadap 27 kasus chat (GC-01..27) dan 18 kasus laba (PFT-001..18)",
  },
  settings: {
    title: "Pengaturan Biaya & Jejak Audit",
    subtitle: "Matriks komisi marketplace dan catatan kronologis aktivitas sistem",
  },
}

export function Header({
  currentTab,
  jevEnabled,
  onToggleJev,
  onResetDemo,
  isResetting,
  onToggleSidebar,
}: HeaderProps) {
  const currentMeta = TAB_TITLES[currentTab] || TAB_TITLES.overview

  return (
    <header className="min-h-16 py-3 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_10px_rgba(15,23,42,0.02)] gap-3">
      {/* Left: Mobile hamburger + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
          title="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display truncate">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-slate-500 truncate hidden md:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Marketplace Pills - Visible from lg */}
        <div className="hidden xl:flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 text-[11px] font-bold border border-orange-200/60 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            Shopee
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[11px] font-bold border border-zinc-200/60 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900"></span>
            TikTok
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Lazada
          </span>
        </div>

        {/* Jev AI Toggle Pill */}
        <button
          onClick={onToggleJev}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            jevEnabled
              ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-sm shadow-purple-500/10"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
          title="Klik untuk mengubah mode Jev AI / Mesin Fallback"
        >
          <span
            className={`flex h-2 w-2 rounded-full ${
              jevEnabled ? "bg-purple-600 animate-pulse" : "bg-slate-400"
            }`}
          />
          <Sparkles className="h-3.5 w-3.5 text-purple-600 hidden xs:inline" />
          <span>{jevEnabled ? "Jev AI" : "Fallback"}</span>
        </button>

        {/* Reset Demo Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
          title="Reset seluruh data transaksi, stok, dan komplain ke kondisi awal"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>
      </div>
    </header>
  )
}
