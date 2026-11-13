"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Settings,
  BookOpen,
  X,
  type LucideIcon,
} from "lucide-react"
import { BrandMark } from "./BrandMark"
import { ChatCopilotView } from "./views/ChatCopilotView"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api, setSessionToken, type Role } from "@/lib/api"
import { DEMO_LABEL, ROLE_LABELS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon }
const navigation: { label: string; items: NavItem[] }[] = [
  { label: "Ringkasan", items: [{ href: "/", label: "Beranda", icon: LayoutDashboard }] },
  {
    label: "Operasional",
    items: [
      { href: "/laba", label: "Pesanan & Laba", icon: BarChart3 },
      { href: "/keluhan", label: "Keluhan", icon: CircleHelp },
      { href: "/produk", label: "Produk & Stok", icon: Boxes },
    ],
  },
  { label: "Bantuan", items: [{ href: "/asisten", label: "Asisten", icon: MessageCircle }] },
  { label: "Sistem", items: [{ href: "/pengaturan", label: "Pengaturan", icon: Settings }] },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  const pathname = usePathname() || "/"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [role, setRole] = useState<Role>("owner")
  const [switchingRole, setSwitchingRole] = useState(false)
  const [roleError, setRoleError] = useState("")

  useEffect(() => {
    const savedRole = window.localStorage.getItem("kompas_role") as Role | null
    if (savedRole && savedRole in ROLE_LABELS) setRole(savedRole)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAssistantOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(17rem,calc(100vw-2rem))] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-drawer lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            <BrandMark variant="light" />
          </Link>
          <button
            className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-sidebar-border px-5 py-4">
          <label className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/70" htmlFor="role-switcher">
            Mode kerja
          </label>
          <select
            id="role-switcher"
            value={role}
            disabled={switchingRole}
            onChange={(event) => void handleRoleChange(event.target.value as Role)}
            className="mt-1.5 h-9 w-full cursor-pointer rounded-md border border-sidebar-border bg-sidebar-accent px-3 text-xs font-medium text-white transition-colors hover:border-brand-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((item) => (
              <option key={item} value={item} className="text-ink-950">
                {ROLE_LABELS[item].short}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] leading-4 text-sidebar-foreground/70">{ROLE_LABELS[role].description}</p>
          {roleError ? (
            <Alert variant="destructive" className="mt-3 p-2.5 text-[11px]" hideIcon>
              {roleError}
            </Alert>
          ) : null}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                        active ? "text-white" : "hover:bg-sidebar-accent/60 hover:text-white"
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-md bg-sidebar-accent ring-1 ring-inset ring-brand-700/50"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        />
                      ) : null}
                      {active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand-400" aria-hidden="true" /> : null}
                      <item.icon className={cn("relative h-4 w-4 shrink-0", active ? "text-brand-300" : "text-sidebar-foreground/70")} aria-hidden="true" />
                      <span className="relative">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Panduan demo
          </Link>
          <Badge tone="warning" className="w-full justify-center border-warning-500/30 bg-warning-400/10 font-mono text-[10px] tracking-wide text-warning-300">
            {DEMO_LABEL}
          </Badge>
        </div>
      </aside>

      {mobileOpen ? (
        <button className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />
      ) : null}

      {/* ── Konten ──────────────────────────────────────────────────────── */}
      <div className="relative min-h-screen lg:pl-[17rem]">
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
                <Menu />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-semibold leading-tight text-ink-950">{title}</h1>
                <p className="hidden truncate text-[13px] text-ink-600 sm:block">{description}</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              <select aria-label="Periode" defaultValue="30" className="field-control h-9 min-w-0 flex-1 sm:w-40 sm:flex-none">
                <option value="30">30 hari terakhir</option>
                <option value="7">7 hari terakhir</option>
              </select>
              <select aria-label="Channel" defaultValue="semua" className="field-control h-9 min-w-0 flex-1 sm:w-36 sm:flex-none">
                <option value="semua">Semua channel</option>
                <option>Shopee</option>
                <option>TikTok Shop</option>
                <option>Lazada</option>
              </select>
              <Button onClick={() => setAssistantOpen(true)} aria-label="Tanya asisten">
                <MessageCircle />
                <span className="hidden md:inline">Tanya asisten</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="bg-dots pointer-events-none absolute inset-x-0 top-[65px] h-56" aria-hidden="true" />
        <main className="relative mx-auto max-w-shell px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Drawer Asisten ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {assistantOpen ? (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Asisten">
            <motion.button
              className="absolute inset-0 bg-ink-950/40"
              onClick={() => setAssistantOpen(false)}
              aria-label="Tutup asisten"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-pop"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold text-ink-950">Asisten</h2>
                    <p className="text-[13px] text-ink-600">Buat jawaban dari data toko yang tersedia.</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAssistantOpen(false)} aria-label="Tutup asisten">
                  <X />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <ChatCopilotView compact />
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
