"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Search, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

import { API_BASE, api } from "@/lib/api"
import { cn, formatIDR } from "@/lib/utils"

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Contribution {
  gross_sales: string
  dana_dilepas: string
  lk1: string
  lk1_margin_pct: string | null
  lk1_status: string
  lk1_rows_missing: number
  lk2: string | null
  lk2_partial: string
  lk2_status: string
  lk2_rows_missing: number
  operating_profit_note: string
  definitions: Record<string, string>
}
interface SkuRow {
  sku: string
  product_name: string | null
  marketplaces: string[]
  qty: number
  gross_sales: string
  deduction_pct: string | null
  lk1: string
  lk1_margin_pct: string | null
  lk2: string | null
  modal_unit: string | null
  break_even_price: string | null
  lk1_status: string
  lk2_status: string
  missing_components: string[]
  negative_rows: number
  reconciliation_rows: number
  data_warnings: string[]
}
interface ChannelRow {
  marketplace: string
  gross_sales: string
  dana_dilepas: string
  lk1: string
  deduction_pct: string | null
  lk1_margin_pct: string | null
  transaction_count: number
  lk1_rows_missing: number
}
interface Summary {
  kpi: Record<string, any>
  contribution: Contribution
  by_sku: SkuRow[]
  by_marketplace: ChannelRow[]
  missing_components: { label: string; transaction_count: number }[]
}
interface Preview {
  batch_id: number
  filename: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows: number
  unmatched_sku: number
  detected_columns: string[]
  suggested_mapping: Record<string, string>
  field_labels: Record<string, string>
  required_fields: string[]
  preview_rows: Record<string, any>[]
  issues: { row_number: number; field: string; value: string; reason: string; severity: string }[]
  cleaning: { header_row: number; dropped: Record<string, number>; dropped_total: number; kept_rows: number }
}

