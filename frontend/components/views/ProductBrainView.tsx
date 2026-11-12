"use client"

import React, { useEffect, useState } from "react"
import {
  Package,
  Clock,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  FileText,
  HelpCircle,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatIDR } from "@/lib/utils"

export function ProductBrainView() {
  const [tab, setTab] = useState<"products" | "operational" | "shipping" | "faqs">("products")
  const [products, setProducts] = useState<any[]>([])
  const [operationalRules, setOperationalRules] = useState<any[]>([])
  const [shippingInfo, setShippingInfo] = useState<any>(null)
  const [capacityDays, setCapacityDays] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Quick stock edit
  const [editStockModal, setEditStockModal] = useState<any | null>(null)
  const [newStockVal, setNewStockVal] = useState<number>(0)
  const [savingStock, setSavingStock] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [prodRes, rulesRes, shipRes, capRes, faqRes] = await Promise.all([
        api.get("/api/products"),
        api.get("/api/products/rules/operational"),
        api.get("/api/products/rules/shipping"),
        api.get("/api/products/rules/capacity?limit=14"),
        api.get("/api/products/rules/faqs"),
      ])
      setProducts(prodRes.products || [])
      setOperationalRules(rulesRes.rules || [])
      setShippingInfo(shipRes)
      setCapacityDays(capRes.capacity_days || [])
      setFaqs(faqRes.faqs || [])
    } catch (err) {
      console.error("Gagal memuat product brain:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenDetail(id: number) {
    try {
      const res = await api.get(`/api/products/${id}`)
      setSelectedProduct(res)
    } catch (err: any) {
      alert(`Gagal memuat detail produk: ${err.message}`)
    }
  }

  async function handleSaveStock() {
    if (!editStockModal) return
    setSavingStock(true)
    try {
      await api.post(`/api/products/${editStockModal.id}/stock`, {
        stock: newStockVal,
        source: "manual_ui",
      })
      setEditStockModal(null)
      await loadAll()
      alert("Snapshot stok fisik berhasil diperbarui.")
    } catch (err: any) {
      alert(`Gagal memperbarui stok: ${err.message}`)
    } finally {
      setSavingStock(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 pb-16">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-mid uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            <span>Data produk & stok</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-deep-teal">
            Katalog Produk, Dokumen Evidence, & SOP Toko
          </h2>
          <p className="text-sm text-gray-600">
            Pusat data terpadu untuk 30 produk Toko Husin, izin edar Halal/BPOM, stok fisik real-time, dan 32 SOP operasional resmi.
          </p>
        </div>

        {/* View mode tabs */}
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-white p-1 border border-kompas-border shadow-2xs">
          {[
            { id: "products", label: "Katalog & Stok (30)" },
            { id: "operational", label: "SOP Operasional (32)" },
            { id: "shipping", label: "Pengiriman & Kapasitas" },
            { id: "faqs", label: "FAQ Toko (30)" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === item.id
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "text-gray-600 hover:text-deep-teal hover:bg-brand-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Products */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-kompas-border bg-white pl-9 pr-3 py-1.5 text-xs text-deep-teal focus:border-teal-mid focus:outline-none"
              />
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Menampilkan {filteredProducts.length} produk katalog aktif
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-kompas-border bg-canvas/60 text-gray-600">
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-3 font-semibold">Nama Produk</th>
                    <th className="py-3 px-3 font-semibold">Kategori</th>
                    <th className="py-3 px-3 font-semibold text-right">Stok Fisik</th>
                    <th className="py-3 px-3 font-semibold text-right">Modal (COGS)</th>
                    <th className="py-3 px-3 font-semibold text-right">Harga Jual</th>
                    <th className="py-3 px-3 font-semibold text-right">Margin Ref %</th>
                    <th className="py-3 px-3 font-semibold text-center">Izin Resmi</th>
                    <th className="py-3 px-4 font-semibold text-center">Status Stok</th>
                    <th className="py-3 px-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kompas-border/60">
                  {filteredProducts.map((p) => {
                    const isHealthy = p.stock_state === "AMAN" || p.stock > 10
                    const isLow = p.stock_state === "MENIPIS" || (p.stock > 0 && p.stock <= 10)
                    const isOut = p.stock <= 0

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleOpenDetail(p.id)}
                        className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-teal-mid">{p.sku}</td>
                        <td className="py-3 px-3 font-medium text-deep-teal">{p.name}</td>
                        <td className="py-3 px-3 text-gray-600">{p.category}</td>
                        <td className="py-3 px-3 text-right font-bold text-deep-teal tabular-nums">
                          {p.stock} <span className="font-normal text-[10px] text-gray-400">{p.unit}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium tabular-nums text-gray-600">
                          {formatIDR(p.modal)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold tabular-nums text-deep-teal">
                          {formatIDR(p.price)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-kompas-green">
                          {p.margin_ref_pct ? `${p.margin_ref_pct}%` : "-"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.has_halal && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                HALAL
                              </span>
                            )}
                            {p.has_bpom && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                                BPOM
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              isOut
                                ? "bg-red-50 text-red-800 border-red-200"
                                : isLow
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {isOut ? "HABIS" : isLow ? "MENIPIS" : "AMAN"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditStockModal(p)
                              setNewStockVal(p.stock)
                            }}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-teal-mid"
                            title="Update Stok Gudang"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Operational Rules (OPS-001..32) */}
      {tab === "operational" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {operationalRules.map((rule) => (
            <div key={rule.code} className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-teal-mid">{rule.code}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                  {rule.category}
                </span>
              </div>
              <h4 className="font-bold text-sm text-deep-teal">{rule.parameter}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{rule.rule_text}</p>
              {rule.scope && (
                <div className="text-[10px] text-gray-400 pt-1">Cakupan: {rule.scope}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Shipping & Capacity */}
      {tab === "shipping" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-card p-5">
              <div className="text-xs text-gray-500 font-medium">Cutoff Pengiriman (Senin-Jumat)</div>
              <div className="mt-1 text-2xl font-bold text-deep-teal">
                {shippingInfo?.rule?.cutoff_weekday || "14:00"} WIB
              </div>
              <p className="mt-1 text-xs text-gray-400">Pembayaran terverifikasi masuk antrean hari sama</p>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs text-gray-500 font-medium">Cutoff Pengiriman (Sabtu)</div>
              <div className="mt-1 text-2xl font-bold text-deep-teal">
                {shippingInfo?.rule?.cutoff_saturday || "12:00"} WIB
              </div>
              <p className="mt-1 text-xs text-gray-400">Minggu toko tidak ada pengiriman kurir</p>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs text-gray-500 font-medium">Kapasitas Harian Toko</div>
              <div className="mt-1 text-2xl font-bold text-teal-mid">
                {shippingInfo?.rule?.packing_capacity_per_day || 700} Paket
              </div>
              <p className="mt-1 text-xs text-gray-400">Batas maksimal per shift packing gudang</p>
            </div>
          </div>

          {/* Calendar of Capacity Days */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="font-bold text-deep-teal text-sm">
              Histori Penggunaan Kapasitas Gudang (14 Hari Terakhir)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capacityDays.map((d, i) => (
                <div key={i} className="rounded-xl border border-kompas-border bg-white p-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-deep-teal">
                    <span>{d.day}</span>
                    <span className={d.is_closed ? "text-red-600" : "text-kompas-green"}>
                      {d.is_closed ? "Tutup" : "Buka"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Terpakai:</span>
                    <span className="font-bold">{d.used} / {d.capacity}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-mid"
                      style={{ width: `${Math.min(100, d.usage_pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: FAQs */}
      {tab === "faqs" && (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.code} className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-teal-mid">{faq.code}</span>
                  <span className="font-bold text-sm text-deep-teal">{faq.question}</span>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                  {faq.category}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed bg-canvas/40 p-3 rounded-xl border border-kompas-border">
                {faq.answer}
              </p>
              {faq.ops_refs && (
                <div className="text-[10px] text-gray-400">
                  Referensi SOP: <span className="font-mono text-teal-mid font-semibold">{faq.ops_refs}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <div className="text-xs font-semibold text-teal-mid font-mono">
                {selectedProduct.product.sku}
              </div>
              <h3 className="text-xl font-bold text-deep-teal">
                {selectedProduct.product.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Kategori: {selectedProduct.product.category} | Varian: {selectedProduct.product.variant || "Standar"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-canvas p-3 border">
                <div className="text-gray-500">Stok Saat Ini</div>
                <div className="text-lg font-bold text-deep-teal">
                  {selectedProduct.product.stock} {selectedProduct.product.unit}
                </div>
              </div>
              <div className="rounded-xl bg-canvas p-3 border">
                <div className="text-gray-500">Modal (COGS)</div>
                <div className="text-lg font-bold text-gray-700">
                  {formatIDR(selectedProduct.product.modal)}
                </div>
              </div>
              <div className="rounded-xl bg-canvas p-3 border">
                <div className="text-gray-500">Harga Jual</div>
                <div className="text-lg font-bold text-kompas-green">
                  {formatIDR(selectedProduct.product.price)}
                </div>
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-deep-teal uppercase tracking-wider">
                Dokumen Bukti Resmi (Evidence):
              </h4>
              {selectedProduct.evidence && selectedProduct.evidence.length > 0 ? (
                selectedProduct.evidence.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-xl border border-kompas-border bg-white p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-deep-teal uppercase">
                        {ev.evidence_type} - {ev.document_no}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Penerbit: {ev.issuer} | Berlaku s/d: {ev.valid_to || "Permanen"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ev.is_valid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ev.is_valid ? "BERLAKU" : "KEDALUWARSA"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">Belum ada dokumen sertifikat tercatat.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Stock Dialog */}
      {editStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-3xl border border-kompas-border bg-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setEditStockModal(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="text-xs font-semibold text-teal-mid font-mono">
                {editStockModal.sku}
              </div>
              <h3 className="text-base font-bold text-deep-teal">
                Update Stok Fisik Gudang
              </h3>
              <p className="text-xs text-gray-500">{editStockModal.name}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Jumlah Stok Baru ({editStockModal.unit})
              </label>
              <input
                type="number"
                min={0}
                value={newStockVal}
                onChange={(e) => setNewStockVal(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-kompas-border bg-white p-2.5 text-sm font-bold text-deep-teal"
              />
            </div>

            <button
              onClick={handleSaveStock}
              disabled={savingStock}
              className="w-full rounded-xl bg-teal-mid py-2.5 text-xs font-bold text-white hover:bg-teal-mid/90 shadow-sm"
            >
              {savingStock ? "Menyimpan Snapshot..." : "Simpan Snapshot Baru"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
