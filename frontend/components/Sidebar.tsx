"use client"

import React, { useState } from "react"
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  BrainCircuit,
  Scale,
  Settings,
  ChevronDown,
  Zap,
  Sliders,
  Check,
  X,
} from "lucide-react"
import { Role } from "@/lib/api"
import { ROLE_LABELS, TabType } from "./Navbar"

interface SidebarProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
  currentRole: Role
  onRoleChange: (role: Role) => void
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const mainNav: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { id: "chat", label: "Chat Copilot", icon: MessageSquare, badge: "AI" },
    { id: "profit", label: "Profit Engine", icon: TrendingUp },
    { id: "complaints", label: "Pusat Keluhan", icon: AlertCircle },
    { id: "products", label: "Product Brain", icon: BrainCircuit },
    { id: "detective", label: "Detective & What-If", icon: Sliders },
  ]

  const auditNav: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: "evaluation", label: "Evaluasi Juri", icon: Scale, badge: "Golden Set" },
    { id: "settings", label: "Pengaturan & Audit", icon: Settings },
  ]

  const currentRoleInfo = ROLE_LABELS[currentRole] || ROLE_LABELS.owner

  function handleSelectTab(id: TabType) {
    onTabChange(id)
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between h-screen select-none shadow-xl lg:shadow-[2px_0_12px_rgba(15,23,42,0.03)] lg:static lg:w-64 lg:translate-x-0 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="h-5 w-5 fill-white/90" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-display">
                  KOMPAS
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                Toko Husin Dummy
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Operasional
            </div>
            <div className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon
                const active = currentTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Audit & Kepatuhan
            </div>
            <div className="space-y-1">
              {auditNav.map((item) => {
                const Icon = item.icon
                const active = currentTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-purple-50 text-purple-600 border border-purple-100"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* User / Persona Switcher Card */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                  {currentRole.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {currentRoleInfo.title}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium capitalize flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Role: {currentRoleInfo.badge}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            </button>

            {showRoleMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Ganti Persona Toko
                </div>
                {(["owner", "manager", "cs", "packing", "judge"] as Role[]).map((r) => {
                  const isSelected = r === currentRole
                  const info = ROLE_LABELS[r]
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        onRoleChange(r)
                        setShowRoleMenu(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{info.title}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
