# KOMPAS — Connected Operations & Margin Intelligence

Asisten layanan pelanggan + mesin Laba Kontribusi untuk Toko Husin (oleh-oleh haji).
Semua data adalah **SIMULASI / DATA DUMMY**. Fungsi minimum berjalan tanpa internet
dan tanpa AI berbayar; Jev (AI) opsional dan mati bawaan.

| Modul | Halaman | Fitur proposal |
|---|---|---|
| Workspace CS | `/asisten` | F2 Jalur B (Ctrl+V → draf → Enter), F3 Mode Antrean (J/K/Enter/E/1–3), F7 Paket template Jalur A, F4 klasifikasi 3 kelas, F5 batas kirim |
| Keluhan & eskalasi | `/keluhan` | F6 tiket otomatis + nomor pesanan |
| Produk & Stok | `/produk` | F1 Product Brain, stok bercap waktu, peringatan stok >24 jam |
| Laba Kontribusi | `/laba` | F8 impor + pembersih C1–C6, F9 LK I/LK II + harga impas, F10 dasbor per SKU/kanal/periode |
| Pengaturan & audit | `/pengaturan` | aturan fee berperiode, log audit, status Jev |
| Bukti | `/demo/bukti` | F12 Golden Set |

## Menjalankan

Butuh Python 3.9+ dan Node.js 18.17+. Dari root repositori:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Terminal lain:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Buka <http://localhost:3000>. Basis data demo (`backend/kompas.db`) dibuat dan diisi
otomatis saat backend pertama kali menyala. Untuk kembali ke kondisi awal: hentikan
backend, hapus `backend/kompas.db`, nyalakan lagi.

## Role dan hak akses

Role ditentukan oleh akun saat login, bukan dipilih atau diganti dari sidebar. Sidebar hanya
menampilkan menu yang sesuai dengan role akun, sedangkan backend tetap memeriksa role pada
setiap endpoint. Karena itu, menyembunyikan menu tidak menjadi satu-satunya lapisan keamanan.

| Role | Tanggung jawab utama | Akses utama |
|---|---|---|
| **Owner** | Pemilik toko dan pengambil keputusan akhir. | Seluruh dashboard, laba dan modal, aturan fee, audit, persetujuan pengajuan akun, perubahan role pengguna, serta reset data demo ketika mode demo aktif. |
| **Manager** | Mengawasi operasional harian dan rekonsiliasi. | Dashboard, Workspace CS, keluhan, produk/stok, laba dan modal, aturan fee, serta audit. Tidak dapat mengelola akun pengguna atau menurunkan role owner. |
| **CS** | Menangani komunikasi pelanggan. | Workspace CS, analisis chat Jev/aturan, pembuatan draft jawaban, antrean chat, dan eskalasi keluhan. Tidak dapat melihat modal, margin, laba, aturan fee, atau audit finansial. |
| **Packing** | Menjalankan proses gudang dan pengemasan. | Produk dan stok, pemantauan operasional, serta informasi yang diperlukan untuk pemenuhan pesanan. Tidak dapat melihat modal, margin, laba, aturan fee, atau audit finansial. |
| **Judge** | Mengevaluasi kualitas keputusan sistem. | Dashboard, data evaluasi/golden set, laba dan modal untuk kebutuhan evaluasi, aturan fee dan audit. Tidak dapat menyetujui pengajuan akun atau mengelola role pengguna. |

### Alur akun dan role

1. Pengguna baru mengirim pengajuan akses melalui `/daftar` dengan nama, email, password,
   dan role yang diminta.
2. Pengajuan berstatus **PENDING** dan belum dapat digunakan untuk login.
3. Owner membuka `/pengaturan`, meninjau pengajuan, lalu menyetujui atau menolaknya.
4. Jika disetujui, akun dibuat dengan role yang ditetapkan owner. Jika ditolak, akun tidak
   dibuat.
5. Owner dapat mengubah role pengguna dari panel **Akun & Pengajuan**. Owner tidak dapat
   menurunkan role akun owner yang sedang digunakan.
6. Saat login, role diambil dari database. Tidak ada pemilih role dan tidak ada perpindahan
   role langsung dari dashboard. Logout menghapus sesi dan mengembalikan pengguna ke `/masuk`.

Pembatasan finansial berlaku di server: role CS dan Packing menerima HTTP 403 ketika
mencoba mengakses modal, margin, laba, atau aturan fee; percobaan penolakan dicatat pada
audit log.

## AI opsional: Jev lewat OpenRouter

Jev (TypeSafe) adalah model keputusan bertipe; KOMPAS memakainya hanya sebagai
**pendapat kedua** untuk pesan yang menurut mesin aturan masih "umum".

1. Buat API key di <https://openrouter.ai/keys>.
2. Taruh di **`backend/.env`** (bukan di frontend, bukan di kode):

   ```
   JEV_ENABLED=true
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
   JEV_MODEL=typesafe/jev-1.14
   ```

3. Restart backend. Lencana di header berubah dari "Mode aturan" menjadi "Aturan + Jev";
   detailnya ada di Pengaturan.

`backend/.env` sudah di-`.gitignore`. Jangan pernah commit key asli.

Cara kerjanya (`backend/app/services/jev.py`, dipanggil dari `chat_engine.analyze`):

