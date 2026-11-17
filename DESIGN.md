# KOMPAS — Brand & Product Design System

Dokumen ini adalah sumber kebenaran visual untuk KOMPAS, workspace operasional
Toko Husin. KOMPAS harus terlihat seperti perusahaan toko kurma yang matang,
tepercaya, hangat, dan modern; bukan dashboard generik dan bukan halaman
marketplace yang penuh promosi.

Prinsip utama:

1. **Hangat dan tepercaya** — warna kurma dan tipografi yang humanis membuat
   pelanggan merasa dilayani oleh toko sungguhan.
2. **Tegas dan mudah dipindai** — biru dipakai untuk aksi dan status interaktif,
   sehingga pengguna selalu tahu apa yang bisa dilakukan berikutnya.
3. **Premium melalui kesederhanaan** — ruang, hierarki, dan foto/bukti produk
   lebih penting daripada dekorasi.
4. **Operasional tetap jelas** — KPI, margin, stok, keluhan, dan keputusan Jev
   tidak boleh kalah oleh elemen branding.

## 1. Identitas merek

### Posisi visual

KOMPAS adalah alat kerja digital di balik toko kurma yang rapi. Wajah brand
harus menyampaikan:

- **Asli:** dekat dengan produk, keluarga, dan kebutuhan pembeli.
- **Aman:** informasi stok, kualitas, dan keluhan ditangani dengan bertanggung
  jawab.
- **Cermat:** setiap angka, biaya, dan keputusan dapat ditelusuri.
- **Berani berkembang:** teknologi membantu toko bekerja lebih cepat tanpa
  menghilangkan sentuhan manusia.

### Suara dan copy

- Gunakan bahasa Indonesia yang langsung, sopan, dan tidak kaku.
- Utamakan kata kerja: **Periksa stok**, **Tinjau keluhan**, **Konfirmasi
  impor**, **Simpan perubahan**.
- Hindari jargon teknis pada label pengguna. Istilah teknis boleh muncul di
  detail audit atau panel bukti.
- Gunakan “pembeli”, “pesanan”, “produk”, dan “toko”; hindari copy yang
  terdengar seperti sistem anonim.
- Angka uang memakai format rupiah dan pemisah yang konsisten.
- Pesan error harus menjelaskan masalah dan tindakan perbaikan, bukan hanya
  “Terjadi kesalahan”.

Contoh copy:

| Kurang tepat | KOMPAS |
|---|---|
| Submit | Simpan perubahan |
| Data invalid | Kolom tanggal belum diisi |
| Process completed | Impor 42 baris berhasil diperiksa |
| AI response | Rekomendasi Jev |
| Delete | Hapus data |

## 2. Palet warna utama

Palet ini wajib digunakan melalui token CSS/Tailwind. Jangan menambahkan warna
branding baru tanpa alasan produk yang jelas.

| Token | Nilai | Peran |
|---|---|---|
| `brand-olive` | `#71843F` | Aksen utama; tombol, link, focus ring, navigasi aktif |
| `brand-sand` | `#DCCBA8` | Pasir hangat; highlight, badge, selected state |
| `brand-espresso` | `#2B211B` | Fondasi identitas, sidebar, heading, teks utama |
| `canvas` | `#FBF8F1` | Latar aplikasi cream yang lembut |
| `surface` | `#FFFFFF` | Kartu, panel, modal, tabel |
| `surface-warm` | `#F3EBDD` | Area highlight lembut dan empty state |
| `ink-950` | `#2B211B` | Heading, angka KPI, teks paling penting |
| `ink-800` | `#42342B` | Isi teks dan label utama |
| `ink-600` | `#6E5B4E` | Metadata, helper text, placeholder |
| `line` | `#E5DCCE` | Border default dan divider |
| `line-strong` | `#D1C2B0` | Input aktif dan pemisah penting |
| `olive-soft` | `#F1F4E8` | Background informasi dan selected state olive |
| `espresso-soft` | `#F1ECE4` | Background identitas yang tenang |
| `success` | `#1D6B45` | Berhasil, sehat, tersedia |
| `success-soft` | `#E7F5EC` | Background status berhasil |
| `warning` | `#936A00` | Perlu perhatian dan data belum lengkap |
| `warning-soft` | `#FFF4C7` | Background peringatan |
| `danger` | `#B33A35` | Gagal, keluhan, risiko |
| `danger-soft` | `#FCEAE8` | Background error dan eskalasi |
| `info` | `#2458A6` | Informasi netral |
| `info-soft` | `#EAF2FF` | Background informasi |

