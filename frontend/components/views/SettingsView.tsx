"use client"

import React, { useEffect, useState } from "react"
import { ClassBadge, JevPanel, type ChatResult } from "./cs-shared"
import {
  Settings,
  Shield,
  Clock,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Sliders,
  DollarSign,
  Tag,
  Calendar,
  User,
  Eye,
  Check,
  X,
  Search,
  UserRoundCog,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatIDR } from "@/lib/utils"

export function SettingsView({ onResetDemo, isResetting }: { onResetDemo?: () => void; isResetting?: boolean }) {
  const [activeTab, setActiveTab] = useState<"fee_rules" | "audit_logs" | "demo" | "accounts">("fee_rules")
  const [feeRules, setFeeRules] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLog, setSearchLog] = useState("")
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null)
  const [currentRole, setCurrentRole] = useState("")
  const [accountRequests, setAccountRequests] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // New Fee Rule Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newRule, setNewRule] = useState({
    marketplace: "shopee",
    category: "ALL",
    version: "v2026.1",
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
    commission_pct: "6.5",
    fixed_fee: "1000",
    admin_pct: "0.0",
    notes: "Penyesuaian komisi kuartal baru",
  })
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const [feeRes, auditRes] = await Promise.all([
        api.get("/api/settings/fee-rules"),
        api.get("/api/settings/audit-logs?limit=50"),
      ])
      setFeeRules(feeRes.fee_rules || [])
      setAuditLogs(auditRes.logs || [])
      const me = await api.get<{ role: string }>("/api/auth/me")
      setCurrentRole(me.role)
      if (me.role === "owner") {
        const [requestRes, userRes] = await Promise.all([api.get("/api/auth/account-requests"), api.get("/api/auth/users")])
        setAccountRequests(requestRes.requests || [])
        setUsers(userRes.users || [])
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan:", err)
    } finally {
      setLoading(false)
    }

  }

  async function decideRequest(id: number, action: "approve" | "reject", role?: string) {
    try {
      await api.post(`/api/auth/account-requests/${id}/decision`, { action, role })
      await loadSettings()
      setAlertMsg({ type: "success", text: `Pengajuan berhasil ${action === "approve" ? "disetujui" : "ditolak"}.` })
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message || "Pengajuan gagal diproses." })
    }
  }

  async function changeRole(id: number, role: string) {
    try {
      await api.patch(`/api/auth/users/${id}/role`, { role })
      await loadSettings()
      setAlertMsg({ type: "success", text: "Role pengguna berhasil diperbarui." })
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message || "Role pengguna gagal diperbarui." })
    }
  }

  async function handleCreateFeeRule(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setAlertMsg(null)
    try {
      await api.post("/api/settings/fee-rules", {
        marketplace: newRule.marketplace,
        category: newRule.category,
        version: newRule.version,
        effective_from: newRule.effective_from,
        effective_to: newRule.effective_to ? newRule.effective_to : null,
        commission_pct: parseFloat(newRule.commission_pct) || 0,
        fixed_fee: parseFloat(newRule.fixed_fee) || 0,
        admin_pct: parseFloat(newRule.admin_pct) || 0,
        notes: newRule.notes,
      })
      setAlertMsg({ type: "success", text: "Aturan biaya marketplace berhasil disimpan ke database!" })
      setShowAddModal(false)
      loadSettings()
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message || "Gagal menyimpan aturan biaya." })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchLog.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchLog.toLowerCase()) ||
      l.entity.toLowerCase().includes(searchLog.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-kompas-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-mid/10 text-teal-mid">
              <Settings className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-mid">
              Admin & Governance
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-deep-teal">
            Pengaturan & Jejak Audit
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Kelola matriks komisi marketplace, pantau jejak audit perubahan data, dan kendalikan status demo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-kompas-border bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
          {currentRole === "owner" ? (
            <button
              onClick={() => setActiveTab("accounts")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "accounts" ? "bg-deep-teal text-white shadow-sm" : "bg-white text-gray-600 border border-kompas-border hover:bg-gray-50"
              }`}
            >
              <UserRoundCog className="h-3.5 w-3.5" />
              <span>Akun & Pengajuan ({accountRequests.filter((item) => item.status === "PENDING").length})</span>
            </button>
          ) : null}
        </div>

        {activeTab === "accounts" && currentRole === "owner" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-kompas-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-deep-teal">Pengajuan akses akun</h2>
              <p className="mt-1 text-xs text-gray-500">Owner menyetujui akses sebelum akun dapat digunakan.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-kompas-border text-gray-500"><th className="px-3 py-2">Pemohon</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role diminta</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {accountRequests.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 font-semibold">{item.display_name}</td><td className="px-3 py-3">{item.email}</td><td className="px-3 py-3">{item.requested_role}</td><td className="px-3 py-3">{item.status}</td>
                        <td className="px-3 py-3">
                          {item.status === "PENDING" ? <div className="flex gap-2"><button onClick={() => void decideRequest(item.id, "approve", "cs")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 font-semibold text-white">Setujui</button><button onClick={() => void decideRequest(item.id, "reject")} className="rounded-lg border border-red-200 px-2.5 py-1.5 font-semibold text-red-700">Tolak</button></div> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-2xl border border-kompas-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-deep-teal">Kelola role pengguna</h2>
              <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-kompas-border text-gray-500"><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Username</th><th className="px-3 py-2">Role</th></tr></thead><tbody className="divide-y divide-gray-100">{users.map((user) => <tr key={user.id}><td className="px-3 py-3 font-semibold">{user.display_name}</td><td className="px-3 py-3">{user.username}</td><td className="px-3 py-3"><select value={user.role} onChange={(event) => void changeRole(user.id, event.target.value)} className="rounded-lg border border-kompas-border px-2 py-1"><option value="owner">Owner</option><option value="manager">Manager</option><option value="cs">CS</option><option value="packing">Packing</option><option value="judge">Judge</option></select></td></tr>)}</tbody></table></div>
            </section>
          </div>
        ) : null}
      </div>

      <JevStatusCard />

      {alertMsg && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl p-3 text-xs font-medium border ${
            alertMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-kompas-border pb-3">
        <button
          onClick={() => setActiveTab("fee_rules")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "fee_rules"
              ? "bg-deep-teal text-white shadow-sm"
              : "bg-white text-gray-600 border border-kompas-border hover:bg-gray-50"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Aturan Biaya Marketplace ({feeRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit_logs")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "audit_logs"
              ? "bg-deep-teal text-white shadow-sm"
              : "bg-white text-gray-600 border border-kompas-border hover:bg-gray-50"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Jejak Audit ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("demo")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "demo"
              ? "bg-deep-teal text-white shadow-sm"
              : "bg-white text-gray-600 border border-kompas-border hover:bg-gray-50"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Manajemen Basis Data Demo</span>
        </button>
      </div>

      {/* Tab 1: Fee Rules */}
      {activeTab === "fee_rules" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-deep-teal">Tabel Aturan Potongan & Komisi Marketplace</h2>
              <p className="text-xs text-gray-500">
                Aturan potongan ini dipakai untuk menghitung Laba Kontribusi tiap transaksi.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-mid px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-mid/90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Aturan Baru</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-kompas-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-kompas-border bg-gray-50/70 font-semibold text-gray-600">
                    <th className="px-4 py-3">Marketplace</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Versi</th>
                    <th className="px-4 py-3">Masa Berlaku</th>
                    <th className="px-4 py-3 text-right">Komisi (%)</th>
                    <th className="px-4 py-3 text-right">Biaya Tetap</th>
                    <th className="px-4 py-3 text-right">Biaya Admin (%)</th>
                    <th className="px-4 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feeRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Belum ada aturan biaya terdaftar.
                      </td>
                    </tr>
                  ) : (
                    feeRules.map((rule) => {
                      const mpColors: Record<string, string> = {
                        shopee: "bg-orange-50 text-orange-700 border-orange-200",
                        tiktok: "bg-zinc-100 text-zinc-800 border-zinc-200",
                        lazada: "bg-blue-50 text-blue-700 border-blue-200",
                      }
                      return (
                        <tr key={rule.id} className="transition-colors hover:bg-teal-mid/[0.02]">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                mpColors[rule.marketplace.toLowerCase()] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {rule.marketplace}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">{rule.category}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                              {rule.version}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {rule.effective_from} {rule.effective_to ? `s/d ${rule.effective_to}` : "(Aktif)"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-deep-teal">
                            {Number(rule.commission_pct).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {formatIDR(Number(rule.fixed_fee))}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {Number(rule.admin_pct).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-gray-500 italic max-w-xs truncate">
                            {rule.notes || "—"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === "audit_logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-deep-teal">Jejak Audit Aktivitas & Perubahan Status</h2>
              <p className="text-xs text-gray-500">
                Pencatatan immutable untuk setiap aksi pengguna, eskalasi keluhan, dan impor data demi kepatuhan SOP.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari aksi, aktor, entitas..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full rounded-xl border border-kompas-border bg-white pl-9 pr-3 py-1.5 text-xs focus:border-teal-mid focus:outline-none focus:ring-1 focus:ring-teal-mid"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-kompas-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-kompas-border bg-gray-50/70 font-semibold text-gray-600">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aktor</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Entitas</th>
                    <th className="px-4 py-3">ID Entitas</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Tidak ada log audit ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-teal-mid/[0.02]">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800 border border-teal-200">
                            <User className="h-3 w-3" />
                            {log.actor}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-deep-teal">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{log.entity}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                          {log.entity_id || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedDetail(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-kompas-border px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Lihat</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Demo Management */}
      {activeTab === "demo" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl border border-kompas-border bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-deep-teal flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-mid" />
                <span>Status Data Demo Toko Husin Dummy</span>
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Sistem KOMPAS saat ini bekerja dalam lingkungan mandiri berbasis SQLite dengan set data lengkap siap uji:
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">Katalog Produk</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">30 SKU</div>
                  <div className="text-[10px] text-gray-400">Kurma, Parfum, Herbal</div>
                </div>

                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">Transaksi Dummy</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">156 Order</div>
                  <div className="text-[10px] text-gray-400">Shopee, TikTok, Lazada</div>
                </div>

                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">Aturan SOP Toko</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">32 Dokumen</div>
                  <div className="text-[10px] text-gray-400">Pengiriman & Operasional</div>
                </div>

                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">FAQ Basis Pengetahuan</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">30 Pasang</div>
                  <div className="text-[10px] text-gray-400">Verified Answer Source</div>
                </div>

                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">Golden Chat Benchmark</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">27 Skenario</div>
                  <div className="text-[10px] text-gray-400">GC-01 s/d GC-27</div>
                </div>

                <div className="rounded-xl border border-kompas-border bg-[#FBFDFB] p-3">
                  <div className="text-[11px] font-medium text-gray-500">Golden Profit Benchmark</div>
                  <div className="mt-1 text-lg font-bold text-deep-teal">18 Kasus</div>
                  <div className="text-[10px] text-gray-400">PFT-001 s/d PFT-018</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <div className="font-bold">Reset Basis Data ke Kondisi Awal</div>
                    <p className="mt-1 text-amber-800">
                      Tindakan ini akan mengembalikan seluruh transaksi, keluhan, log audit, dan stok produk ke kondisi
                      benchmark awal. Sangat dianjurkan dijalankan sebelum demonstrasi juri agar seluruh skenario pengujian
                      dapat direproduksi secara akurat.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={onResetDemo}
                        disabled={isResetting}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
                        <span>{isResetting ? "Mereset Database..." : "Reset Data Demo Sekarang"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-kompas-border bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-mid">Kepatuhan Arsitektur</h3>
              <ul className="mt-3 space-y-2.5 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Matematika Finansial Deterministik (Decimal exact)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Null is never Zero (Deteksi ongkir/retur tertunda)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Policy Gate: Anti Prompt Injection & Klaim Medis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Penyedia jawaban dengan cadangan otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Role-Based Access Control (5 Persona Toko)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Fee Rule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl border border-kompas-border">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-deep-teal">Tambah Aturan Komisi Marketplace Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeeRule} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Marketplace</label>
                  <select
                    value={newRule.marketplace}
                    onChange={(e) => setNewRule({ ...newRule, marketplace: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                  >
                    <option value="shopee">Shopee</option>
                    <option value="tiktok">TikTok Shop</option>
                    <option value="lazada">Lazada</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Kategori</label>
                  <input
                    type="text"
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                    placeholder="Contoh: ALL atau MAKANAN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Versi Aturan</label>
                  <input
                    type="text"
                    value={newRule.version}
                    onChange={(e) => setNewRule({ ...newRule, version: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Mulai Berlaku (Tanggal)</label>
                  <input
                    type="date"
                    value={newRule.effective_from}
                    onChange={(e) => setNewRule({ ...newRule, effective_from: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Komisi (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRule.commission_pct}
                    onChange={(e) => setNewRule({ ...newRule, commission_pct: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Biaya Tetap (Rp)</label>
                  <input
                    type="number"
                    step="1"
                    value={newRule.fixed_fee}
                    onChange={(e) => setNewRule({ ...newRule, fixed_fee: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Admin Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRule.admin_pct}
                    onChange={(e) => setNewRule({ ...newRule, admin_pct: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Catatan Perubahan</label>
                <textarea
                  rows={2}
                  value={newRule.notes}
                  onChange={(e) => setNewRule({ ...newRule, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-kompas-border p-2 focus:border-teal-mid focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-kompas-border px-4 py-2 font-medium text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-mid px-5 py-2 font-semibold text-white shadow-sm hover:bg-teal-mid/90 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Aturan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Audit Detail */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl border border-kompas-border">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-deep-teal">Detail Jejak Audit #{selectedDetail.id}</h3>
              <button onClick={() => setSelectedDetail(null)} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Waktu:</span>
                  <div className="font-semibold text-gray-800">
                    {new Date(selectedDetail.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Aktor:</span>
                  <div className="font-semibold text-deep-teal">{selectedDetail.actor}</div>
                </div>
              </div>

              <div>
                <span className="text-gray-500">Aksi:</span>
                <div className="font-mono font-medium text-deep-teal">{selectedDetail.action}</div>
              </div>

              <div>
                <span className="text-gray-500">Entitas:</span>
                <div className="text-gray-800">
                  {selectedDetail.entity} (ID: {selectedDetail.entity_id || "—"})
                </div>
              </div>

              <div>
                <span className="text-gray-500">Detail JSON:</span>
                <pre className="mt-1 max-h-60 overflow-y-auto rounded-xl bg-gray-50 p-3 font-mono text-[11px] text-gray-700 border border-gray-200">
                  {JSON.stringify(selectedDetail.detail, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="rounded-xl bg-deep-teal px-4 py-2 text-xs font-semibold text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function JevStatusCard() {
  const [info, setInfo] = React.useState<Record<string, any> | null>(null)
  const [text, setText] = React.useState("")
  const [probing, setProbing] = React.useState(false)
  const [probe, setProbe] = React.useState<ChatResult | null>(null)
  const [probeError, setProbeError] = React.useState("")

  const loadInfo = React.useCallback(() => {
    api.get("/api/chat/provider").then(setInfo).catch(() => setInfo(null))
  }, [])
  React.useEffect(() => {
    loadInfo()
  }, [loadInfo])

  async function runProbe() {
    if (!text.trim()) return
    setProbing(true)
    setProbeError("")
    try {
      // persist:false -> nothing is stored and no complaint ticket is created.
      const res = await api.post<ChatResult>("/api/chat/analyze", {
        message: text.trim(),
        persist: false,
        create_complaint: false,
        prefer_provider: "auto",
      })
      setProbe(res)
      loadInfo()
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : "Uji Jev gagal.")
    } finally {
      setProbing(false)
    }
  }

  if (!info) return null
  const active = info.mode === "jev"
  const stats = info.stats ?? {}
  return (
    <section className="card card-pad space-y-3" aria-labelledby="jev-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="jev-title" className="font-display text-base font-semibold text-ink-950">AI opsional: Jev (TypeSafe) via OpenRouter</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${active ? "border-brand-200 bg-brand-50 text-brand-800" : "border-border bg-ink-50 text-ink-700"}`}>
          {info.mode_label}
        </span>
      </div>
      <p className="text-[13px] text-ink-600">{info.reason}</p>
      <dl className="grid gap-x-6 gap-y-1 text-[12.5px] text-ink-700 sm:grid-cols-2">
        <div><dt className="inline text-ink-500">Model: </dt><dd className="inline font-mono">{info.model}</dd></div>
        <div><dt className="inline text-ink-500">Kunci API: </dt><dd className="inline">{info.key_present ? "terpasang" : "belum diisi"}</dd></div>
        <div><dt className="inline text-ink-500">Batas waktu: </dt><dd className="inline">{info.timeout_ms} ms + {info.retries}× ulang</dd></div>
        <div><dt className="inline text-ink-500">Gagal beruntun: </dt><dd className="inline">{info.consecutive_failures} (jeda 10 menit setelah 3)</dd></div>
        <div><dt className="inline text-ink-500">Ambang menaikkan: </dt><dd className="inline">{Math.round((info.raise_threshold ?? 0.8) * 100)}%</dd></div>
        <div><dt className="inline text-ink-500">Batas panggilan: </dt><dd className="inline">{info.max_calls_per_minute}/menit</dd></div>
      </dl>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Pemakaian sejak backend menyala">
        {[
          ["Panggilan", stats.calls ?? 0],
          ["Berhasil", stats.ok ?? 0],
          ["Dari cache", stats.cache_hits ?? 0],
          ["Latensi rata-rata", stats.avg_latency_ms != null ? `${stats.avg_latency_ms} ms` : "—"],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-md border border-border p-2.5">
            <dt className="text-[11.5px] text-ink-500">{k}</dt>
            <dd className="tnum text-base font-semibold text-ink-950">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[12.5px] text-ink-600">
        Biaya sejak backend menyala: <strong className="tnum">${(stats.cost_usd ?? 0).toFixed(6)}</strong> (≈Rp{((stats.cost_usd ?? 0) * 16500).toFixed(2)}).
        {stats.failed ? <> Gagal: {stats.failed}.</> : null}
        {stats.rate_limited ? <> Ditolak batas: {stats.rate_limited}.</> : null}
      </p>

      <div className="border-t border-border pt-3">
        <label className="field-label" htmlFor="jev-probe">Uji Jev: lempar satu pesan pembeli</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="jev-probe"
            className="field-control"
            maxLength={2000}
            value={text}
            placeholder="mis. Barangnya lecet semua pas dibuka, mau dikembaliin"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runProbe()}
          />
          <button
            type="button"
            onClick={() => void runProbe()}
            disabled={probing || !text.trim()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-brand-800 bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-brand-800 disabled:opacity-50"
          >
            {probing ? "Memproses…" : "Kirim ke Jev"}
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-500">Tidak disimpan dan tidak membuat tiket keluhan.</p>
        {probeError ? <p role="alert" className="mt-2 text-[13px] text-danger-700">{probeError}</p> : null}
        {probe ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-ink-500">Keputusan akhir KOMPAS:</span>
              <ClassBadge value={probe.message_class} />
              <span className="font-mono text-[12px] text-ink-700">{probe.decision}</span>
            </div>
            <JevPanel jev={probe.jev} />
            <p className="rounded-md bg-ink-50 p-2.5 text-[12.5px] text-ink-700"><strong>Draf dari mesin aturan:</strong> {probe.draft}</p>
          </div>
        ) : null}
      </div>

      <p className="text-[12px] text-ink-500">
        Jev hanya boleh menaikkan kewaspadaan (umum → belum pasti/keluhan), tidak pernah menulis jawaban atau menghitung uang.
        Aktifkan dengan <code className="font-mono">JEV_ENABLED=true</code> dan <code className="font-mono">OPENROUTER_API_KEY</code> di <code className="font-mono">backend/.env</code>, lalu mulai ulang backend.
      </p>
    </section>
  )
}
