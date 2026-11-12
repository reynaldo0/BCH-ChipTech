"use client"

import React, { useState, useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { TabType, ROLE_LABELS } from "@/components/Navbar"
import { OverviewView } from "@/components/views/OverviewView"
import { ChatCopilotView } from "@/components/views/ChatCopilotView"
import { ProfitEngineView } from "@/components/views/ProfitEngineView"
import { ComplaintsView } from "@/components/views/ComplaintsView"
import { ProductBrainView } from "@/components/views/ProductBrainView"
import { DetectiveView } from "@/components/views/DetectiveView"
import { EvaluationView } from "@/components/views/EvaluationView"
import { SettingsView } from "@/components/views/SettingsView"
import { Role, api } from "@/lib/api"
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react"

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<TabType>("overview")
  const [currentRole, setCurrentRole] = useState<Role>("owner")
  const [jevEnabled, setJevEnabled] = useState<boolean>(true)
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false)
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)

  useEffect(() => {
    syncInitialState()
  }, [])

  async function syncInitialState() {
    try {
      const providerRes = await api.get<{ jev_enabled?: boolean }>("/api/chat/provider")
      if (providerRes && typeof providerRes.jev_enabled === "boolean") {
        setJevEnabled(providerRes.jev_enabled)
      }
    } catch (err) {
      console.warn("Gagal mengecek status Jev AI:", err)
    }

    try {
      const authRes = await api.post<{ token?: string }>("/api/auth/switch-role", { role: currentRole })
      if (authRes?.token && typeof window !== "undefined") {
        localStorage.setItem("kompas_token", authRes.token)
      }
    } catch (err) {
      console.warn("Gagal login otomatis role:", err)
    }
  }

  async function handleRoleChange(newRole: Role) {
    try {
      const res = await api.post<{ token?: string }>("/api/auth/switch-role", { role: newRole })
      if (res?.token && typeof window !== "undefined") {
        localStorage.setItem("kompas_token", res.token)
      }
      setCurrentRole(newRole)
      setToast({
        type: "success",
        message: `Beralih ke persona: ${ROLE_LABELS[newRole].title} (${ROLE_LABELS[newRole].badge})`,
      })
      setTimeout(() => setToast(null), 4000)
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Gagal beralih persona peran.",
      })
    }
  }

  async function handleToggleJev() {
    try {
      const res = await api.post<{ jev_enabled: boolean; message: string }>("/api/chat/toggle-jev", {
        enabled: !jevEnabled,
      })
      setJevEnabled(res.jev_enabled)
      setToast({
        type: res.jev_enabled ? "success" : "info",
        message: res.message || `Jev AI sekarang ${res.jev_enabled ? "AKTIF" : "NONAKTIF (Fallback Lokal)"}`,
      })
      setTimeout(() => setToast(null), 4000)
    } catch (err: any) {
      setToast({
        type: "error",
        message: "Gagal mengubah mode Jev AI.",
      })
    }
  }

  async function handleResetDemo() {
    if (
      !confirm(
        "Apakah Anda yakin ingin me-reset seluruh data demo ke kondisi awal benchmark?\nSeluruh transaksi, stok produk, dan tiket keluhan akan dipulihkan."
      )
    ) {
      return
    }

    setIsResetting(true)
    try {
      const res = await api.post<{ message?: string }>("/api/settings/reset-demo")
      setToast({
        type: "success",
        message: res.message || "Data demo berhasil dipulihkan ke kondisi awal lengkap!",
      })
      setTimeout(() => {
        setToast(null)
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Gagal mereset data demo.",
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 antialiased flex flex-row">
      {/* 1. Left Vertical Modern Sidebar (Responsive with Drawer for mobile) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Canvas & Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          jevEnabled={jevEnabled}
          onToggleJev={handleToggleJev}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* 4 Core Loops Context Sub-Bar */}
        <div className="bg-white/80 border-b border-slate-200/70 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-slate-500 backdrop-blur-sm overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 whitespace-nowrap">
            <span className="font-extrabold text-blue-600 uppercase tracking-wider text-[10px]">
              4 Core Loops:
            </span>
            <button
              onClick={() => setCurrentTab("complaints")}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                currentTab === "complaints"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                  : "hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ① Keluhan → Margin
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setCurrentTab("profit")}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                currentTab === "profit"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                  : "hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ② Margin → CS
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setCurrentTab("chat")}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                currentTab === "chat"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                  : "hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ③ Stok + Kapasitas → Jawaban
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setCurrentTab("overview")}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                currentTab === "overview"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                  : "hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ④ Chat → Prioritas
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              FastAPI + Next.js Online
            </span>
          </div>
        </div>

        {/* Active View Container */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {currentTab === "overview" && <OverviewView onNavigate={(tab) => setCurrentTab(tab as TabType)} />}
          {currentTab === "chat" && <ChatCopilotView onNavigate={(tab) => setCurrentTab(tab as TabType)} />}
          {currentTab === "profit" && <ProfitEngineView />}
          {currentTab === "complaints" && <ComplaintsView />}
          {currentTab === "products" && <ProductBrainView />}
          {currentTab === "detective" && <DetectiveView />}
          {currentTab === "evaluation" && <EvaluationView />}
          {currentTab === "settings" && <SettingsView onResetDemo={handleResetDemo} isResetting={isResetting} />}
        </main>

        {/* Minimal Modern Footer */}
        <footer className="border-t border-slate-200/70 bg-white/60 px-6 py-4 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">KOMPAS Intelligence</span>
            <span>— Connected Operations & Margin for Toko Husin Dummy</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab("evaluation")}
              className="text-blue-600 hover:underline font-semibold"
            >
              Mode Juri & Audit Golden Set
            </button>
            <span>•</span>
            <span>v2026.1 Production</span>
          </div>
        </footer>
      </div>

      {/* Floating System Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />}
          {toast.type === "info" && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
          <div className="text-xs font-semibold text-slate-800">{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
