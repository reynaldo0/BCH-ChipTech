# Audit UI KOMPAS dan Rencana Perubahan

Audit ini dilakukan terhadap kode frontend saat ini, temuan AI slop, dan
respons data backend pada seed demo aktif. Audit dilakukan sebelum perubahan UI.

## 1. Kesimpulan singkat

Kode saat ini masih berupa satu halaman client-side dengan pergantian tab,
bukan enam route kerja yang diminta. Backend sudah memiliki data yang cukup
untuk mendukung flow utama, tetapi UI menampilkan campuran data API,
fallback manual, dan copy presentasional. Karena itu kontradiksi yang disebut
di temuan memang ada di kode, bukan hanya masalah visual.

Respons seed aktual pada 12 Nov 2026:

| Metrik | Nilai aktual | Sumber |
|---|---:|---|
| Penjualan kotor | Rp 13.177.000 | `profit_engine.build_summary()` |
| Pendapatan bersih untuk transaksi lengkap | Rp 12.534.000 | `profit_engine.build_summary()` |
| Laba bersih transaksi lengkap | Rp 1.738.165 | `profit_engine.build_summary()` |
| Margin transaksi lengkap | 13,8676% | backend, perlu ditampilkan 13,9% |
| Total transaksi | 156 | backend |
| Transaksi lengkap | 148 | backend |
| Transaksi parsial | 1 | backend |
| Transaksi perlu rekonsiliasi | 7 | backend |
| Kelengkapan data biaya | 94,8718% (`148/156`) | backend, perlu ditampilkan 94,9% |
| Status turunan | Perlu rekonsiliasi | backend |
| Keluhan total | 5 tiket | backend |
| Keluhan prioritas tinggi/kritis | 2 tiket | backend |
| Produk stok habis/kritis | 3 produk | backend |

Temuan “96,8% (151/156)” tidak cocok dengan seed/backend yang sekarang:
`148/156 = 94,8718%`. Temuan tersebut harus dianggap angka lama atau angka
dari definisi metrik berbeda sampai ada bukti data yang mendasarinya. UI baru
harus memakai satu definisi: transaksi dengan status `COMPLETE` dibagi total
transaksi untuk periode/channel aktif.

## 2. Komponen dipertahankan, diubah, atau dihapus

| Area | Keputusan | Alasan |
|---|---|---|
| `app/page.tsx` | Diubah besar | Saat ini mengatur semua tab, toast, role, reset, dan core loops dalam satu shell |
| `components/Sidebar.tsx` | Diubah | Memakai istilah internal, badge AI/Golden Set, petir, gradient, dan 8 item |
| `components/Header.tsx` | Diubah | Memuat Jev, Reset Demo, stack/status teknologi, dan channel yang bukan filter jelas |
| `components/views/OverviewView.tsx` | Diubah besar | Memuat carousel 3D, angka manual, KPI duplikat, dan alert terpotong |
| `components/views/ChatCopilotView.tsx` | Diubah menjadi Asisten | Satu pintu AI; istilah internal dan gradient masih dominan |
| `components/views/ProfitEngineView.tsx` | Diubah menjadi Pesanan & Laba | Kontennya relevan, tetapi label internal dan status perlu disatukan |
| `components/views/ComplaintsView.tsx` | Dipertahankan lalu dirapikan | Domain sesuai, perlu state/error/copy dan deep-link filter |
| `components/views/ProductBrainView.tsx` | Diubah menjadi Produk & Stok | Sumber data relevan, istilah “Brain” harus hilang |
| `components/views/DetectiveView.tsx` | Dipindah ke tab Selisih/Simulasi harga | Bukan menu utama; “Detective” adalah jargon internal |
| `components/views/EvaluationView.tsx` | Dipindah ke `/demo/bukti` | Hanya untuk mode demo/juri |
| `components/views/SettingsView.tsx` | Dipertahankan dan dirapikan | Menjadi Pengaturan; reset/demo tidak tampil di header |
| `components/ui/dish-orbit-carousel.tsx` | Dihapus dari Beranda | Melanggar larangan carousel/3D dan mendorong data penting ke bawah fold |
| `lib/api.ts` | Dipertahankan dan diperketat | Tetap menjadi transport API; perlu tipe response eksplisit |
| `lib/utils.ts` | Dipertahankan lalu diperluas | Tempat format Rupiah/persen/tanggal yang konsisten |
| `lib/metrics.ts` | Ditambahkan | Sumber tunggal metrik murni dan status turunan |
| `lib/seed.ts` | Ditambahkan | Seed deterministik untuk metrik UI dan unit test |
| `lib/navigation.ts` | Diubah | Menjadi enam route bisnis + route demo tersembunyi |

## 3. Audit angka dan sumber kebenaran

### Sumber backend yang benar

- Perhitungan status, kelengkapan, margin, dan agregat dilakukan di
  [profit_engine.py](/Users/wardingtotem/Desktop/BCH-ChipTech/backend/app/services/profit_engine.py:600).
- Status `Perlu rekonsiliasi` sudah diturunkan ketika ada tujuh transaksi
  rekonsiliasi di
  [profit_engine.py](/Users/wardingtotem/Desktop/BCH-ChipTech/backend/app/services/profit_engine.py:674).
- Nilai `completeness_pct` sudah berasal dari `complete_count / total_rows` di
  [profit_engine.py](/Users/wardingtotem/Desktop/BCH-ChipTech/backend/app/services/profit_engine.py:728).
- Overview mengambil summary tersebut dan membuat tiga attention item di
  [insights.py](/Users/wardingtotem/Desktop/BCH-ChipTech/backend/app/routers/insights.py:21).