const pct = (value: string | null | undefined) =>
  value == null ? "—" : `${Number(value).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

function StatusText({ status, detail }: { status: string; detail?: string }) {
  const ok = status === "Lengkap"
  const Icon = ok ? CheckCircle2 : AlertTriangle
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", ok ? "text-success-700" : "text-warning-800")} title={detail}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {status}
    </span>
  )
}

/* ── Import wizard (F8): upload → cleaning report → mapping → confirm ─── */
function ImportWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [marketplace, setMarketplace] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Record<string, any> | null>(null)

  async function upload(selected: File) {
    setError("")
    setResult(null)
    setPreview(null)
    const ext = selected.name.split(".").pop()?.toLowerCase()
    if (!ext || !["csv", "xlsx"].includes(ext)) {
      setError("Format file harus .csv atau .xlsx (file .xlsm, .pdf, dan lainnya ditolak).")
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Ukuran file melebihi 10 MB.")
      return
    }
    setFile(selected)
    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", selected)
      const query = marketplace ? `?marketplace=${encodeURIComponent(marketplace)}` : ""
      const data = await api.upload<Preview>(`/api/imports/preview${query}`, form)
      setPreview(data)
      setMapping(data.suggested_mapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pratinjau gagal.")
    } finally {
      setLoading(false)
    }
  }

  async function confirm() {
    if (!preview) return
    setLoading(true)
    setError("")
    try {
      const clean = Object.fromEntries(Object.entries(mapping).filter(([, target]) => target))
      setResult(await api.post(`/api/imports/${preview.batch_id}/confirm`, { mapping: clean }))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impor gagal.")
    } finally {
      setLoading(false)
    }
  }

  const targets = preview ? Object.keys(preview.field_labels) : []
  const missingRequired = preview
    ? preview.required_fields.filter((field) => !Object.values(mapping).includes(field))
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="card relative w-full max-w-3xl space-y-4 p-5 sm:p-6">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Tutup">
          <X className="h-4 w-4" />
        </button>
        <div>
          <p className="eyebrow">Impor laporan marketplace</p>
          <h2 id="import-title" className="mt-1 font-display text-lg font-semibold text-ink-950">Unggah CSV/XLSX → cek pemetaan → hitung</h2>
          <p className="mt-1 text-[13px] text-ink-600">
            Modal produk diambil otomatis dari katalog Product Brain bila kolom HPP kosong. Baris rusak dikarantina, bukan menjatuhkan impor.
          </p>
        </div>

        {result ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2.5 text-[13px] text-success-900">
              <CheckCircle2 className="h-4 w-4" /> {result.valid_rows} baris masuk dan Laba Kontribusi sudah dihitung ulang.
            </p>
            <dl className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
              {[["Masuk", result.valid_rows], ["Karantina", result.invalid_rows], ["Duplikat ditolak", result.duplicate_rows], ["SKU asing", result.unmatched_sku]].map(([k, v]) => (
                <div key={k as string} className="rounded-md border border-border p-2.5"><dt className="text-ink-500">{k}</dt><dd className="tnum text-lg font-semibold">{v}</dd></div>
              ))}
            </dl>
            <Button onClick={onClose}>Lihat dasbor</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="field-label" htmlFor="import-file">Berkas laporan (.csv / .xlsx, maks 10 MB)</label>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  aria-describedby="import-error"
                  onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
                  className="field-control file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-[12px] file:font-medium file:text-brand-800"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="import-mp">Kanal (bila tidak ada kolomnya)</label>
                <select id="import-mp" className="field-control" value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
                  <option value="">Dari kolom file</option>
                  <option>Shopee</option>
                  <option>TikTok Shop</option>
                  <option>Lazada</option>
                </select>
              </div>
            </div>
            <p className="text-[12px] text-ink-500">
              Belum punya format? <a className="link-quiet text-[12px]" href={`${API_BASE}/api/imports/templates/shopee`}>Unduh template CSV KOMPAS</a>
            </p>

            {error ? <p id="import-error" role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[13px] text-danger-900">{error}</p> : null}
            {loading ? <p className="flex items-center gap-2 text-[13px] text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Membersihkan dan membaca {file?.name}…</p> : null}

            {preview ? (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-ink-50/60 p-3 text-[13px] text-ink-700">
                  <strong>{preview.filename}</strong>: header ditemukan di baris {preview.cleaning.header_row}; {preview.cleaning.dropped_total} baris non-data dibuang
                  {preview.cleaning.dropped_total ? ` (judul ${preview.cleaning.dropped.above_header}, kosong ${preview.cleaning.dropped.blank}, Total/Catatan ${preview.cleaning.dropped.total_or_note}, sel gabungan ${preview.cleaning.dropped.merged_or_sparse})` : ""}.
                  {" "}{preview.valid_rows} siap, {preview.invalid_rows} karantina, {preview.duplicate_rows} duplikat, {preview.unmatched_sku} SKU asing.
                </div>

                <div>
                  <p className="field-label">Pemetaan kolom — periksa sebelum menghitung</p>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                    <table className="data-table">
                      <thead><tr><th>Kolom di file</th><th>Dibaca sebagai</th></tr></thead>
                      <tbody>
                        {preview.detected_columns.map((column) => (
                          <tr key={column}>
                            <td className="font-mono text-[12px]">{column}</td>
                            <td>
                              <select
                                aria-label={`Pemetaan ${column}`}
                                className="field-control h-8 py-1"
                                value={mapping[column] ?? ""}
                                onChange={(e) => setMapping((m) => ({ ...m, [column]: e.target.value }))}
                              >
                                <option value="">— abaikan —</option>
                                {targets.map((target) => (
                                  <option key={target} value={target}>
                                    {preview.field_labels[target]}{preview.required_fields.includes(target) ? " *" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {missingRequired.length ? (
                    <p className="mt-1.5 text-[12px] text-danger-700">Wajib dipetakan: {missingRequired.map((f) => preview.field_labels[f]).join(", ")}</p>
                  ) : null}
                </div>

                {preview.issues.length ? (
                  <details open={preview.issues.length <= 6}>
                    <summary className="cursor-pointer text-[13px] font-medium text-ink-800">Karantina & peringatan ({preview.issues.length})</summary>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[12.5px]">
                      {preview.issues.map((issue, index) => (
                        <li key={index} className={issue.severity === "ERROR" ? "text-danger-800" : "text-warning-800"}>
                          Baris {issue.row_number} · {issue.field}: {issue.reason} <span className="font-mono text-ink-500">{String(issue.value).slice(0, 40)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>Batal</Button>
                  <Button onClick={() => void confirm()} loading={loading} disabled={missingRequired.length > 0 || preview.valid_rows === 0}>
                    Konfirmasi & hitung Laba Kontribusi
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Transaction detail ────────────────────────────────────────────────── */
function TransactionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    api.get(`/api/profit/transactions/${id}`).then(setData).catch(() => setData({ error: true }))
  }, [id])
  const tx = data?.transaction
  const calc = data?.calculation
  const comps = calc?.trace?.components ?? {}
  const level = calc?.contribution
  const line = (label: string, value: string | null | undefined, strong = false, minus = true) => (
    <div className={cn("flex justify-between px-3 py-1.5 text-[13px]", strong && "rounded-md bg-brand-50 font-semibold text-brand-900")}>
      <span>{label}</span>
      <span className="tnum">{value == null ? <em className="text-warning-700">belum ada</em> : `${minus ? "−" : ""}${formatIDR(value)}`}</span>
    </div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4" role="dialog" aria-modal="true" aria-label="Rincian transaksi">
      <div className="card relative max-h-[90vh] w-full max-w-xl overflow-y-auto p-5">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Tutup"><X className="h-4 w-4" /></button>
        {!tx ? (
          <p className="text-[13px] text-ink-500">{data?.error ? "Gagal memuat." : "Memuat…"}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="eyebrow">{tx.marketplace} · {tx.transaction_date}</p>
              <h3 className="font-mono text-base font-semibold">{tx.transaction_id}</h3>
              <p className="text-[13px] text-ink-600">{tx.product_name ?? tx.sku} × {tx.qty}</p>
            </div>
            <div className="divide-y divide-border rounded-md border border-border">
              {line("Omzet", tx.gross_sales, false, false)}
              {line("Diskon penjual", tx.seller_discount)}
              {line("Refund", tx.refund_amount)}
              {line("Komisi marketplace", comps.marketplace_commission)}
              {line(calc?.trace?.fixed_fee_source === "order_allocation" ? "Biaya tetap (dialokasikan dari pesanan)" : "Biaya tetap", comps.fixed_fee)}
              {line("Ongkir ditanggung penjual", comps.seller_shipping_cost)}
              {line("Logistik retur", comps.return_logistics_cost)}
              {line("Biaya lain", comps.other_costs)}
              {line("= Dana dilepas", level?.dana_dilepas, true, false)}
              {line(calc?.trace?.cogs_source === "product_fallback" ? "Modal (dari katalog)" : "Modal", comps.cogs)}
              {line("= Laba Kontribusi I", level?.lk1, true, false)}
              {line("Biaya packing", comps.packing_cost)}
              {line("= Laba Kontribusi II", level?.lk2, true, false)}
            </div>
            {calc?.warnings?.length ? (
              <ul className="space-y-1 rounded-md border border-warning-border bg-warning-bg p-3 text-[12.5px] text-warning-900">
                {calc.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Dashboard (F9/F10) ────────────────────────────────────────────────── */
export function ProfitEngineView() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [marketplace, setMarketplace] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (marketplace) params.set("marketplace", marketplace)
    if (start) params.set("start_date", start)
    if (end) params.set("end_date", end)
    return params
  }, [marketplace, start, end])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const txParams = new URLSearchParams(query)
      if (statusFilter) txParams.set("calc_status", statusFilter)
      if (search) txParams.set("search", search)
      txParams.set("limit", "100")
      const [sum, tx] = await Promise.all([
        api.get<Summary>(`/api/profit/summary?${query.toString()}`),
        api.get<{ items: any[] }>(`/api/profit/transactions?${txParams.toString()}`),
      ])
      setSummary(sum)
      setTransactions(tx.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data laba gagal dimuat.")
    } finally {
      setLoading(false)
    }
  }, [query, statusFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  const c = summary?.contribution
  const kpi = summary?.kpi ?? {}
  const skuRows = (summary?.by_sku ?? []).filter((row) => !onlyIncomplete || row.lk2_status !== "Lengkap" || row.data_warnings.length)

  if (error && !summary) {
    return <p role="alert" className="card card-pad text-[13px] text-danger-800">{error}</p>
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="card card-pad flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label" htmlFor="f-mp">Kanal</label>
          <select id="f-mp" className="field-control h-9 w-40" value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
            <option value="">Semua kanal</option>
            <option>Shopee</option>
            <option>TikTok Shop</option>
            <option>Lazada</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-start">Dari</label>
          <input id="f-start" type="date" className="field-control h-9" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="f-end">Sampai</label>
          <input id="f-end" type="date" className="field-control h-9" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {(marketplace || start || end) ? <Button variant="ghost" size="sm" onClick={() => { setMarketplace(""); setStart(""); setEnd("") }}>Reset</Button> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`${API_BASE}/api/imports/templates/shopee`}><Download /> Template CSV</a>
          </Button>
          <Button onClick={() => setShowImport(true)}><Upload /> Unggah laporan</Button>
        </div>
      </div>

      {loading && !summary ? <p className="flex items-center gap-2 text-[13px] text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Menghitung…</p> : null}

      {c ? (
        <>
          {/* Profit tiers (proposal Tabel 3.3) */}
          <section aria-labelledby="tiers" className="space-y-3">
            <h2 id="tiers" className="font-display text-base font-semibold text-ink-950">Tingkatan laba</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Omzet", value: c.gross_sales, note: `${kpi.transaction_count ?? 0} baris produk` },
                { label: "Dana dilepas", value: c.dana_dilepas, note: `Potongan ${pct(String(100 - (Number(c.dana_dilepas) / Math.max(1, Number(c.gross_sales))) * 100))} dari omzet` },
                { label: "Laba Kontribusi I", value: c.lk1, note: `Margin ${pct(c.lk1_margin_pct)} · ${c.lk1_status}`, emphasis: true, status: c.lk1_status },
                {
                  label: "Laba Kontribusi II",
                  value: c.lk2,
                  note: c.lk2_status === "Lengkap" ? "Setelah biaya packing" : `Belum lengkap: ${c.lk2_rows_missing} baris tanpa biaya packing (sementara ${formatIDR(c.lk2_partial)})`,
                  status: c.lk2_status,
                },
                { label: "Laba operasional", value: null, note: "Di luar cakupan (gaji, sewa tidak dihitung)" },
              ].map((tier) => (
                <div key={tier.label} className={cn("card p-4", tier.emphasis && "border-brand-300 bg-brand-50/50")}>
                  <p className="text-[12px] font-medium text-ink-600">{tier.label}</p>
                  <p className="tnum mt-1 font-display text-xl font-semibold text-ink-950">{tier.value == null ? "—" : formatIDR(tier.value)}</p>
                  <p className="mt-1 text-[12px] leading-4 text-ink-600">
                    {tier.status && tier.status !== "Lengkap" ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning-600" aria-label="Belum lengkap" /> : null}
                    {tier.note}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-ink-500">
              KOMPAS tidak memakai istilah "laba bersih": angka di atas adalah laba kontribusi. Nilai kosong tidak pernah dianggap nol.
            </p>
            {kpi.reconciliation_count ? (
              <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-[13px] text-warning-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {kpi.reconciliation_count} baris perlu rekonsiliasi (biaya tidak cocok aturan, duplikat, atau SKU asing).
                <button className="ml-auto shrink-0 underline underline-offset-2" onClick={() => setStatusFilter("RECONCILIATION_REQUIRED")}>Tampilkan</button>
              </p>
            ) : null}
          </section>

          {/* Per channel */}
          <section className="card overflow-hidden" aria-labelledby="by-channel">
            <h2 id="by-channel" className="border-b border-border px-5 py-3 font-display text-base font-semibold">Per kanal</h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Kanal</th><th className="text-right">Baris</th><th className="text-right">Omzet</th><th className="text-right">Potongan</th><th className="text-right">Dana dilepas</th><th className="text-right">LK I</th><th className="text-right">Margin LK I</th></tr></thead>
                <tbody>
                  {summary!.by_marketplace.map((row) => (
                    <tr key={row.marketplace}>
                      <td className="font-medium">{row.marketplace}</td>
                      <td className="tnum text-right">{row.transaction_count}</td>
                      <td className="tnum text-right">{formatIDR(row.gross_sales)}</td>
                      <td className="tnum text-right">{pct(row.deduction_pct)}</td>
                      <td className="tnum text-right">{formatIDR(row.dana_dilepas)}</td>
                      <td className="tnum text-right font-semibold">{formatIDR(row.lk1)}</td>
                      <td className="tnum text-right">{pct(row.lk1_margin_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per SKU (Lampiran 2) */}
          <section className="card overflow-hidden" aria-labelledby="by-sku">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div>
                <h2 id="by-sku" className="font-display text-base font-semibold">Laba Kontribusi per SKU</h2>
                <p className="text-[12px] text-ink-500">Diurutkan menurut LK I. Harga impas = modal ÷ (1 − tingkat potongan SKU).</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-ink-700">
                <input type="checkbox" className="accent-brand-700" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} />
                Hanya yang belum lengkap / ada peringatan
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th><th className="text-right">Qty</th><th className="text-right">Omzet</th><th className="text-right">Potongan</th>
                    <th className="text-right">LK I</th><th className="text-right">Margin</th><th className="text-right">Modal/unit</th><th className="text-right">Harga impas</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {skuRows.map((row) => (
                    <tr key={row.sku}>
                      <td>
                        <span className="block font-medium text-ink-950">{row.product_name ?? "SKU tidak dikenal"}</span>
                        <span className="font-mono text-[11px] text-ink-500">{row.sku}</span>
                        {row.data_warnings.map((w) => <span key={w} className="mt-0.5 block text-[11.5px] text-warning-800">⚠ {w}</span>)}
                      </td>
                      <td className="tnum text-right">{row.qty}</td>
                      <td className="tnum text-right">{formatIDR(row.gross_sales)}</td>
                      <td className="tnum text-right">{pct(row.deduction_pct)}</td>
                      <td className={cn("tnum text-right font-semibold", Number(row.lk1) < 0 && "text-danger-700")}>{formatIDR(row.lk1)}</td>
                      <td className="tnum text-right">{pct(row.lk1_margin_pct)}</td>
                      <td className="tnum text-right text-ink-600">{row.modal_unit ? formatIDR(row.modal_unit) : "—"}</td>
                      <td className="tnum text-right">{row.break_even_price ? formatIDR(row.break_even_price) : "—"}</td>
                      <td>
                        <StatusText
                          status={row.lk2_status}
                          detail={row.missing_components.length ? `Kurang: ${row.missing_components.join(", ")}` : undefined}
                        />
                        {row.missing_components.length ? <span className="block text-[11px] text-ink-500">Kurang: {row.missing_components.join(", ")}</span> : null}
                        {row.negative_rows ? <span className="block text-[11px] text-danger-700">{row.negative_rows} baris rugi</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Transactions */}
          <section className="card overflow-hidden" aria-labelledby="tx-list">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-3">
              <h2 id="tx-list" className="font-display text-base font-semibold">Baris transaksi</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-400" aria-hidden="true" />
                  <input aria-label="Cari transaksi" className="field-control h-9 w-56 pl-8" placeholder="No. pesanan atau SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select aria-label="Status perhitungan" className="field-control h-9 w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="COMPLETE">Lengkap</option>
                  <option value="PARTIAL">Belum lengkap</option>
                  <option value="RECONCILIATION_REQUIRED">Perlu rekonsiliasi</option>
                  <option value="NOT_CALCULABLE">Tidak dapat dihitung</option>
                </select>
              </div>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="data-table">
                <thead><tr><th>No. pesanan</th><th>Kanal</th><th>Tanggal</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Omzet</th><th className="text-right">LK II</th><th>Status</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => {
                    const label = { COMPLETE: "Lengkap", PARTIAL: "Belum lengkap", RECONCILIATION_REQUIRED: "Perlu rekonsiliasi", NOT_CALCULABLE: "Tidak dapat dihitung" }[tx.calc_status as string] ?? tx.calc_status
                    return (
                      <tr key={tx.id} className="cursor-pointer" onClick={() => setDetailId(tx.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setDetailId(tx.id)}>
                        <td className="font-mono text-[12px] text-brand-700">{tx.transaction_id}</td>
                        <td>{tx.marketplace}</td>
                        <td className="tnum">{tx.transaction_date}</td>
                        <td className="font-mono text-[12px]">{tx.sku}</td>
                        <td className="tnum text-right">{tx.qty}</td>
                        <td className="tnum text-right">{formatIDR(tx.gross_sales)}</td>
                        <td className={cn("tnum text-right", tx.profit && Number(tx.profit) < 0 && "text-danger-700")}>{tx.profit ? formatIDR(tx.profit) : "—"}</td>
                        <td><StatusText status={tx.calc_status === "COMPLETE" ? "Lengkap" : label} /></td>
                      </tr>
                    )
                  })}
                  {!transactions.length ? <tr><td colSpan={8} className="text-center text-ink-500">Tidak ada baris untuk filter ini.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {showImport ? <ImportWizard onClose={() => setShowImport(false)} onDone={() => void load()} /> : null}
      {detailId != null ? <TransactionDetail id={detailId} onClose={() => setDetailId(null)} /> : null}
      {summary && !summary.by_sku.length ? (
        <div className="card card-pad flex items-center gap-3 text-[13px] text-ink-600">
          <FileSpreadsheet className="h-5 w-5 text-ink-400" /> Belum ada transaksi pada filter ini. Unggah laporan untuk mulai.
        </div>
      ) : null}
    </div>
  )
}
