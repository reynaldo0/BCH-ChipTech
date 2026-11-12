"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, Boxes, CircleHelp, LayoutDashboard, MessageCircle, Menu, Settings, ShoppingBag, UserRound, X } from "lucide-react"
import { BrandMark } from "./BrandMark"
import { ChatCopilotView } from "./views/ChatCopilotView"
import { api, setSessionToken, type Role } from "@/lib/api"
import { ROLE_LABELS } from "@/lib/navigation"

const navigation = [
  { href: "/", label: "Beranda", icon: LayoutDashboard },
  { href: "/laba", label: "Pesanan & Laba", icon: BarChart3 },
  { href: "/keluhan", label: "Keluhan", icon: CircleHelp },
  { href: "/produk", label: "Produk & Stok", icon: Boxes },
  { href: "/asisten", label: "Asisten", icon: MessageCircle },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
]

export function AppShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [role, setRole] = useState<Role>("owner")
  const [switchingRole, setSwitchingRole] = useState(false)
  const [roleError, setRoleError] = useState("")

  useEffect(() => {
    const savedRole = window.localStorage.getItem("kompas_role") as Role | null
    if (savedRole && savedRole in ROLE_LABELS) setRole(savedRole)
  }, [])

  async function handleRoleChange(nextRole: Role) {
    const previousRole = role
    setRoleError("")
    setRole(nextRole)
    window.localStorage.setItem("kompas_role", nextRole)
    setSwitchingRole(true)
    try {
      const response = await api.post<{ token: string }>("/api/auth/switch-role", { role: nextRole })
      setSessionToken(response.token)
      window.location.reload()
    } catch (error) {
      console.error("Gagal mengganti mode pengguna:", error)
      setRoleError("Mode belum berubah. Pastikan server toko sedang berjalan.")
      setRole(previousRole)
      window.localStorage.setItem("kompas_role", previousRole)
      setSwitchingRole(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-ink-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-line bg-surface transition-transform duration-drawer lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-5">
          <Link href="/" onClick={() => setMobileOpen(false)}><BrandMark /></Link>
          <button className="rounded-sm p-2 text-ink-600 hover:bg-surface-muted lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-line-soft px-6 py-4">
          <p className="text-xs text-ink-600">Toko Husin</p>
          <p className="mt-1 text-[11px] text-ink-500">Ringkasan usaha marketplace</p>
          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-ink-500" htmlFor="role-switcher">Mode kerja</label>
          <div className="relative mt-1">
            <UserRound className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-500" />
            <select id="role-switcher" value={role} disabled={switchingRole} onChange={(event) => void handleRoleChange(event.target.value as Role)} className="field-control pl-8 text-xs">
              {(Object.keys(ROLE_LABELS) as Role[]).map((item) => <option key={item} value={item}>{ROLE_LABELS[item].short}</option>)}
            </select>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-ink-500">{ROLE_LABELS[role].description}</p>
          {roleError && <p className="mt-2 text-[11px] leading-4 text-danger">{roleError}</p>}
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi utama">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-900">
              <item.icon className="h-4 w-4 shrink-0 text-ink-600" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line-soft p-5">
          <Link href="/demo" className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline">Panduan demo</Link>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-ink-950/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:flex-nowrap lg:px-8 lg:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-sm p-2 text-ink-700 hover:bg-surface-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-semibold text-ink-950">{title}</h1>
                <p className="hidden text-sm text-ink-600 sm:block">{description}</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              <select aria-label="Periode" defaultValue="30" className="field-control min-w-0 flex-1 sm:w-40 sm:flex-none">
                <option value="30">30 hari terakhir</option>
                <option value="7">7 hari terakhir</option>
              </select>
              <select aria-label="Channel" defaultValue="semua" className="field-control min-w-0 flex-1 sm:w-36 sm:flex-none">
                <option value="semua">Semua channel</option>
                <option>Shopee</option>
                <option>TikTok Shop</option>
                <option>Lazada</option>
              </select>
              <button onClick={() => setAssistantOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800" aria-label="Tanya asisten">
                <MessageCircle className="h-4 w-4" /> <span className="hidden md:inline">Tanya asisten</span>
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-shell px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
      {assistantOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-ink-950/30" onClick={() => setAssistantOpen(false)} aria-label="Tutup asisten" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-hidden border-l border-line bg-canvas shadow-pop">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface px-4 py-4 sm:px-6">
              <div className="min-w-0"><h2 className="font-display text-lg font-semibold text-ink-950">Asisten</h2><p className="text-sm text-ink-600">Buat jawaban dari data toko yang tersedia.</p></div>
              <button onClick={() => setAssistantOpen(false)} className="rounded-sm p-2 text-ink-600 hover:bg-surface" aria-label="Tutup asisten"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <ChatCopilotView compact />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
