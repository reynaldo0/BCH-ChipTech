export type AttentionItem = {
  type: string
  level: "warning" | "danger" | "info"
  title: string
  description: string
  link?: string
}

export type OverviewResponse = {
  finance_visible?: boolean
  contribution?: {
    gross_sales: string
    dana_dilepas: string
    lk1: string
    lk1_margin_pct: string | null
    lk1_status: string
    lk2_status: string
    lk2_rows_missing: number
  } | null
  top_sku_lk1?: Array<{
    sku: string
    product_name: string | null
    qty: number
    gross_sales: string
    lk1: string
    lk1_margin_pct: string | null
    break_even_price: string | null
    data_warnings: string[]
  }>
  complaints_summary?: Record<string, any>
  operations?: {
    shipping_rule?: { cutoff_weekday: string; cutoff_saturday: string; daily_capacity: number }
    today_capacity?: { capacity: number; used: number; remaining: number; is_closed: boolean }
  }
  kpi?: {
    gross_sales?: string | number | null
    profit_complete?: string | number | null
    margin_complete_pct?: string | number | null
    completeness_pct?: string | number | null
    transaction_count?: number
    complete_count?: number
    partial_count?: number
    reconciliation_count?: number
    overall_status?: string
  }
  attention?: AttentionItem[]
  by_marketplace?: Array<{
    marketplace: string
    gross_sales?: string | number | null
    profit_complete?: string | number | null
    lk1?: string | null
    lk1_margin_pct?: string | null
    transaction_count?: number
  }>
  top_products?: Array<{
    product_name?: string | null
    sku?: string
    qty?: string | number | null
    profit_complete?: string | number | null
    stock?: number | null
  }>
  period?: { start?: string | null; end?: string | null }
}

export function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatRupiah(value: string | number | null | undefined): string {
  const amount = numberValue(value)
  if (amount === null) return "Belum tersedia"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: string | number | null | undefined): string {
  const amount = numberValue(value)
  if (amount === null) return "Belum tersedia"
  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`
}

export function completenessLabel(kpi: OverviewResponse["kpi"]): string {
  if (!kpi) return "Belum tersedia"
  if ((kpi.reconciliation_count ?? 0) > 0) return "Perlu rekonsiliasi"
  if ((kpi.partial_count ?? 0) > 0) return "Parsial"
  return kpi.overall_status || "Lengkap"
}

export function actionableItems(data: OverviewResponse) {
  return [...(data.attention || [])].sort((a, b) => {
    const rank = (item: AttentionItem) =>
      item.level === "danger" ? 0 : item.type === "RECONCILIATION" ? 1 : 2
    return rank(a) - rank(b)
  }).slice(0, 5)
}
