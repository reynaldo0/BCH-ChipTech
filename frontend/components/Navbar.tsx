"use client"

import React, { useState } from "react"
import {
  Compass,
  Sparkles,
  Bot,
  UserCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import { Role } from "@/lib/api"

export type TabType =
  | "overview"
  | "chat"
  | "profit"
  | "complaints"
  | "products"
  | "detective"
  | "evaluation"
  | "settings"

interface NavbarProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
  currentRole: Role
  onRoleChange: (role: Role) => void
  jevEnabled: boolean
  onToggleJev: () => void
  onResetDemo: () => void
  isResetting?: boolean
}

export const ROLE_LABELS: Record<Role, { title: string; badge: string; color: string }> = {
  owner: { title: "Husin (Pemilik)", badge: "Owner", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  manager: { title: "Manajer Operasional", badge: "Manager", color: "bg-blue-100 text-blue-800 border-blue-300" },
  cs: { title: "Spesialis Layanan (CS)", badge: "CS Agent", color: "bg-teal-100 text-teal-800 border-teal-300" },
  packing: { title: "Staf Gudang & Packing", badge: "Packing", color: "bg-amber-100 text-amber-800 border-amber-300" },
  judge: { title: "Juri & Evaluator", badge: "Evaluator", color: "bg-purple-100 text-purple-800 border-purple-300" },
}

export function Navbar({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  jevEnabled,
  onToggleJev,
  onResetDemo,
  isResetting,
}: NavbarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Ringkasan", icon: "📊" },
    { id: "chat", label: "Chat Copilot", icon: "💬" },
    { id: "profit", label: "Profit Engine", icon: "💰" },
    { id: "complaints", label: "Pusat Keluhan", icon: "⚠️" },
    { id: "products", label: "Product Brain", icon: "🧠" },
    { id: "detective", label: "Detective & What-If", icon: "🔍" },
    { id: "evaluation", label: "Evaluasi Juri", icon: "⚖️" },
    { id: "settings", label: "Pengaturan & Audit", icon: "⚙️" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-kompas-border bg-white/95 backdrop-blur-md transition-all shadow-sm">
      {/* Top utility row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs border-b border-[#F0F4F1]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-teal-mid">
            <Store className="h-3.5 w-3.5" />
            <span>Toko Husin Dummy (Scentra Parfume & Oleh-Oleh Haji)</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-700 border border-orange-200">
              Shopee
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-800 border border-zinc-200">
              TikTok Shop
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 border border-blue-200">
              Lazada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Jev AI mode pill */}
          <button
            onClick={onToggleJev}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all border ${
              jevEnabled
                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
            }`}
            title="Klik untuk beralih mode Jev AI vs Deterministic Rule-Based"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Jev AI: {jevEnabled ? "Aktif (Simulasi)" : "Fallback (Rule-Based)"}</span>
          </button>

          {/* Role switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-all ${ROLE_LABELS[currentRole].color}`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Peran: {ROLE_LABELS[currentRole].badge}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-kompas-border bg-white p-1.5 shadow-lg z-50">
                <div className="px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase">
                  Pilih Peran Demo
                </div>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onRoleChange(r)
                      setShowRoleMenu(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      currentRole === r
                        ? "bg-teal-50 font-bold text-teal-mid"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{ROLE_LABELS[r].title}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600">
                      {ROLE_LABELS[r].badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo button */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Reset ulang seluruh basis data ke kondisi awal"
          >
            <RefreshCw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main branding & tab row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deep-teal text-white shadow-sm">
            <Compass className="h-6 w-6 text-teal-light animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-deep-teal">KOMPAS</h1>
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-extrabold text-teal-900 uppercase tracking-wider">
                v1.0 DEMO
              </span>
            </div>
            <p className="text-[11px] font-medium text-gray-500">
              Connected Operations & Margin Intelligence
            </p>
          </div>
        </div>

        {/* Tab pills */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-teal-mid text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-deep-teal"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