### Aturan penggunaan warna

- **Espresso** memberi rasa percaya dan menjadi warna teks/sidebar, bukan warna
  untuk semua tombol.
- **Pasir** memberi rasa natural dan premium. Gunakan untuk highlight kecil,
  status pilihan, strip informasi, dan detail produk; jangan menjadikan seluruh
  halaman berwarna pasir.
- **Olive** adalah warna tindakan. Gunakan untuk tombol primer, link, focus
  state, dan navigasi aktif.
- Tombol olive memakai teks putih. Teks espresso di atas pasir dipakai untuk
  area highlight yang cukup luas.
- Jangan menaruh teks putih di atas pasir. Jangan memakai pasir sebagai warna
  teks kecil.
- Warna tidak boleh menjadi satu-satunya penanda status; sertakan ikon, label,
  atau teks seperti “Berhasil”, “Perlu perhatian”, dan “Gagal”.
- Warna kanal marketplace hanya boleh dipakai pada chip kanal atau grafik
  perbandingan, bukan sebagai warna dekorasi seluruh kartu.

### Kontras dan aksesibilitas

- Teks normal memenuhi kontras minimal WCAG AA 4.5:1.
- Teks besar dan elemen UI penting memenuhi minimal 3:1.
- Focus ring selalu terlihat: `2px solid #71843F` dengan offset `2px`.
- Target sentuh minimal `44px`; kontrol desktop tidak lebih kecil dari `36px`.
- State disabled tetap terbaca dan tidak hanya dibedakan oleh opacity.
- Hormati `prefers-reduced-motion`.

## 3. Tipografi

### Hirarki

- **Display dan heading:** Bricolage Grotesque, tebal 600–700.
- **Body dan kontrol:** Inter, 400–600.
- **Metadata dan angka teknis:** JetBrains Mono, 400–600.
- **Serif editorial:** tidak digunakan untuk KPI, tabel, atau keputusan
  operasional. Bila dipakai pada halaman bukti/brand story, hanya sebagai aksen
  pendek.

| Level | Ukuran desktop | Ukuran mobile | Bobot | Penggunaan |
|---|---:|---:|---:|---|
| Display | 36–48px | 30–36px | 700 | Hero ringkas atau judul halaman utama |
| H1 | 28–32px | 24–28px | 700 | Judul halaman |
| H2 | 20–24px | 18–20px | 600 | Judul section dan card utama |
| H3 | 16–18px | 16px | 600 | Subsection |
| Body | 14–16px | 14–16px | 400 | Deskripsi dan isi |
| Label | 12–13px | 12–13px | 600 | Label field, badge, navigasi |
| Meta | 11–12px | 11–12px | 500 | Waktu, ID, sumber bukti |

Gunakan `font-variant-numeric: tabular-nums` untuk uang, persentase, jumlah,
dan tanggal agar kolom mudah dibandingkan. Heading menggunakan letter spacing
sedikit negatif; label uppercase hanya untuk metadata pendek.

## 4. Layout dan grid

- Latar aplikasi: `canvas`, dengan permukaan putih sebagai lapisan informasi.
- Lebar konten utama maksimal `1440px`; area baca panjang maksimal `760px`.
- Sidebar desktop: `272px`; versi collapsed: `80px`.
- Header halaman: tinggi efektif `64–80px`, selalu memuat judul, konteks, dan
  aksi utama bila ada.
