"use client"

import React, { useEffect, useState } from "react"
import {
  Search,
  Sliders,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  Flame,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatIDR } from "@/lib/utils"

export function DetectiveView() {
  const [detectiveData, setDetectiveData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // What-If Simulation State
  const [priceChange, setPriceChange] = useState<number>(0)
  const [discountChange, setDiscountChange] = useState<number>(0)
  const [commissionOverride, setCommissionOverride] = useState<string>("")
  const [packingDelta, setPackingDelta] = useState<number>(0)
  const [simResult, setSimResult] = useState<any>(null)
  const [simLoading, setSimLoading] = useState(false)

  useEffect(() => {
    loadDetective()
    runSimulation()
  }, [])

  async function loadDetective() {
    setLoading(true)
    try {
      const res = await api.get("/api/insights/detective")
      setDetectiveData(res)
    } catch (err) {
      console.error("Gagal memuat profit detective:", err)
    } finally {
      setLoading(false)
    }
  }

  async function runSimulation() {
    setSimLoading(true)
    try {
      const res = await api.post("/api/insights/what-if", {
        price_change_pct: priceChange,
        discount_change_pct: discountChange,
        commission_override_pct: commissionOverride ? parseFloat(commissionOverride) : null,
        packing_cost_delta: packingDelta,
      })
      setSimResult(res)
    } catch (err) {
      console.error("Gagal menjalankan simulasi what-if:", err)
    } finally {
      setSimLoading(false)
    }
  }

  function handleResetSliders() {
    setPriceChange(0)
    setDiscountChange(0)
    setCommissionOverride("")
    setPackingDelta(0)
    setTimeout(() => runSimulation(), 50)
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header bar */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-mid uppercase tracking-wider">
          <Search className="h-4 w-4" />
          <span>Margin Detective & What-If Simulation (Loop: Margin → CS & Keputusan Harga)</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-deep-teal">
          Detektif Kebocoran Margin & Simulator Skenario
        </h2>
        <p className="text-sm text-gray-600">
          Mengidentifikasi transaksi anomali dengan margin negatif, beban komisi marketplace tertinggi, dan memproyeksikan dampak perubahan harga jual.
        </p>
      </div>

      {/* Detective Findings Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Negative Margin */}
        <div className="glass-card p-5 border-red-200 bg-red-50/20">
          <div className="flex items-center justify-between text-xs font-semibold text-red-900">
            <span>Kebocoran Margin Bersih</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
              {detectiveData?.negative_margin_count || 0} Kasus
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            Ditemukan pesanan dengan laba bersih negatif akibat subsidi ongkir penjual dan diskon promo melebihi margin kotor barang.
          </div>
        </div>

        {/* Fee Discrepancy */}
        <div className="glass-card p-5 border-amber-200 bg-amber-50/20">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Diskrepansi Fee Marketplace</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
              {detectiveData?.reconciliation_count || 0} Kasus
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            Komisi terpotong pada settlement berbeda dengan tabel acuan fee resmi, memerlukan rekonsiliasi manual atau pembaruan aturan kategori.
          </div>
        </div>

        {/* Returns Impact */}
        <div className="glass-card p-5 border-teal-200 bg-teal-50/20">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
            <span>Beban Logistik Retur</span>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-teal-700">
              {detectiveData?.high_return_count || 0} Kasus
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            Biaya pengembalian barang dan refund menggerus profit kumulatif pada produk cair seperti minyak wangi dan galon air zamzam.
          </div>
        </div>
      </div>

      {/* Strategic Insights & Recommendations */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-deep-teal text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-kompas-gold" />
          <span>Rekomendasi Tindakan Strategis untuk Husin (Owner)</span>
        </h3>

        <div className="grid gap-3 sm:grid-cols-3">
          {(detectiveData?.insights || []).map((ins: any, idx: number) => (
            <div key={idx} className="rounded-2xl border border-kompas-border bg-white p-4 space-y-1.5">
              <div className="text-xs font-bold text-teal-mid">{ins.category}</div>
              <div className="text-xs font-semibold text-deep-teal">{ins.finding}</div>
              <p className="text-xs text-gray-600 leading-relaxed pt-1 border-t border-gray-100">
                <strong>Saran:</strong> {ins.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What-If Simulator Interactive Section */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-deep-teal flex items-center gap-2">
              <Sliders className="h-5 w-5 text-teal-mid" />
              <span>What-If Simulator: Proyeksi Laba Bersih</span>
            </h3>
            <p className="text-xs text-gray-500">
              Ubah parameter di bawah ini untuk melihat simulasi langsung terhadap seluruh 156 transaksi.
            </p>
          </div>

          <button
            onClick={handleResetSliders}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Slider</span>
          </button>
        </div>

        {/* Interactive Controls Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Price Change */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-deep-teal">
              <span>Perubahan Harga Jual:</span>
              <span className="font-bold font-mono text-teal-mid">
                {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={30}
              step={1}
              value={priceChange}
              onChange={(e) => {
                setPriceChange(parseInt(e.target.value))
                runSimulation()
              }}
              className="w-full accent-teal-mid"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>-20% Diskon</span>
              <span>+30% Kenaikan</span>
            </div>
          </div>

          {/* Discount change */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-deep-teal">
              <span>Voucher Diskon Penjual:</span>
              <span className="font-bold font-mono text-teal-mid">
                {discountChange > 0 ? `+${discountChange}%` : `${discountChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={discountChange}
              onChange={(e) => {
                setDiscountChange(parseInt(e.target.value))
                runSimulation()
              }}
              className="w-full accent-teal-mid"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>-50% Pangkas</span>
              <span>+50% Tambah</span>
            </div>
          </div>

          {/* Commission Override */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-deep-teal">
              <span>Tarif Komisi Marketplace:</span>
              <span className="font-bold font-mono text-teal-mid">
                {commissionOverride ? `${commissionOverride}%` : "Sesuai Aturan"}
              </span>
            </div>
            <select
              value={commissionOverride}
              onChange={(e) => {
                setCommissionOverride(e.target.value)
                setTimeout(() => runSimulation(), 50)
              }}
              className="w-full rounded-xl border border-kompas-border bg-white p-2 text-xs font-medium"
            >
              <option value="">Default (Sesuai Aturan Fee)</option>
              <option value="5.0">Kanal 5.0% (Promo Khusus)</option>
              <option value="8.0">Standar 8.0% (Shopee/TikTok)</option>
              <option value="10.0">Tinggi 10.0% (Program Ekstra)</option>
            </select>
          </div>

          {/* Packing Cost Delta */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-deep-teal">
              <span>Delta Biaya Packing:</span>
              <span className="font-bold font-mono text-teal-mid">
                {packingDelta > 0 ? `+${formatIDR(packingDelta)}` : formatIDR(packingDelta)}
              </span>
            </div>
            <input
              type="range"
              min={-2000}
              max={5000}
              step={500}
              value={packingDelta}
              onChange={(e) => {
                setPackingDelta(parseInt(e.target.value))
                runSimulation()
              }}
              className="w-full accent-teal-mid"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>-Rp2.000 Hemat</span>
              <span>+Rp5.000 Bubble Tebal</span>
            </div>
          </div>
        </div>

        {/* Results Comparison Box */}
        {simResult && (
          <div className="rounded-2xl border border-teal-light/40 bg-gradient-to-r from-teal-50/50 via-white to-canvas p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-deep-teal">
                Hasil Simulasi (156 Transaksi Teranalisis):
              </span>
              <span className="text-xs text-teal-mid font-semibold">
                Delta Margin: {simResult.simulation?.margin_delta_pct > 0 ? `+${simResult.simulation?.margin_delta_pct}%` : `${simResult.simulation?.margin_delta_pct}%`}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Net Revenue comparison */}
              <div className="rounded-xl bg-white p-4 border border-kompas-border">
                <div className="text-[11px] text-gray-500 font-semibold uppercase">Pendapatan Bersih</div>
                <div className="mt-2 text-xs text-gray-400">
                  Semula: <span className="tabular-nums font-mono">{formatIDR(simResult.original?.net_revenue)}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-deep-teal tabular-nums">
                  {formatIDR(simResult.simulation?.net_revenue)}
                </div>
              </div>

              {/* Profit comparison */}
              <div className="rounded-xl bg-white p-4 border border-kompas-border">
                <div className="text-[11px] text-gray-500 font-semibold uppercase">Laba Bersih (Net Profit)</div>
                <div className="mt-2 text-xs text-gray-400">
                  Semula: <span className="tabular-nums font-mono">{formatIDR(simResult.original?.profit)}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-kompas-green tabular-nums">
                  {formatIDR(simResult.simulation?.profit)}
                </div>
              </div>

              {/* Delta Impact */}
              <div className="rounded-xl bg-white p-4 border border-kompas-border">
                <div className="text-[11px] text-gray-500 font-semibold uppercase">Dampak Laba (Delta)</div>
                <div className="mt-2 text-xs text-gray-400">Perubahan nominal:</div>
                <div
                  className={`mt-1 text-lg font-bold tabular-nums flex items-center gap-1 ${
                    parseFloat(simResult.simulation?.profit_delta || "0") >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {parseFloat(simResult.simulation?.profit_delta || "0") >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span>{formatIDR(simResult.simulation?.profit_delta)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
