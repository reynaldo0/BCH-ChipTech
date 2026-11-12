import Link from "next/link"
import { AppShell } from "@/components/AppShell"

export default function DemoPage() {
  return <AppShell title="Panduan demo" description="Alur singkat untuk melihat nilai KOMPAS dalam tiga menit.">
    <div className="max-w-3xl space-y-6">
      <section className="card card-pad"><p className="eyebrow">Urutan demo</p><h2 className="mt-2 font-display text-2xl font-semibold">Mulai dari masalah, lalu lihat dampaknya</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-ink-700"><li><strong>1. Beranda.</strong> Tunjukkan tiga angka utama dan daftar tindakan yang sudah diurutkan berdasarkan dampak.</li><li><strong>2. Pesanan & Laba.</strong> Buka tujuh transaksi yang perlu rekonsiliasi untuk menjelaskan mengapa laba tidak boleh dianggap lengkap.</li><li><strong>3. Asisten.</strong> Masukkan pertanyaan stok atau keluhan untuk melihat jawaban berbasis data.</li><li><strong>4. Produk & Stok.</strong> Perbarui stok lalu kembali ke Beranda untuk melihat konteks operasional.</li></ol></section>
      <section className="card card-pad"><p className="eyebrow">Bukti akurasi</p><h2 className="mt-2 font-display text-xl font-semibold">Dataset dan pengujian</h2><p className="mt-2 text-sm leading-6 text-ink-600">Buka halaman bukti untuk menunjukkan hasil pengujian dataset demo tanpa menjadikannya menu kerja harian.</p><Link className="link-quiet mt-4 inline-block" href="/demo/bukti">Buka bukti akurasi</Link></section>
    </div>
  </AppShell>
}
