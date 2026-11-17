"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
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
  ChevronDown,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react"
import { BrandMark } from "./BrandMark"
import { ChatCopilotView } from "./views/ChatCopilotView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError, DEMO_MODE, hasAuthenticatedSession, setSessionToken, verifySession, type Role } from "@/lib/api"
import { useProviderMode } from "./views/cs-shared"
import { DEMO_LABEL, ROLE_LABELS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[] }
const FINANCE: Role[] = ["owner", "manager", "judge"]
const navigation: { label: string; items: NavItem[] }[] = [
  { label: "Ringkasan", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Layanan pelanggan",
    items: [
      { href: "/asisten", label: "Workspace CS", icon: MessageCircle },
      { href: "/keluhan", label: "Keluhan & eskalasi", icon: CircleHelp },
    ],
  },
  {
    label: "Data toko",
    items: [
      { href: "/produk", label: "Produk & Stok", icon: Boxes },
      { href: "/laba", label: "Laba Kontribusi", icon: BarChart3, roles: FINANCE },
    ],
  },
  { label: "Sistem", items: [{ href: "/pengaturan", label: "Pengaturan & audit", icon: Settings, roles: ["owner", "manager", "judge"] }] },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  const pathname = usePathname() || "/"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(() => navigation.map((group) => group.label))
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [role, setRole] = useState<Role>("owner")
  const providerMode = useProviderMode()

  const [userName, setUserName] = useState("")
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const activeGroup = navigation.find((group) => group.items.some((item) => isActive(pathname, item.href)))
    if (activeGroup) {
      setOpenGroups((groups) => (groups.includes(activeGroup.label) ? groups : [...groups, activeGroup.label]))
    }
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const redirectToLogin = () => {
      const next = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/masuk?next=${encodeURIComponent(next)}`)
    }

    if (!hasAuthenticatedSession()) {
      redirectToLogin()
      return
    }
    verifySession()
      .then((me) => {
        if (cancelled) return
        setRole(me.role)
        setUserName(me.display_name)
        window.localStorage.setItem("kompas_role", me.role)
        setAuthReady(true)
      })
      .catch((error) => {
        if (cancelled) return
        if (!(error instanceof ApiError && error.status === 401)) console.error("Sesi pengguna tidak dapat diverifikasi:", error)
        redirectToLogin()
      })
    return () => {
      cancelled = true
    }
  }, [])

  function logout() {
    setSessionToken(null)
    window.localStorage.removeItem("kompas_role")
    window.location.assign("/masuk")
  }

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

  function toggleGroup(label: string) {
    setOpenGroups((groups) => (groups.includes(label) ? groups.filter((group) => group !== label) : [...groups, label]))
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-ink-600">
        Memeriksa sesi pengguna...
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "sidebar fixed inset-y-0 left-0 z-40 flex w-[min(17rem,calc(100vw-2rem))] flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-drawer lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-[17rem]",
          mobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-sidebar-border", sidebarCollapsed ? "justify-center px-3" : "justify-between px-5")}>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn("rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400", sidebarCollapsed && "hidden")}
          >
            <BrandMark variant="light" />
          </Link>
          {sidebarCollapsed ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label="Buka beranda KOMPAS"
            >
              <BrandMark variant="light" compact />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSidebarCollapsed((collapsed) => !collapsed)
              setMobileOpen(false)
            }}
            aria-label={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            data-tooltip={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            className={cn(
              "tooltip-trigger hidden rounded-lg border border-transparent p-2 text-sidebar-foreground transition-all duration-150 hover:border-brand-700/60 hover:bg-brand-700/20 hover:text-white hover:shadow-[0_2px_5px_rgba(55,84,247,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:translate-y-px lg:flex"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            data-tooltip="Tutup sidebar"
            className="tooltip-trigger rounded-lg border border-transparent p-2 text-sidebar-foreground transition-all duration-150 hover:border-brand-700/60 hover:bg-brand-700/20 hover:text-white hover:shadow-[0_2px_5px_rgba(55,84,247,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:translate-y-px lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn("border-b border-sidebar-border px-5 py-4", sidebarCollapsed && "lg:hidden")}>
          <div>
              <p className="font-sans text-[11px] font-medium text-sidebar-foreground/70">Akun aktif</p>
              <p className="mt-1.5 text-sm font-medium text-white">{userName || ROLE_LABELS[role].name}</p>
              <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/70">
                {ROLE_LABELS[role].short} · {ROLE_LABELS[role].description}
              </p>
              <button
                type="button"
                onClick={logout}
                className="mt-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-1 text-xs font-semibold text-sidebar-foreground shadow-[0_2px_5px_rgba(0,0,0,0.16)] transition-all duration-150 hover:border-brand-700/60 hover:bg-brand-700/25 hover:text-white hover:shadow-[0_3px_8px_rgba(55,84,247,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:translate-y-px"
              >
                Keluar
              </button>
            </div>
        </div>

        <nav className={cn("scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4", sidebarCollapsed && "lg:px-2")} aria-label="Navigasi utama">
          {navigation
            .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
            .filter((group) => group.items.length)
            .map((group) => (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={openGroups.includes(group.label)}
                className={cn(
                  "flex w-full items-center rounded-md border border-transparent py-2 text-left font-sans text-[13px] font-semibold text-sidebar-foreground/75 transition-all duration-150 hover:border-brand-700/50 hover:bg-brand-700/15 hover:text-white hover:shadow-[0_2px_5px_rgba(55,84,247,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:translate-y-px",
                  sidebarCollapsed ? "lg:hidden" : "justify-start gap-2 px-3"
                )}
              >
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{group.label}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", openGroups.includes(group.label) ? "rotate-180" : "", sidebarCollapsed && "lg:hidden")} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {openGroups.includes(group.label) ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className={cn("space-y-0.5 pb-1 pt-0.5", sidebarCollapsed && "lg:pt-0")}>
                      {group.items.map((item) => {
                        const active = isActive(pathname, item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "tooltip-trigger relative flex items-center gap-3 rounded-md px-3 py-2 pl-6 font-sans text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                              sidebarCollapsed && "lg:justify-center lg:px-2 lg:pl-2",
                              active ? "text-white" : "hover:bg-sidebar-accent/60 hover:text-white"
                            )}
                            data-tooltip={sidebarCollapsed ? item.label : undefined}
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
                            <span className={cn("relative", sidebarCollapsed && "lg:hidden")}>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className={cn("space-y-3 border-t border-sidebar-border p-4", sidebarCollapsed && "lg:hidden")}>
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Panduan demo
          </Link>
          {DEMO_MODE ? (
            <Badge tone="warning" className="w-full justify-center border-warning-500/30 bg-warning-400/10 font-sans text-[10px] text-warning-300">
              {DEMO_LABEL}
            </Badge>
          ) : null}
        </div>
      </aside>

      {mobileOpen ? (
        <button className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />
      ) : null}

      {/* ── Konten ──────────────────────────────────────────────────────── */}
      <div className={cn("relative min-h-screen transition-[padding] duration-drawer", sidebarCollapsed ? "lg:pl-20" : "lg:pl-[17rem]")}>
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" className="tooltip-trigger lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu" data-tooltip="Buka menu">
                <Menu />
              </Button>
              <Image
                src="/fonts/logosmall.png"
                alt=""
                width={48}
                height={48}
                className="hidden h-8 w-8 object-contain sm:block"
              />
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-semibold leading-tight text-ink-950">{title}</h1>
                <p className="hidden truncate text-[13px] text-ink-600 sm:block">{description}</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              {providerMode ? (
                <Badge
                  tone={providerMode.mode === "jev" ? "brand" : "neutral"}
                  className="hidden sm:inline-flex"
                  title={providerMode.reason}
                >
                  {providerMode.mode_label}
                </Badge>
              ) : null}
              {pathname !== "/asisten" ? (
                <Button onClick={() => setAssistantOpen(true)} aria-label="Buka analisis pesan cepat">
                  <MessageCircle />
                  <span className="hidden md:inline">Analisis pesan</span>
                </Button>
              ) : null}
              <Button variant="outline" onClick={logout} aria-label="Keluar dari akun">
                <LogOut />
                <span className="hidden sm:inline">Keluar</span>
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
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Analisis pesan cepat">
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
                    <h2 className="font-display text-base font-semibold text-ink-950">Analisis pesan cepat</h2>
                    <p className="text-[13px] text-ink-600">Draf bersumber dari katalog, FAQ, dan aturan toko.</p>
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
