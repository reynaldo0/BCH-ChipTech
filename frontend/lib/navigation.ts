import type { Role } from "./api"

export type TabType =
  | "overview"
  | "chat"
  | "complaints"
  | "products"
  | "profit"
  | "insights"
  | "evaluation"
  | "settings"

export interface PageMeta {
  eyebrow: string
  title: string
  description: string
}

export const PAGE_META: Record<TabType, PageMeta> = {
  overview: {
    eyebrow: "Workspace / Overview",
    title: "Overview",
    description:
      "Kondisi data, margin, kapasitas, dan hal yang perlu diperiksa hari ini.",
  },
  chat: {
    eyebrow: "Workspace / Chat Copilot",
    title: "Chat Copilot",
    description:
      "Susun draft jawaban CS dari fakta Product Brain. Pesan pembeli diperlakukan sebagai data, bukan instruksi.",
  },
  complaints: {
    eyebrow: "Workspace / Complaint Center",
    title: "Complaint Center",
    description:
      "Kelola keluhan pelanggan, severity, biaya terkonfirmasi, dan jejak tindak lanjut.",
  },
  products: {
    eyebrow: "Data / Product Brain",
    title: "Product Brain",
    description:
      "Satu sumber fakta untuk produk, stok, modal, pengiriman, bukti, dan aturan biaya.",
  },
  profit: {
    eyebrow: "Data / Profit Engine",
    title: "Profit Engine",
    description:
      "Hitung laba deterministik dengan Decimal, tanpa mengubah nilai kosong menjadi nol.",
  },
  insights: {
    eyebrow: "Data / Insights",
    title: "Insights",
    description:
      "Telusuri kebocoran margin, tren keluhan, dan simulasi skenario berbasis dataset demo.",
  },
  evaluation: {
    eyebrow: "System / Evaluation",
    title: "Evaluation sandbox",
    description:
      "Uji golden set chat dan profit. Tidak ada data produksi di lingkungan ini.",
  },
  settings: {
    eyebrow: "System / Settings & Audit",
    title: "Settings & Audit",
    description:
      "Kelola aturan biaya, status integrasi AI, reset data demo, dan jejak audit.",
  },
}

export const ROLE_LABELS: Record<
  Role,
  { name: string; short: string; description: string }
> = {
  owner: {
    name: "Husin",
    short: "Owner",
    description: "Akses menyeluruh ke margin, biaya, dan audit.",
  },
  manager: {
    name: "Manajer Operasional",
    short: "Manager",
    description: "Stok, kapasitas packing, keluhan, dan rekonsiliasi.",
  },
  cs: {
    name: "Spesialis Layanan",
    short: "CS",
    description: "Chat Copilot, draft berbukti, dan eskalasi tiket.",
  },
  packing: {
    name: "Gudang & Packing",
    short: "Packing",
    description: "Update stok fisik dan kapasitas harian.",
  },
  judge: {
    name: "Juri / Evaluator",
    short: "Judge",
    description: "Golden set chat, profit, dan jejak audit.",
  },
}

export const DEMO_LABEL = "SIMULASI / DATA DUMMY"
