"use client"

import React, { useEffect, useState } from "react"
import {
  Upload,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  X,
  FileText,
  DollarSign,
  ArrowDownRight,
  TrendingDown,
  Info,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatIDR } from "@/lib/utils"

export function ProfitEngineView() {
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedTx, setSelectedTx] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [calcLoading, setCalcLoading] = useState(false)
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showImportModal, setShowImportModal] = useState(false)

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [marketplaceFilter, statusFilter])

  async function loadData() {
    setLoading(true)
    try {
      const [sumRes, txRes] = await Promise.all([
        api.get("/api/profit/summary"),
        api.get(
          `/api/profit/transactions?marketplace=${marketplaceFilter}&calc_status=${statusFilter}&search=${searchQuery}&limit=50`
        ),
      ])
      setSummary(sumRes)
      setTransactions(txRes.items || [])
    } catch (err) {
      console.error("Gagal memuat profit engine:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecalculate() {
    setCalcLoading(true)
    try {
      await api.post("/api/profit/calculate", { scope: "all" })
      await loadData()
      alert("Kalkulasi profit deterministik berhasil dijalankan ulang!")
    } catch (err: any) {
      alert(`Gagal menghitung profit: ${err.message}`)
    } finally {
      setCalcLoading(false)
    }
  }

  async function handleUploadPreview(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportLoading(true)
    setImportSuccess(null)
    setImportPreview(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const data = await api.upload("/api/imports/preview", formData)
      setImportPreview(data)
    } catch (err: any) {
      alert(`Error preview CSV: ${err.message}`)
    } finally {
      setImportLoading(false)
    }
  }

  async function handleConfirmImport() {
    if (!importPreview?.batch_id) return
    setImportLoading(true)
    try {
      const res = await api.post(`/api/imports/${importPreview.batch_id}/confirm`, {
        mapping: importPreview.suggested_mapping,
      })
      setImportSuccess(`Berhasil mengimpor ${res.valid_rows} transaksi baru!`)
      setImportPreview(null)
      setImportFile(null)
      await loadData()
    } catch (err: any) {
      alert(`Gagal konfirmasi impor: ${err.message}`)
    } finally {
      setImportLoading(false)
    }
  }

  async function handleOpenDetail(id: number) {
    try {
      const res = await api.get(`/api/profit/transactions/${id}`)
      setSelectedTx(res)
    } catch (err: any) {
      alert(`Gagal membuka detail transaksi: ${err.message}`)
    }
  }

  const kpi = summary?.kpi || {}

  return (
    <div className="space-y-6 pb-16">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-mid uppercase tracking-wider">
            <DollarSign className="h-4 w-4" />
            <span>Ringkasan laba & rekonsiliasi</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-deep-teal">
            Kalkulator Laba Bersih Deterministik
          </h2>
          <p className="text-sm text-gray-600">
            Perhitungan finansial berbasis matematika presisi (Decimal exact math, null is never zero), audit komisi marketplace, dan proteksi margin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span>Impor Laporan Marketplace</span>
          </button>

          <button
            onClick={handleRecalculate}
            disabled={calcLoading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${calcLoading ? "animate-spin" : ""}`} />
            <span>Hitung Ulang Semua (156 tx)</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Required Warning Banner if needed */}
      {kpi.reconciliation_count > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">
                Peringatan: {kpi.reconciliation_count} Transaksi Membutuhkan Rekonsiliasi Aturan Fee!
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Nilai komisi pada laporan marketplace berbeda dengan parameter acuan tabel fee rules. Sesuai prinsip KOMPAS, status ditandai RECONCILIATION_REQUIRED dan tidak diklaim sebagai profit final.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("RECONCILIATION_REQUIRED")}
            className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Filter Transaksi Perlu Rekonsiliasi
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Gross Sales Terdata</div>
          <div className="mt-1 text-2xl font-bold text-deep-teal tabular-nums">
            {formatIDR(kpi.gross_sales)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Total {kpi.transaction_count} transaksi</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Pendapatan Bersih (Net)</div>
          <div className="mt-1 text-2xl font-bold text-teal-mid tabular-nums">
            {formatIDR(kpi.net_revenue_complete)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Gross - Diskon - Retur</div>
        </div>

        <div className="glass-card p-5 bg-emerald-50/30 border-emerald-200">
          <div className="text-xs font-medium text-emerald-800 flex items-center justify-between">
            <span>Laba Bersih Lengkap</span>
            <span className="font-bold text-xs">{kpi.margin_complete_pct || "0"}%</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-kompas-green tabular-nums">
            {formatIDR(kpi.profit_complete)}
          </div>
          <div className="mt-1 text-xs text-emerald-700/80">
            {kpi.complete_count || 0} transaksi lengkap
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-medium text-gray-500">Estimasi Parsial & Rekonsiliasi</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            {formatIDR(kpi.profit_reconciliation || kpi.profit_partial_estimate)}
          </div>
          <div className="mt-1 text-xs text-amber-600">
            {kpi.reconciliation_count || 0} rekonsiliasi, {kpi.partial_count || 0} parsial
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari ID transaksi, order, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="w-full rounded-xl border border-kompas-border bg-white pl-9 pr-3 py-1.5 text-xs text-deep-teal focus:border-teal-mid focus:outline-none"
            />
          </div>

          <select
            value={marketplaceFilter}
            onChange={(e) => setMarketplaceFilter(e.target.value)}
            className="rounded-xl border border-kompas-border bg-white px-3 py-1.5 text-xs font-medium text-deep-teal"
          >
            <option value="">Semua Marketplace</option>
            <option value="Shopee">Shopee</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Lazada">Lazada</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-kompas-border bg-white px-3 py-1.5 text-xs font-medium text-deep-teal"
          >
            <option value="">Semua Status Kalkulasi</option>
            <option value="COMPLETE">Lengkap (COMPLETE)</option>
            <option value="PARTIAL">Parsial (PARTIAL)</option>
            <option value="RECONCILIATION_REQUIRED">Perlu Rekonsiliasi</option>
            <option value="NOT_CALCULABLE">Tidak Dapat Dihitung</option>
          </select>

          {(marketplaceFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setMarketplaceFilter("")
                setStatusFilter("")
                setSearchQuery("")
              }}
              className="text-xs text-red-600 hover:underline px-2 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Menampilkan {transactions.length} dari {kpi.transaction_count || 156} transaksi
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-kompas-border bg-canvas/60 text-gray-600">
                <th className="py-3 px-4 font-semibold">Transaksi ID</th>
                <th className="py-3 px-3 font-semibold">Marketplace</th>
                <th className="py-3 px-3 font-semibold">Tanggal</th>
                <th className="py-3 px-3 font-semibold">SKU Produk</th>
                <th className="py-3 px-3 font-semibold text-right">Qty</th>
                <th className="py-3 px-3 font-semibold text-right">Penjualan Kotor</th>
                <th className="py-3 px-3 font-semibold text-right">Laba Bersih</th>
                <th className="py-3 px-3 font-semibold text-right">Margin %</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kompas-border/60">
              {transactions.map((tx) => {
                const isComplete = tx.calc_status === "COMPLETE"
                const isRecon = tx.calc_status === "RECONCILIATION_REQUIRED"
                const isPartial = tx.calc_status === "PARTIAL"
                const isNegative = tx.profit && parseFloat(tx.profit) < 0

                return (
                  <tr
                    key={tx.id}
                    onClick={() => handleOpenDetail(tx.id)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {tx.transaction_id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {tx.marketplace}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{tx.transaction_date}</td>
                    <td className="py-3 px-3 font-mono text-deep-teal">{tx.sku}</td>
                    <td className="py-3 px-3 text-right font-medium">{tx.qty}</td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums">
                      {formatIDR(tx.gross_sales)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold tabular-nums ${
                        isNegative
                          ? "text-red-600"
                          : isComplete
                          ? "text-kompas-green"
                          : "text-amber-600"
                      }`}
                    >
                      {formatIDR(tx.profit)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {tx.margin_pct ? `${tx.margin_pct}%` : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isComplete
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isRecon
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : isPartial
                            ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {isComplete
                          ? "LENGKAP"
                          : isRecon
                          ? "REKONSILIASI"
                          : isPartial
                          ? "PARSIAL"
                          : "TIDAK VALID"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(tx.id)
                        }}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-deep-teal"
                        title="Lihat Waterfall Biaya"
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

      {/* Transaction Waterfall Detail Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-4">
              <div className="text-xs font-semibold text-teal-mid uppercase tracking-wider">
                Rincian Waterfall Biaya Transaksi
              </div>
              <h3 className="text-xl font-bold text-deep-teal flex items-center gap-2 mt-0.5">
                <span>{selectedTx.transaction?.transaction_id}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {selectedTx.transaction?.marketplace}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Order ID: {selectedTx.transaction?.order_id || "-"} | Produk: {selectedTx.transaction?.product_name || selectedTx.transaction?.sku}
              </p>
            </div>

            {/* Waterfall Breakdown list */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 px-3 rounded-lg bg-gray-50 font-semibold text-deep-teal">
                <span>Penjualan Kotor (Gross Sales)</span>
                <span className="tabular-nums font-bold">{formatIDR(selectedTx.transaction?.gross_sales)}</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-red-600">
                <span>- Diskon Penjual</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.seller_discount || "0")})</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-red-600">
                <span>- Pengembalian Dana (Refund)</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.refund_amount || "0")})</span>
              </div>

              <div className="flex justify-between py-2 px-3 rounded-lg bg-teal-50 font-bold text-teal-900 border border-teal-200">
                <span>= Pendapatan Bersih (Net Revenue)</span>
                <span className="tabular-nums">{formatIDR(selectedTx.calculation?.net_revenue)}</span>
              </div>

              <div className="pt-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">
                Biaya & Beban Operasional:
              </div>

              <div className="flex justify-between py-1 px-3 text-gray-700">
                <span>- Modal Barang (COGS)</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.cogs)})</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-gray-700">
                <span>- Komisi Marketplace</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.marketplace_commission)})</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-gray-700">
                <span>- Biaya Tetap / Administrasi</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.fixed_fee)})</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-gray-700">
                <span>- Ongkir Ditanggung Penjual</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.seller_shipping_cost || "0")})</span>
              </div>

              <div className="flex justify-between py-1 px-3 text-gray-700">
                <span>- Biaya Packing & Bubble Wrap</span>
                <span className="tabular-nums font-medium">({formatIDR(selectedTx.transaction?.packing_cost)})</span>
              </div>

              {selectedTx.transaction?.return_logistics_cost && (
                <div className="flex justify-between py-1 px-3 text-red-600 font-medium">
                  <span>- Biaya Logistik Retur</span>
                  <span className="tabular-nums">({formatIDR(selectedTx.transaction?.return_logistics_cost)})</span>
                </div>
              )}

              <div className="flex justify-between py-3 px-3 rounded-xl bg-emerald-50 font-bold text-base text-kompas-green border border-emerald-300">
                <span>= Laba Bersih (Net Profit)</span>
                <div className="text-right">
                  <span className="tabular-nums">{formatIDR(selectedTx.calculation?.profit)}</span>
                  <div className="text-xs font-semibold text-emerald-800">
                    Margin: {selectedTx.calculation?.margin_pct || "0"}%
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings list if any */}
            {selectedTx.calculation?.warnings && selectedTx.calculation.warnings.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Catatan Rekonsiliasi & Audit:</span>
                </div>
                {selectedTx.calculation.warnings.map((w: string, idx: number) => (
                  <div key={idx} className="pl-5">• {w}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => {
                setShowImportModal(false)
                setImportPreview(null)
                setImportSuccess(null)
              }}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="text-xs font-semibold text-teal-mid uppercase tracking-wider">
                Import Wizard
              </div>
              <h3 className="text-xl font-bold text-deep-teal">
                Impor Laporan Penjualan CSV
              </h3>
              <p className="text-xs text-gray-500">
                Unggah file laporan ekspor transaksi Shopee, TikTok Shop, atau Lazada.
              </p>
            </div>

            {importSuccess ? (
              <div className="rounded-2xl bg-emerald-50 p-6 text-center border border-emerald-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-emerald-900">{importSuccess}</div>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportSuccess(null)
                  }}
                  className="mt-4 rounded-xl bg-teal-mid px-4 py-2 text-xs font-bold text-white"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border-2 border-dashed border-kompas-border p-6 text-center hover:border-teal-mid transition-colors bg-canvas/30">
                  <FileSpreadsheet className="h-10 w-10 text-teal-mid mx-auto mb-2 opacity-80" />
                  <div className="text-xs font-medium text-gray-700">
                    Pilih file CSV laporan transaksi (.csv)
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleUploadPreview}
                    className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-mid hover:file:bg-teal-100"
                  />
                </div>

                {importLoading && (
                  <div className="text-center py-4 text-xs font-medium text-teal-mid animate-pulse">
                    Memproses file & memetakan kolom...
                  </div>
                )}

                {importPreview && (
                  <div className="rounded-2xl bg-gray-50 p-4 border border-kompas-border text-xs space-y-2">
                    <div className="flex justify-between font-bold text-deep-teal">
                      <span>Total Baris Terdeteksi:</span>
                      <span>{importPreview.total_rows} baris</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Kolom berhasil dipetakan: {Object.keys(importPreview.suggested_mapping || {}).length} field
                    </div>
                    {importPreview.issues?.length > 0 && (
                      <div className="text-amber-700 text-[11px] font-medium">
                        ⚠️ Ditemukan {importPreview.issues.length} peringatan format pada pratinjau.
                      </div>
                    )}
                    <button
                      onClick={handleConfirmImport}
                      disabled={importLoading}
                      className="mt-3 w-full rounded-xl bg-teal-mid py-2.5 text-xs font-bold text-white hover:bg-teal-mid/90 shadow-sm"
                    >
                      Konfirmasi & Eksekusi Kalkulasi
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