- Request `POST https://openrouter.ai/api/alpha/decisions` dengan 3 pertanyaan bertipe:
  `kategori` (choice: umum / belum_pasti / keluhan), `injeksi` (noul), `urgensi` (score 0-3).
  Nomor HP dan rekening disamarkan sebelum dikirim.
- **Panel "Keputusan Jev"** di Workspace CS dan Mode Antrean menampilkan probabilitas tiap
  kategori, skor instruksi tersembunyi, urgensi, latensi, biaya, dan kalimat efeknya
  ("Jev MENAIKKAN pesan ini ke keluhan" / "Jev setuju dengan mesin aturan").
  Kotak **Uji Jev** di Pengaturan melempar satu pesan tanpa menyimpan apa pun.
- Batas 2 detik + 1x ulang. Gagal: hasil mesin aturan dipakai. 3 kegagalan beruntun: jeda 10 menit.
- Jev **hanya boleh menaikkan kewaspadaan**, dan hanya bila probabilitas >= 80%
  (`JEV_RAISE_THRESHOLD`, dikalibrasi dari 100 panggilan Jev asli). Jev tidak pernah menulis
  draf atau menghitung uang.
- Kontrol biaya: cache pesan identik 10 menit, batas 120 panggilan/menit, statistik pemakaian
  dan biaya di Pengaturan. Mode Antrean memanggil Jev paralel (20 pesan sekitar 3 detik).

Hasil terukur dengan Jev asli (`typesafe/jev-1.14`): Golden Set 100 = 99/100; pesan bergaya
baru yang tidak dikenali aturan: keluhan lolos sebagai umum turun dari 5 menjadi 0 (dari 24 pesan);
rata-rata 615-775 ms dan sekitar Rp0,5 per panggilan.

## Kalkulasi laba dari CSV

Ya: cukup unggah CSV/XLSX di `/laba` → periksa pemetaan kolom → **Konfirmasi**. Laba
Kontribusi langsung dihitung ulang. Contoh siap pakai:

- `data/demo/contoh_csv/demo_transaksi_husin_nov2026.csv` — 42 baris, 3 kanal, 10–16 Nov 2026.
- `data/demo/contoh_csv/demo_laporan_berantakan.csv` — uji pembersih (header bergeser,
  baris Total/Catatan, sel `=HYPERLINK`, duplikat, SKU asing).
- Template kosong: tombol **Template CSV** di `/laba`.

Kolom (header bahasa Indonesia/Inggris dikenali otomatis; * wajib):

| Kolom | Isi |
|---|---|
| No. Pesanan* | Nomor pesanan. Pesanan multi-SKU memakai nomor yang sama di beberapa baris |
| Tanggal Pesanan* | `YYYY-MM-DD` atau `DD/MM/YYYY` |
| Marketplace | `Shopee` / `TikTok Shop` / `Lazada` (atau pilih kanal saat unggah) |
| SKU* | Harus sama dengan SKU katalog, mis. `KRM-AJW-250` |
| Jumlah* | Kuantitas |
| Subtotal* | Omzet baris = harga × jumlah |
| Diskon Penjual, Refund | Rupiah; `Rp1.250`, `(1.250)`, dan `-` dibaca benar |
| Komisi, Biaya Admin, Ongkir Penjual, Logistik Retur, Biaya Lain | Potongan marketplace |
| Biaya Packing | Kosong → LK II "Belum lengkap" (tidak dianggap nol) |
| HPP (opsional) | Kosong → modal diambil dari katalog Product Brain × jumlah |

Rumus (proposal Tabel 3.3): **Dana dilepas** = omzet − diskon − refund − komisi − biaya
admin − ongkir penjual − logistik retur − biaya lain; **LK I** = dana dilepas − modal;
**LK II** = LK I − packing; **harga impas** = modal ÷ (1 − tingkat potongan SKU). Biaya
admin pesanan multi-SKU yang tercantum di satu baris dialokasikan ke semua SKU sesuai
nilai produk (selisih Rp0).

## Verifikasi

```bash
python -m pytest backend/tests -q
python backend/scripts/test_direct.py
```

Termasuk Golden Set 100 percakapan dari Lampiran 3 proposal (`test_golden100.py`) dan
uji adaptor Jev tanpa jaringan (`test_jev.py`).

## Produksi

Set `DEMO_MODE=false` di `backend/.env` dan `NEXT_PUBLIC_DEMO_MODE=false` di `frontend/.env.local`:

- Backend **menolak menyala** bila `SESSION_SECRET` masih nilai contoh / kurang dari 32 karakter,
  `SEED_USER_PASSWORD` kosong, atau `ALLOWED_ORIGINS` berisi `*`.
- Pemilih role tanpa kata sandi dinonaktifkan (HTTP 403); login memakai `/masuk` dengan
  username `owner`, `manager`, `cs`, `packing`, atau `judge` dan `SEED_USER_PASSWORD` sebagai
  kata sandi awal. Role mengikuti akun yang berhasil login. Login dibatasi 5 kegagalan per
  5 menit.
- Atur `ALLOWED_ORIGINS` ke origin frontend sebenarnya, dan pakai PostgreSQL lewat `DATABASE_URL`.
- Data seed adalah data dummy; kosongkan atau ganti sebelum dipakai untuk toko nyata.
