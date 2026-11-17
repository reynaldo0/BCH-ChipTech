import Link from "next/link"
import { ArrowRight, BarChart3, Check, CheckSquare, ChevronRight, Database, MessageCircle, PackageCheck, Scale, ShieldCheck } from "lucide-react"
import { BrandMark } from "@/components/BrandMark"

const features = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Jawaban pelanggan lebih siap",
    body: "Tempel pesan pembeli, dapatkan draf berbasis katalog, FAQ, dan aturan toko tanpa membuka banyak tab.",
  },
  {
    number: "02",
    icon: PackageCheck,
    title: "Stok selalu punya konteks",
    body: "Perbarui stok dengan cap waktu, lihat produk yang perlu diperiksa, dan gunakan data terbaru saat membalas.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Laba sampai ke baris transaksi",
    body: "Impor laporan marketplace, periksa pemetaan kolom, dan pahami LK I, LK II, serta harga impas per SKU.",
  },
]

const modules = [
  { title: "Layanan pelanggan", description: "Draf jawaban, klasifikasi pesan, antrean kerja, dan sumber bukti.", href: "/asisten", icon: MessageCircle },
  { title: "Keluhan & eskalasi", description: "Pisahkan masalah yang perlu tindakan staf dari pertanyaan biasa.", href: "/keluhan", icon: CheckSquare },
  { title: "Produk & stok", description: "Simpan snapshot stok, informasi produk, dan catatan kesegaran data.", href: "/produk", icon: PackageCheck },
  { title: "Laba kontribusi", description: "Baca omzet, potongan, modal, LK I, LK II, dan harga impas.", href: "/laba", icon: BarChart3 },
]

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="border-b border-line bg-background/95">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="KOMPAS beranda">
            <BrandMark variant="dark" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-600 md:flex" aria-label="Navigasi landing page">
            <a href="#cara-kerja" className="transition-colors hover:text-ink-950">Cara kerja</a>
            <a href="#modul" className="transition-colors hover:text-ink-950">Modul</a>
            <a href="#kepercayaan" className="transition-colors hover:text-ink-950">Kepercayaan</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/masuk" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950">
              Masuk
            </Link>
            <Link href="/daftar" className="hidden rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 sm:inline-flex">
              Minta akses
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-sand-100">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-24">
          <div className="animate-rise">
            <p className="eyebrow text-brand-700">Connected operations untuk Toko Husin</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-ink-950 sm:text-6xl">
              Kerja toko lebih tertata.
              <span className="block text-brand-700">Layanan terasa lebih dekat.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-700 sm:text-lg">
              KOMPAS menyatukan layanan pelanggan, stok, keluhan, dan laba kontribusi dalam satu ruang kerja yang dibuat untuk toko kurma.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/masuk" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
                Masuk ke workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#cara-kerja" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-card px-5 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50">
                Lihat cara kerja <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-ink-600">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-brand-600" /> Data tertata dan siap ditindaklanjuti</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-brand-600" /> Aturan toko tetap utama</span>
            </div>
          </div>

          <div className="relative animate-rise [animation-delay:120ms]">
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full border-[14px] border-brand-200/60" aria-hidden="true" />
            <div className="landing-float relative overflow-hidden rounded-2xl border border-line-strong bg-card shadow-soft-md">
              <div className="flex items-center justify-between border-b border-line bg-ink-950 px-5 py-4 text-white">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sand-300">KOMPAS / workspace</p>
                  <p className="mt-1 font-display text-lg font-semibold">Ringkasan toko</p>
                </div>
                <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-[10px] font-semibold text-brand-200">Ringkasan toko</span>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Omzet", "Rp24,8 jt"],
                    ["LK I", "Rp6,4 jt"],
                    ["Kelengkapan", "92%"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-line bg-sand-50 p-3">
                      <p className="text-[11px] text-ink-500">{label}</p>
                      <p className="mt-2 font-display text-lg font-semibold tracking-tight text-ink-950">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="eyebrow">Prioritas hari ini</p>
                      <p className="mt-1 font-semibold text-ink-950">2 hal perlu diperiksa</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 border-t border-line-soft pt-3">
                      <span className="h-2 w-2 rounded-full bg-warning-500" />
                      <span className="text-xs text-ink-700">Stok kurma Ajwa perlu diperbarui</span>
                    </div>
                    <div className="flex items-center gap-3 border-t border-line-soft pt-3">
                      <span className="h-2 w-2 rounded-full bg-danger-500" />
                      <span className="text-xs text-ink-700">1 keluhan menunggu pemeriksaan</span>
                    </div>
                  </div>
                </div>
                <p className="font-mono text-[10px] text-ink-500">Angka diringkas agar prioritas mudah dipindai.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="border-b border-line bg-card">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:py-20">
          <div className="animate-rise">
            <p className="eyebrow text-brand-700">Dibuat untuk ritme toko</p>
            <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink-950">
              Sedikit lebih sedikit berpindah layar.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Tempel", "Masukkan pesan atau laporan yang sedang dikerjakan."],
              ["02", "Periksa", "Lihat bukti, status, dan data yang dipakai sistem."],
              ["03", "Tindak", "Salin jawaban, perbarui stok, atau lanjutkan eskalasi."],
            ].map(([number, title, body]) => (
              <div key={number} className="animate-rise border-t-2 border-brand-500 pt-4 [animation-delay:100ms]">
                <p className="font-mono text-xs text-brand-700">{number}</p>
                <h3 className="mt-6 font-display text-xl font-semibold text-ink-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modul" className="border-b border-line bg-sand-50">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:py-20">
          <div>
            <p className="eyebrow text-brand-700">Ruang kerja yang saling terhubung</p>
            <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink-950">
              Bukan sekadar ringkasan. Ada langkah berikutnya.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink-600">
              Setiap bagian punya tujuan yang jelas dan bisa dibuka saat pekerjaan itu benar-benar diperlukan.
            </p>
          </div>
          <div className="border-y border-line">
            {modules.map((module) => (
              <Link key={module.title} href={module.href} className="group grid gap-3 border-b border-line py-5 last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-card text-brand-700">
                  <module.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold text-ink-950 group-hover:text-brand-700">{module.title}</span>
                  <span className="mt-1 block max-w-xl text-sm leading-6 text-ink-600">{module.description}</span>
                </span>
                <ArrowRight className="hidden h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-700 sm:block" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="fitur" className="bg-background">
        <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-brand-700">Satu sistem, keputusan lebih jelas</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink-950 sm:text-4xl">
              Yang dibutuhkan toko setiap hari.
            </h2>
          </div>
          <div className="mt-10 grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {features.map((feature) => (
              <article key={feature.number} className="animate-rise py-7 md:px-7 md:first:pl-0 md:last:pr-0 [animation-delay:160ms]">
                <div className="flex items-center justify-between">
                  <feature.icon className="h-6 w-6 text-brand-700" aria-hidden="true" />
                  <span className="font-mono text-xs text-ink-500">{feature.number}</span>
                </div>
                <h3 className="mt-12 font-display text-xl font-semibold text-ink-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:py-20">
          <div>
            <p className="eyebrow text-brand-700">Cara KOMPAS menjaga kejelasan</p>
            <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink-950">
              Teknologi dipakai seperlunya.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Database, title: "Sumber terlihat", body: "Katalog, FAQ, stok, dan aturan yang dipakai tetap bisa diperiksa." },
              { icon: Scale, title: "Aturan lebih dulu", body: "Mesin keputusan membantu menandai risiko, bukan mengambil alih kebijakan toko." },
              { icon: ShieldCheck, title: "Akses terukur", body: "Role menentukan apa yang boleh dilihat dan dikerjakan setiap orang." },
            ].map((item) => (
              <div key={item.title} className="border-t-2 border-brand-500 pt-4">
                <item.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                <h3 className="mt-7 font-display text-lg font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="kepercayaan" className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1240px] animate-rise flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-sand-300">KOMPAS untuk Toko Husin</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-white">
              Teknologi yang membantu toko tetap terasa manusiawi.
            </h2>
            <p className="mt-4 text-sm leading-6 text-sidebar-foreground/75">
              Aturan toko dan keputusan staf tetap terlihat jelas. KOMPAS membantu pekerjaan, bukan menggantikan pertimbangan pemilik toko.
            </p>
          </div>
          <Link href="/daftar" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-sand-300">
            Minta akses workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-background">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <BrandMark variant="dark" />
          <p>© 2026 KOMPAS · Connected operations</p>
        </div>
      </footer>
    </main>
  )
}
