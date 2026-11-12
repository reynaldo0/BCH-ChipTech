# KOMPAS UI Design Direction

Dokumen ini menerjemahkan gaya visual dari portofolio pemilik proyek ke alat
kerja KOMPAS. Portofolio menjadi sumber gaya; struktur, copy, dan aturan data
tetap mengikuti spesifikasi KOMPAS.

## 1. Ekstraksi gaya portofolio

### Font

- **Bricolage Grotesque**: font grotesque utama untuk teks antarmuka dan judul.
- **PP Neue Montreal**: font lokal untuk teks display/label yang lebih editorial.
- **PP Neue Montreal Mono**: label teknis, metadata, dan angka sekunder.
- **Instrument Serif**: aksen editorial/serif pada portofolio, tidak dipakai untuk
  angka finansial KOMPAS.
- Portofolio memuat Bricolage Grotesque dan Instrument Serif melalui
  `next/font/google`, serta PP Neue Montreal melalui `next/font/local`.
- Asset font PP Neue Montreal tersedia di arsip portofolio, tetapi belum menjadi
  asset di project KOMPAS. Sebelum implementasi, perlu diputuskan apakah font
  tersebut disalin ke `frontend/public/fonts/` atau diganti padanan sistem.

### Palet

| Peran | Nilai | Catatan penggunaan di KOMPAS |
|---|---|---|
| Latar canvas | `#F6F8F5` | Latar utama dashboard |
| Permukaan | `#FFFFFF` | Kartu, panel, tabel |
| Permukaan muted | `#F8FAF8` | Header tabel, kontrol sekunder |
| Teks utama | `#172629` | Judul dan angka utama |
| Teks isi | `#223438` | Isi tabel dan deskripsi |
| Teks sekunder | `#65777A` | Metadata, penjelasan, label |
| Border | `#E4E9E5` | Border default |
| Border kuat | `#D6DEDA` | Input dan pemisah penting |
| Aksen utama | `#246B6B` | Tombol primer, navigasi aktif, tautan |
| Aksen terang | `#45958D` | Focus ring dan state interaksi |
| Aksen lembut | `#DDECE7` | Selected state tanpa memenuhi layar |
| Sukses | `#23634B` / `#EAF4EE` | Status selesai/terverifikasi |
| Peringatan | `#80551B` / `#FBF2DF` | Perlu perhatian |
| Bahaya | `#9A3F3B` / `#F9EAE8` | Risiko/eskalasi |
| Informasi | `#355D7A` / `#EAF1F6` | Informasi netral |
| Channel Shopee | `#D66A45` | Hanya ketika channel perlu dibedakan |
| Channel TikTok | `#34424A` | Hanya ketika channel perlu dibedakan |
| Channel Lazada | `#5D68B5` | Hanya ketika channel perlu dibedakan |

Warna channel bukan warna dekoratif global. Warna semantik hanya digunakan
untuk status, bukan untuk menghias setiap kartu.

### Bentuk, border, bayangan, dan spasi

- Radius default portofolio: `8px` untuk kontrol/kartu kecil, `12px` untuk
  panel, dan sampai `16px` untuk panel besar atau drawer.
- Border tipis dan rendah kontras (`#E4E9E5`); tidak memakai outline tebal
  sebagai dekorasi.
- Bayangan ringan untuk kartu (`0 1px 2px rgba(23, 38, 41, 0.04)`); bayangan
  lebih kuat hanya untuk drawer/dialog.
- Spasi dasar berbasis kelipatan `4px`, dengan jarak konten umum `16px`,
  `24px`, dan `32px`.
- Portofolio memakai frame/grid dan titik sebagai motif. Untuk KOMPAS, motif
  hanya boleh menjadi latar sangat ringan dan tidak boleh berada di belakang
  angka atau mengurangi keterbacaan.

### Ikon, tombol, kartu, navigasi

- Ikon portofolio bersifat utilitarian, garis sederhana, dan ditempatkan dekat
  label. KOMPAS memakai ikon garis monokrom; ikon tidak boleh menjadi identitas
  dekoratif.
- Tombol utama berbentuk compact, radius sedang, kontras jelas, dan memiliki
  focus ring. Tombol memakai kata kerja, bukan label teknis.