- Grid dashboard: 12 kolom desktop, 6 tablet, 1 kolom mobile.
- Jarak dasar: kelipatan `4px`; jarak antar elemen umum `16px`, `24px`, dan
  `32px`.
- Padding halaman: `24px` desktop, `16px` mobile.
- Tabel boleh horizontal scroll di mobile; jangan mengecilkan angka sampai
  sulit dibaca.

### Motif visual

Motif boleh memakai garis lengkung, bentuk biji kurma abstrak, atau titik
geometris dengan opacity maksimal 8%. Motif hanya ditempatkan di ruang kosong
seperti header atau empty state. Jangan menaruh tekstur, gradient, atau motif
di belakang KPI, tabel, form, atau teks penting.

## 5. Komponen inti

### Sidebar dan navigasi

- Sidebar berwarna `brand-espresso` dengan logo terang dan label yang tenang.
- Navigasi aktif memakai `brand-olive` sebagai indikator yang jelas dan
  `brand-olive` versi soft sebagai bidang aktif; jangan mengandalkan garis kecil
  saja.
- Group navigasi memiliki label yang stabil: Ringkasan, Layanan pelanggan, Data
  toko, dan Sistem.
- Role switcher selalu menjelaskan mode aktif dan dampaknya.
- Di mobile, sidebar menjadi drawer dengan backdrop dan tombol tutup yang jelas.

### Button

| Variant | Gaya | Penggunaan |
|---|---|---|
| Primary | Biru solid, teks putih | Aksi utama yang menyelesaikan tugas |
| Secondary | Putih, border cokelat muda | Aksi pendamping |
| Warm | Kuning kurma, teks cokelat | Highlight produk atau aksi ramah |
| Ghost | Transparan, teks cokelat/biru | Aksi ringan dan toolbar |
| Danger | Merah solid atau outline | Hapus, batalkan, eskalasi berisiko |

Semua tombol memakai radius `10px`, tinggi minimum `40px`, padding horizontal
`16px`, dan state hover/focus/disabled yang eksplisit. Label tombol harus
berupa kata kerja.

### Card dan panel

- Card default: surface putih, border `line`, radius `16px`, shadow sangat
  ringan.
- Card KPI: angka terbesar di kiri, label jelas, delta atau konteks di bawah.
- Card highlight: gunakan `surface-warm` atau `blue-soft`, hanya untuk satu
  pesan prioritas.
- Panel Jev memakai border biru lembut dan label “Rekomendasi Jev”; harus
  dibedakan jelas dari keputusan mesin aturan.
- Jangan menjadikan setiap card berwarna berbeda.

### Status, badge, dan alert

Badge selalu terdiri dari warna + teks. Contoh: `Stok aman`, `Perlu diperiksa`,
`Keluhan`, `Belum lengkap`, `Mode aturan`.

Alert memiliki:

1. ikon semantik,
2. judul singkat,
3. penjelasan satu kalimat,
4. tindakan perbaikan bila tersedia.

### Tabel dan data finansial

- Header tabel memakai `brown-soft`, uppercase kecil, dan label yang ringkas.
- Baris memakai zebra yang sangat halus hanya bila tabel panjang.
- Angka rata kanan; nama produk dan status rata kiri.
- Baris hover memakai `blue-soft` tipis.
- Nilai negatif memakai `danger`; nilai positif tidak perlu selalu hijau.
- Tooltip atau detail drawer menjelaskan sumber perhitungan, bukan hanya
  menampilkan angka.

### Form dan upload

- Label berada di atas input dan selalu terlihat.
- Placeholder adalah contoh format, bukan pengganti label.
- Error diletakkan dekat field dan merangkum cara memperbaikinya.
- Upload CSV memakai dropzone sederhana dengan batas file, format, dan contoh
  template yang terlihat.
