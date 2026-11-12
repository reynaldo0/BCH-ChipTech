import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Numeric = number | string | null | undefined

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "string" ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

export function formatIDR(value: Numeric): string {
  const amount = toNumber(value)
  if (amount === null) return "—"
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
  return amount < 0 ? `−${formatted}` : formatted
}

export function formatCompactIDR(value: Numeric): string {
  const amount = toNumber(value)
  if (amount === null) return "—"
  const abs = Math.abs(amount)
  const sign = amount < 0 ? "−" : ""
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`
  return `${sign}Rp ${abs}`
}

export function formatInteger(value: Numeric): string {
  const amount = toNumber(value)
  if (amount === null) return "—"
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount)
}

export function formatPercent(value: Numeric, digits = 1): string {
  const amount = toNumber(value)
  if (amount === null) return "—"
  return `${amount.toFixed(digits).replace(".", ",")}%`
}

export function formatDecimal(value: Numeric, digits = 2): string {
  const amount = toNumber(value)
  if (amount === null) return "—"
  return amount.toFixed(digits).replace(".", ",")
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(date)
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Belum tersedia"
  const map: Record<string, string> = {
    COMPLETE: "Lengkap",
    PARTIAL: "Parsial",
    RECONCILIATION_REQUIRED: "Perlu rekonsiliasi",
    RECON: "Perlu rekonsiliasi",
    NOT_CALCULABLE: "Tidak dapat dihitung",
    NOT_CALCULATED: "Belum dihitung",
    VERIFIED: "Terverifikasi",
    UNVERIFIED: "Belum diverifikasi",
    STALE: "Perlu diperbarui",
    MISSING: "Belum tersedia",
    INVALID: "Tidak valid",
    REVIEW: "Perlu pemeriksaan",
    ESCALATED: "Dieskalasikan",
    SIMULATED: "Simulasi",
    RESOLVED: "Selesai",
    BARU: "Baru",
    PERLU_PERHATIAN: "Perlu perhatian",
    MENUNGGU: "Menunggu",
    SELESAI: "Selesai",
    DITOLAK: "Ditolak",
    AMAN: "Aman",
    MENIPIS: "Menipis",
    HABIS: "Habis",
    KEDALUWARSA: "Perlu diperbarui",
    KOSONG: "Belum tersedia",
    JAWAB_LANGSUNG: "Jawab langsung",
    JAWAB_TERBATAS: "Jawab terbatas",
    ESKALASI: "Eskalasi",
    VALID: "Berlaku",
    EXPIRED: "Kedaluwarsa",
  }
  return map[status] ?? status
}

export function decisionTone(decision: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (decision === "JAWAB_LANGSUNG") return "success"
  if (decision === "JAWAB_TERBATAS") return "warning"
  if (decision === "ESKALASI") return "danger"
  return "neutral"
}

export function severityTone(severity: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (severity === "rendah") return "neutral"
  if (severity === "sedang") return "warning"
  if (severity === "tinggi" || severity === "kritis") return "danger"
  return "neutral"
}

export function completionTone(status: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (status === "COMPLETE" || status === "Lengkap" || status === "SELESAI") return "success"
  if (status === "PARTIAL" || status === "Parsial" || status === "MENUNGGU" || status === "PERLU_PERHATIAN") return "warning"
  if (status === "RECONCILIATION_REQUIRED" || status === "INVALID" || status === "DITOLAK") return "danger"
  return "neutral"
}

export function marketplaceDot(marketplace: string | null | undefined): string {
  if (marketplace === "Shopee") return "bg-mp-shopee"
  if (marketplace === "TikTok Shop" || marketplace === "TikTok") return "bg-mp-tiktok"
  if (marketplace === "Lazada") return "bg-mp-lazada"
  return "bg-chart-neutral"
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function safeNumber(value: Numeric, fallback = 0): number {
  return toNumber(value) ?? fallback
}