- Kartu memakai permukaan putih, border tipis, padding konsisten, dan hierarki
  tipografi; tidak setiap kartu diberi warna latar berbeda.
- Navigasi portofolio cenderung editorial dengan pemisah dan label yang tenang.
  KOMPAS menerjemahkannya menjadi sidebar kerja yang ringkas dengan satu aksen
  teal dan active state yang jelas.
- Motion dibatasi pada transisi state pendek. Tidak ada animasi masuk yang
  menunda pembacaan KPI atau animasi dekoratif berulang.

### Karakter visual

KOMPAS harus terasa tenang, editorial, dan terukur. Kontras dibangun lewat
ukuran, bobot, dan ruang, bukan banyak warna. Permukaan bersih dan border tipis
menjaga kepadatan informasi tetap terbaca. Label metadata boleh memakai nuansa
mono dari portofolio, tetapi angka bisnis tetap mudah dipindai. Interaksi terasa
cepat dan sederhana, bukan seperti halaman marketing.

## 2. Yang diwarisi dan tidak diwarisi

| Diwarisi ke KOMPAS | Tidak diwarisi | Alasan |
|---|---|---|
| Bricolage Grotesque/PP Neue Montreal sebagai arah tipografi | Hero besar dan layout presentasi | KOMPAS adalah alat kerja, bukan halaman portofolio |
| Canvas ivory pucat, permukaan putih, teks gelap | Gradien dekoratif | Bertentangan dengan Do's and Don'ts dan mengurangi hierarki |
| Border tipis, radius sedang, bayangan ringan | Backdrop blur/glassmorphism | Mengurangi kejelasan tabel dan status |
| Aksen teal tunggal dan status semantik | Banyak aksen biru/ungu/kuning pada semua kartu | Menyebabkan alarm fatigue |
| Label mono untuk metadata seperlunya | Serif dekoratif untuk KPI | Angka finansial harus netral dan mudah dibaca |
| Frame/grid yang sangat halus | Dither/tekstur di belakang angka | Angka harus menjadi fokus utama |
| Transisi pendek pada state | Hover scale besar dan motion showcase | Memperlambat demo 3–4 menit |
| Kartu editorial padat | Polaroid, gambar makanan, carousel, dan 3D | Tidak relevan dengan keputusan operasional |
| Ikon garis utilitarian | Ikon petir, sparkles, roket, atau ikon identitas dekoratif | Tidak memiliki makna bagi pemilik toko |

## 3. Pertentangan yang harus disetujui

1. Portofolio memakai grid/titik dan beberapa efek gradien/tekstur, sedangkan
   spesifikasi KOMPAS melarang gradien dekoratif dan watermark. Rekomendasi:
   gunakan hanya garis frame atau titik yang sangat tipis di area kosong, tanpa
   gradien dan tanpa lapisan di belakang angka.
2. Portofolio menggunakan Bricolage Grotesque dan PP Neue Montreal, sementara
   asset PP Neue Montreal belum ada di KOMPAS. Rekomendasi: salin dua file font
   lokal ke `frontend/public/fonts/` agar hasil demo deterministik; fallback
   tetap Inter/system sans.
3. Portofolio memiliki warna biru sebagai link dan beberapa aksen, sedangkan
   spesifikasi KOMPAS meminta satu aksen utama. Rekomendasi: teal menjadi satu
   aksen UI; biru hanya dipertahankan bila diperlukan untuk status informasi.
4. Portofolio memakai motion dan beberapa komponen interaktif presentasional.
   Rekomendasi: KOMPAS hanya memakai transisi 160–220ms dan menghormati
   `prefers-reduced-motion`.

## 4. Token implementasi yang direncanakan

Semua komponen baru harus memakai token berikut melalui CSS variables/Tailwind,
bukan hex/radius/font inline:

- `--canvas`, `--surface`, `--surface-muted`
- `--ink-950`, `--ink-900`, `--ink-600`
- `--line`, `--line-strong`, `--line-soft`
- `--brand-700`, `--brand-500`, `--brand-100`
- `--success`, `--warning`, `--danger`, `--info` beserta background/border
- `--radius-sm`, `--radius-md`, `--radius-lg`
- `--shadow-card`, `--shadow-pop`
- `--font-sans`, `--font-display`, `--font-mono`
