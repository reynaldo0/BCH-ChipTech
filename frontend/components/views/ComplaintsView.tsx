"use client"

import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  X,
  FileText,
  DollarSign,
  ChevronRight,
  Filter,
  ShieldAlert,
  User,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatIDR } from "@/lib/utils"

export function ComplaintsView() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [severityFilter, setSeverityFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Edit ticket state
  const [editStatus, setEditStatus] = useState("")
  const [editSeverity, setEditSeverity] = useState("")
  const [editConfirmedCost, setEditConfirmedCost] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // New ticket state
  const [newSummary, setNewSummary] = useState("")
  const [newCategory, setNewCategory] = useState("Kerusakan Barang")
  const [newSeverity, setNewSeverity] = useState("sedang")
  const [newPlatform, setNewPlatform] = useState("Shopee")
  const [newSku, setNewSku] = useState("")
  const [newEstimatedCost, setNewEstimatedCost] = useState("")
  const [newNotes, setNewNotes] = useState("")

  useEffect(() => {
    loadComplaints()
  }, [statusFilter, severityFilter])

  async function loadComplaints() {
    setLoading(true)
    try {
      const res = await api.get(
        `/api/complaints?status=${statusFilter}&severity=${severityFilter}`
      )
      setComplaints(res.complaints || [])
      setStats(res.stats || {})
    } catch (err) {
      console.error("Gagal memuat keluhan:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenTicket(id: number) {
    try {
      const res = await api.get(`/api/complaints/${id}`)
      setSelectedTicket(res)
      setEditStatus(res.complaint.status)
      setEditSeverity(res.complaint.severity)
      setEditConfirmedCost(res.complaint.confirmed_cost || "")
      setEditNotes(res.complaint.notes || "")
    } catch (err: any) {
      alert(`Gagal membuka tiket: ${err.message}`)
    }
  }

  async function handleUpdateTicket() {
    if (!selectedTicket?.complaint?.id) return
    setSaving(true)
    try {
      await api.patch(`/api/complaints/${selectedTicket.complaint.id}`, {
        status: editStatus,
        severity: editSeverity,
        confirmed_cost: editConfirmedCost ? parseFloat(editConfirmedCost) : null,
        notes: editNotes,
      })
      await handleOpenTicket(selectedTicket.complaint.id)
      await loadComplaints()
      alert("Tiket keluhan berhasil diperbarui!")
    } catch (err: any) {
      alert(`Gagal memperbarui tiket: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!newSummary.trim()) return
    try {
      await api.post("/api/complaints", {
        summary: newSummary.trim(),
        category: newCategory,
        severity: newSeverity,
        platform: newPlatform,
        sku: newSku.trim() || null,
        estimated_cost: newEstimatedCost ? parseFloat(newEstimatedCost) : null,
        notes: newNotes.trim() || null,
      })
      setShowCreateModal(false)
      setNewSummary("")
      setNewSku("")
      setNewEstimatedCost("")
      setNewNotes("")
      await loadComplaints()
      alert("Tiket keluhan baru berhasil dibuat!")
    } catch (err: any) {
      alert(`Gagal membuat tiket: ${err.message}`)
    }
  }

  const counts = stats?.counts || {}

  return (
    <div className="space-y-6 pb-16">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-mid uppercase tracking-wider">
            <AlertCircle className="h-4 w-4" />
            <span>Pusat Keluhan & Eskalasi (Loop: Keluhan → Margin & Penyesuaian)</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-deep-teal">
            Manajemen Tiket Keluhan & Klaim Biaya
          </h2>
          <p className="text-sm text-gray-600">
            Penelusuran masalah pengiriman, produk rusak/salah, pemisahan biaya kerugian terkonfirmasi vs estimasi, dan audit penanganan CS.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-mid px-4 py-2 text-xs font-semibold text-white hover:bg-teal-mid/90 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Buka Tiket Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Tiket Baru Masuk</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            {counts["BARU"] || 0}
          </div>
          <div className="mt-1 text-xs text-amber-600">Perlu peninjauan CS</div>
        </div>

        <div className="glass-card p-5 bg-red-50/30 border-red-200">
          <div className="text-xs font-medium text-red-800">Perlu Perhatian / Eskalasi</div>
          <div className="mt-1 text-2xl font-bold text-red-600 tabular-nums">
            {counts["PERLU_PERHATIAN"] || 0}
          </div>
          <div className="mt-1 text-xs text-red-500">Prioritas tinggi / klaim ganti rugi</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Total Biaya Terkonfirmasi</div>
          <div className="mt-1 text-2xl font-bold text-deep-teal tabular-nums">
            {formatIDR(stats?.confirmed_cost_total)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Beban nyata yang disetujui</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Estimasi Biaya Potensial</div>
          <div className="mt-1 text-2xl font-bold text-gray-600 tabular-nums">
            {formatIDR(stats?.estimated_cost_total)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Sebelum investigasi tuntas</div>
        </div>
      </div>

      {/* Filter and Tab Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "", label: "Semua Tiket" },
            { id: "BARU", label: "Baru" },
            { id: "PERLU_PERHATIAN", label: "Perlu Perhatian" },
            { id: "MENUNGGU", label: "Menunggu" },
            { id: "SELESAI", label: "Selesai" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-teal-mid text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-kompas-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-xl border border-kompas-border bg-white px-3 py-1.5 text-xs font-medium text-deep-teal"
        >
          <option value="">Semua Tingkat Urgensi</option>
          <option value="rendah">Rendah</option>
          <option value="sedang">Sedang</option>
          <option value="tinggi">Tinggi</option>
          <option value="kritis">Kritis</option>
        </select>
      </div>

      {/* Complaints Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-kompas-border bg-canvas/60 text-gray-600">
                <th className="py-3 px-4 font-semibold">Nomor Tiket</th>
                <th className="py-3 px-3 font-semibold">Kanal</th>
                <th className="py-3 px-3 font-semibold">Kategori</th>
                <th className="py-3 px-3 font-semibold">Ringkasan Keluhan</th>
                <th className="py-3 px-3 font-semibold text-center">Urgensi</th>
                <th className="py-3 px-3 font-semibold text-right">Biaya Riil</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kompas-border/60">
              {complaints.map((c) => {
                const isNew = c.status === "BARU"
                const isUrgent = c.status === "PERLU_PERHATIAN"
                const isDone = c.status === "SELESAI"

                return (
                  <tr
                    key={c.id}
                    onClick={() => handleOpenTicket(c.id)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-teal-mid">{c.ticket_no}</td>
                    <td className="py-3 px-3 font-medium text-gray-600">{c.platform || "-"}</td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-deep-teal max-w-xs truncate">
                      {c.summary}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.severity === "tinggi" || c.severity === "kritis"
                            ? "bg-red-100 text-red-800"
                            : c.severity === "sedang"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-red-600 tabular-nums">
                      {c.confirmed_cost ? formatIDR(c.confirmed_cost) : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isDone
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isUrgent
                            ? "bg-red-50 text-red-800 border-red-300"
                            : isNew
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTicket(c.id)
                        }}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-deep-teal"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail & Timeline Drawer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <div className="text-xs font-semibold text-teal-mid uppercase tracking-wider">
                Detail Tiket Keluhan
              </div>
              <h3 className="text-xl font-bold text-deep-teal flex items-center gap-2 mt-0.5">
                <span>{selectedTicket.complaint.ticket_no}</span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {selectedTicket.complaint.category}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Kanal: {selectedTicket.complaint.platform || "Shopee"} | Pelanggan: {selectedTicket.complaint.customer_id || "Anonim"} | Waktu: {selectedTicket.complaint.created_at}
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-canvas p-3 border border-kompas-border text-xs text-deep-teal leading-relaxed">
              <strong>Isi Keluhan:</strong> {selectedTicket.complaint.summary}
            </div>

            {/* Edit status & confirmed cost */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Status Penanganan</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-semibold"
                >
                  <option value="BARU">BARU</option>
                  <option value="PERLU_PERHATIAN">PERLU_PERHATIAN</option>
                  <option value="MENUNGGU">MENUNGGU</option>
                  <option value="SELESAI">SELESAI</option>
                  <option value="DITOLAK">DITOLAK</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-600 block mb-1">Tingkat Urgensi</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value)}
                  className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-semibold"
                >
                  <option value="rendah">Rendah</option>
                  <option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option>
                  <option value="kritis">Kritis</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-600 block mb-1">
                  Biaya Riil Terkonfirmasi (Rp)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 70000"
                  value={editConfirmedCost}
                  onChange={(e) => setEditConfirmedCost(e.target.value)}
                  className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-mono"
                />
                <span className="text-[10px] text-gray-400">
                  Estimasi awal: {formatIDR(selectedTicket.complaint.estimated_cost)}
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-600 block mb-1">Catatan Resolusi CS</label>
                <input
                  type="text"
                  placeholder="Solusi / tindak lanjut..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleUpdateTicket}
              disabled={saving}
              className="w-full rounded-xl bg-teal-mid py-2 text-xs font-bold text-white hover:bg-teal-mid/90 shadow-sm"
            >
              {saving ? "Menyimpan Perubahan..." : "Simpan & Rekonsiliasi Status"}
            </button>

            {/* Audit Timeline */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Jejak Audit & Histori Tindakan (Timeline):
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                {selectedTicket.timeline && selectedTicket.timeline.length > 0 ? (
                  selectedTicket.timeline.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-100 bg-gray-50/70 p-2 text-[11px]"
                    >
                      <div className="flex justify-between font-semibold text-deep-teal">
                        <span>Aksi: {item.action} oleh [{item.actor}]</span>
                        <span className="text-gray-400">{item.created_at}</span>
                      </div>
                      {item.detail && (
                        <div className="mt-1 text-gray-500 font-mono text-[10px]">
                          {JSON.stringify(item.detail)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs italic">Belum ada pembaruan log.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="text-xs font-semibold text-teal-mid uppercase tracking-wider">
                Tiket Baru
              </div>
              <h3 className="text-xl font-bold text-deep-teal">Buka Tiket Keluhan Manual</h3>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Ringkasan Masalah</label>
                <textarea
                  required
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Jelaskan kendala pesanan atau keluhan pembeli..."
                  className="w-full rounded-xl border border-kompas-border bg-white p-2.5 text-xs text-deep-teal focus:border-teal-mid focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Kategori</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs"
                  >
                    <option value="Kerusakan Barang">Kerusakan Barang</option>
                    <option value="Keterlambatan Pengiriman">Keterlambatan Pengiriman</option>
                    <option value="Salah Kirim">Salah Kirim</option>
                    <option value="Kemasan Rusak">Kemasan Rusak</option>
                    <option value="Pertanyaan Izin / Halal">Pertanyaan Izin / Halal</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Platform</label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-600 block mb-1">SKU Terkait</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-PRFM-001"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newEstimatedCost}
                    onChange={(e) => setNewEstimatedCost(e.target.value)}
                    className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-teal-mid py-2.5 text-xs font-bold text-white hover:bg-teal-mid/90 shadow-sm"
              >
                Buat Tiket Keluhan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