- Alur impor memiliki tiga tahap: **Unggah**, **Periksa**, **Konfirmasi**.

## 6. Arah tiap halaman

| Halaman | Kesan utama | Prioritas visual |
|---|---|---|
| Beranda | Tenang dan informatif | KPI, risiko hari ini, dan tindakan berikutnya |
| Workspace CS | Cepat dan fokus | Pesan, keputusan, draft, dan bukti |
| Keluhan & eskalasi | Aman dan terkendali | Prioritas, SLA, nomor pesanan, status |
| Produk & Stok | Rapi dan dapat dipercaya | Foto/nama, stok terbaru, freshness, peringatan |
| Laba Kontribusi | Presisi dan profesional | LK I/LK II, sumber angka, filter periode |
| Pengaturan & audit | Transparan | Provider Jev, aturan, riwayat perubahan |
| Bukti demo | Meyakinkan | Golden set, metrik, dan penjelasan metodologi |

Setiap halaman harus menjawab tiga pertanyaan tanpa membuka modal:

1. Saya sedang melihat apa?
2. Apa yang perlu saya perhatikan?
3. Tindakan apa yang paling tepat sekarang?

## 7. Motion, feedback, dan state

- Transisi standar `160–220ms`, easing halus, tanpa animasi berulang.
- Gunakan rise/fade pendek hanya untuk feedback setelah aksi.
- Jangan gunakan hover scale besar, confetti, parallax, atau efek glassmorphism.
- Loading state memakai skeleton yang mengikuti struktur konten.
- Empty state menjelaskan mengapa kosong dan menawarkan satu tindakan.
- Error state tidak boleh tampak seperti data nol.
- Setelah aksi berhasil, tampilkan toast singkat dan perubahan state yang terlihat.

## 8. Token implementasi

Semua komponen baru wajib memakai token berikut melalui CSS variables atau
Tailwind, bukan hex/radius/font inline:

```css
--canvas: #FFFDF7;
--surface: #FFFFFF;
--surface-warm: #FFF8DC;
--brand-olive: #71843F;
--brand-sand: #DCCBA8;
--brand-espresso: #2B211B;
--ink-950: #2B211B;
--ink-800: #513B32;
--ink-600: #786860;
--line: #E9E1D2;
--line-strong: #D8CBB7;
--blue-soft: #E9EDFF;
--brown-soft: #F3ECE3;
--success: #1D6B45;
--warning: #936A00;
--danger: #B33A35;
--info: #2458A6;
--radius-sm: 10px;
--radius-md: 12px;
--radius-lg: 16px;
--shadow-card: 0 1px 3px rgba(58, 31, 24, 0.06);
--shadow-pop: 0 16px 40px rgba(58, 31, 24, 0.16);
--font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
--font-display: "Bricolage Grotesque", var(--font-sans);
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

Token shadcn/Tailwind seperti `background`, `primary`, `sidebar`, `border`,
`ring`, dan `accent` harus memetakan ke token di atas. Perubahan token global
lebih disukai daripada override per komponen.

## 9. Checklist sebelum rilis

- [ ] Palet hanya memakai peran warna yang didefinisikan di dokumen ini.
- [ ] Tombol utama memakai `brand-olive`, bukan warna pasir.
- [ ] Kontras teks, focus state, dan target sentuh sudah memenuhi aturan.
- [ ] Tidak ada gradient dekoratif di belakang angka atau tabel.
- [ ] Setiap status memiliki label teks selain warna.
- [ ] Mobile dapat mengakses navigasi, tabel, upload, dan dialog.
- [ ] Loading, empty, error, disabled, hover, dan focus state sudah dirancang.
- [ ] Kartu KPI dapat dipindai dalam kurang dari lima detik.
- [ ] Copy memakai bahasa Indonesia yang jelas dan kata kerja yang konsisten.
- [ ] Jev tampil sebagai rekomendasi/pendapat kedua, bukan sebagai sumber
  kebenaran atau pengganti keputusan staf.
