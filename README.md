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

Mode kerja (Owner/Manager/CS/Packing/Judge) dipilih di sidebar. Server menegakkan hak
akses: CS dan Packing mendapat HTTP 403 untuk modal, margin, dan laba (tercatat di audit).

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

- Request `POST https://openrouter.ai/api/alpha/decisions` dengan 4 pertanyaan bertipe:
  `kategori` (choice: umum / belum_pasti / keluhan), `injeksi` (noul), `perlu_staf` (noul),
  `urgensi` (score 0–3). Nomor HP dan rekening disamarkan sebelum dikirim.
- Batas 2 detik + 1× ulang. Gagal → hasil mesin aturan dipakai apa adanya.
- 3 kegagalan beruntun → Jev dijeda 10 menit (pemutus sirkuit), lencana "Mode aturan".
- Jev **hanya boleh menaikkan kewaspadaan**: umum → belum pasti (eskalasi) atau keluhan
  (probabilitas ≥ 0,6). Jev tidak dipanggil bila aturan sudah mendeteksi keluhan,
  klaim berisiko, atau instruksi tersembunyi; Jev tidak pernah menulis draf atau
  menghitung uang.

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

## Catatan produksi

- Ganti `SESSION_SECRET` (≥32 karakter), set `DEMO_MODE=false`, dan pakai PostgreSQL via `DATABASE_URL`.
- Atur `ALLOWED_ORIGINS` ke origin frontend yang sebenarnya.
- Login demo (`/api/auth/switch-role`) hanya untuk demo; ganti dengan login berkata sandi sebelum dipakai sungguhan.