### Angka/status manual atau fallback di UI

| Lokasi | Temuan |
|---|---|
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:121) | Fallback kapasitas `700/240/460` ditulis manual |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:152) | `156 Order` ditulis manual |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:161) | `+100%` ditulis manual tanpa periode pembanding |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:182) | Status `Status Lengkap` ditulis manual |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:200) | Fallback margin `13.87` ditulis manual |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:210) | Fallback kelengkapan `96.79` dan rekonsiliasi `5` ditulis manual |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:226) | Daftar produk carousel berisi angka/rating/deskripsi hardcoded |
| [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:347) | Copy `156 transaksi dummy` ditulis manual |
| [ProfitEngineView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/ProfitEngineView.tsx:207) | Label `Laba Bersih Lengkap` dapat bertentangan dengan status rekonsiliasi |
| [ProfitEngineView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/ProfitEngineView.tsx:224) | Count rekonsiliasi/parsial berasal API, tetapi tampil bersama label status yang tidak konsisten |

### Kontradiksi yang dikonfirmasi

1. **94,8718% vs 96,8%**: backend aktual menghasilkan 94,8718%;
   `96,8%` adalah fallback/manual lama di UI dan tidak boleh dipertahankan.
2. **Lengkap vs tujuh rekonsiliasi**: backend aktual menghasilkan status
   `Perlu rekonsiliasi`, sedangkan kartu net revenue dan copy profit masih
   menyiratkan lengkap. Ini bug presentasi, bukan bug formula backend.
3. **Tujuh transaksi vs lima order**: angka lima tidak berasal dari KPI
   rekonsiliasi aktual. UI harus menjelaskan bahwa tujuh adalah transaksi
   dengan data biaya bermasalah; jika ada lima order menunggu ongkir, itu
   subset/domain berbeda dan wajib diberi label eksplisit.
4. **Laba muncul dua kali**: Overview menampilkan profit dalam KPI dan kartu
   lain; Profit view juga mengulangnya. Beranda baru menampilkan laba bersih
   satu kali sebagai KPI.
5. **Pertumbuhan palsu**: `+100%` tidak memiliki periode pembanding. Nilai
   harus disembunyikan sampai endpoint/model menyediakan periode sebelumnya.
6. **Presisi palsu**: backend menyimpan empat desimal untuk perhitungan, tetapi
   UI harus memakai satu desimal (`13,9%`, `94,9%`).

## 4. Pelanggaran Do's and Don'ts

| Pelanggaran | Lokasi |
|---|---|
| Ikon petir sebagai identitas | [Sidebar.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Sidebar.tsx:81) |
| Gradient pada logo, navigasi, tombol, dan kartu | [Sidebar.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Sidebar.tsx:81), [ChatCopilotView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/ChatCopilotView.tsx:256), [DetectiveView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/DetectiveView.tsx:280) |
| Badge versi | [Sidebar.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Sidebar.tsx:88), [page.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/app/page.tsx:244) |
| Badge AI dan dua pintu AI | [Sidebar.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Sidebar.tsx:42), [Header.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Header.tsx:94) |
| Jev AI/stack technology bocor ke UI | [Header.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Header.tsx:94), [page.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/app/page.tsx:220) |
| Reset Demo di header | [Header.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Header.tsx:109) |
| Core loops sebagai header/menu | [page.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/app/page.tsx:155) |
| Carousel/3D dan copy instruksi | [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:226) |
| Teks penting dipotong dengan `truncate` | [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:143) |
| Jargon internal pada navigasi/header | [Sidebar.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Sidebar.tsx:42), [Header.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Header.tsx:24) |
| Banyak warna aksen/pill | [Header.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/Header.tsx:78), [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:128) |
| Watermark/dekorasi angka | [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:174) |
| Copy teknis “Decimal exact” | [OverviewView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/OverviewView.tsx:204), [ProfitEngineView.tsx](/Users/wardingtotem/Desktop/BCH-ChipTech/frontend/components/views/ProfitEngineView.tsx:138) |

## 5. Rencana struktur dan urutan eksekusi

1. Gerbang keputusan: setujui `DESIGN.md`, khususnya font lokal, grid/titik,
   aksen teal tunggal, dan motion.
2. Tambahkan token visual ke `frontend/app/globals.css` dan
   `frontend/tailwind.config.js`; hapus hex/radius/font inline dari komponen
   yang disentuh.
3. Tambahkan `frontend/lib/seed.ts` dan `frontend/lib/metrics.ts` beserta unit
   test untuk format, KPI, status, attention items, dan periode pembanding.
4. Bentuk shell route baru: `/`, `/laba`, `/keluhan`, `/produk`, `/asisten`,
   `/pengaturan`, `/demo`, dan `/demo/bukti`.
5. Ubah Beranda menjadi urutan: tindakan hari ini, tiga KPI, laba per channel,
   produk terlaris.
6. Buat panel Asisten tunggal yang dapat dibuka dari semua halaman dan layar
   penuh `/asisten`.
7. Pindahkan Selisih dan Simulasi harga menjadi tab di `/laba`.
8. Pindahkan evaluasi/reset/panduan ke mode demo.
9. Tambahkan loading skeleton, empty state, error state, keyboard focus, dan
   deep-link filter untuk setiap daftar/kartu interaktif.
10. Jalankan build frontend, unit test metrics, backend API test, dan smoke test
    journey demo 3–4 menit.

Tidak ada komponen UI yang diubah pada tahap audit ini.
