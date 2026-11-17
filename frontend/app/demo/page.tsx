import Link from "next/link"
import { AppShell } from "@/components/AppShell"

const steps = [
  {
    title: "Workspace CS · Jalur B",
    href: "/asisten",
    body: "Salin pesan pembeli (mis. \"Kacang Arab 500 g saya beli 3 tapi datang 2\"), tekan Ctrl+V di halaman. Kategori, draf, dan sumber muncul tanpa klik; Enter menyalin draf dan menandai selesai.",
  },
  {
    title: "Mode antrean · Jalur C",
    href: "/asisten?mode=antrean",
    body: "Klik \"Coba 10 pesan contoh\". Keluhan naik ke urutan teratas; kerjakan dengan J/K, Enter, E, dan 1–3.",
  },
  {
    title: "Paket template · Jalur A",
    href: "/asisten?mode=template",
    body: "Unduh teks template balasan cepat untuk Seller Center. Template stok habis memakai snapshot stok terbaru.",
  },
  {
    title: "Laba Kontribusi",
    href: "/laba",
    body: "Unggah data/demo/contoh_csv/demo_transaksi_husin_nov2026.csv, cek pemetaan kolom, konfirmasi. Saring 10–16 Nov 2026 untuk melihat LK I, LK II, harga impas, dan peringatan stok nol.",
  },
  {
    title: "Berkas rusak",
    href: "/laba",
    body: "Unggah demo_laporan_berantakan.csv: judul di atas header, baris Total/Catatan, sel rumus =HYPERLINK, duplikat, dan SKU asing ditangani tanpa crash.",
  },
  {
    title: "Hak akses",
    href: "/dashboard",
    body: "Ganti Mode kerja ke CS: menu Laba Kontribusi dan kolom modal hilang, dan server menolak akses (HTTP 403, tercatat di audit).",
  },
]

export default function DemoPage() {
  return (
    <AppShell title="Panduan demo" description="Urutan demo 4–5 menit yang mengikuti proposal KOMPAS.">
      <div className="max-w-3xl space-y-6">
        <section className="card card-pad">
          <p className="eyebrow">Urutan demo</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Dari pesan pembeli sampai laba per SKU</h2>
          <ol className="mt-5 space-y-4 text-sm leading-6 text-ink-700">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Link href={step.href} className="font-semibold text-brand-800 underline-offset-4 hover:underline">
                  {index + 1}. {step.title}
                </Link>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="card card-pad">
          <p className="eyebrow">Bukti akurasi</p>
          <h2 className="mt-2 font-display text-xl font-semibold">Golden Set dan pengujian</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Golden Set 100 percakapan (Lampiran 3) diuji otomatis lewat pytest. Halaman bukti menjalankan golden set chat dan profit
            langsung dari antarmuka.
          </p>
          <Link className="link-quiet mt-4 inline-block" href="/demo/bukti">Buka bukti akurasi</Link>
        </section>
      </div>
    </AppShell>
  )
}
