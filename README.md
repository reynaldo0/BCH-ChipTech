# KOMPAS — Connected Operations & Margin Intelligence

Asisten layanan pelanggan dan mesin Laba Kontribusi untuk **Toko Husin** (oleh-oleh haji),
dibuat untuk COMPARE 2026. Semua data adalah **simulasi / data dummy**.

Fungsi minimum berjalan tanpa internet dan tanpa AI berbayar. Jev (AI) bersifat opsional dan mati bawaan.

## Masalah yang diselesaikan

- Pertanyaan CS yang berulang di Shopee, TikTok Shop, dan Lazada.
- Keuntungan per produk dan per marketplace yang belum terlihat.

## Fitur

| Modul | Halaman | Isi |
|---|---|---|
| Workspace CS | `/asisten` | Draf jawaban dari chat (Ctrl+V), Mode Antrean (J/K/Enter/E/1–3), paket template, klasifikasi 3 kelas, batas kirim |
| Keluhan & eskalasi | `/keluhan` | Tiket otomatis dengan nomor pesanan |
| Produk & Stok | `/produk` | Product Brain, stok bercap waktu, peringatan stok >24 jam |
| Laba Kontribusi | `/laba` | Impor CSV/XLSX + pembersih, LK I / LK II, harga impas, dasbor per SKU/kanal/periode |
| Pengaturan & audit | `/pengaturan` | Aturan fee berperiode, log audit, status Jev, persetujuan akun |
| Bukti | `/demo/bukti` | Golden Set 100 percakapan |

## Teknologi

- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2.0 (SQLite lokal, MySQL produksi)
- **Frontend:** Next.js, Tailwind CSS
- **Perhitungan uang:** Python `decimal.Decimal`
- **AI opsional:** Jev (TypeSafe) via OpenRouter
- **Deploy:** Docker Compose, Nginx, Vercel

## Menjalankan

Prasyarat: Python 3.9+ dan Node.js 18.17+.

Backend (dari root repositori):

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend (terminal lain):

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Buka <http://localhost:3000>. Dokumentasi API ada di <http://127.0.0.1:8000/docs>.
Database demo (`backend/kompas.db`) dibuat otomatis; untuk reset, hentikan backend, hapus file itu, lalu nyalakan lagi.

## Akun demo

Password semua akun: `kompas123`

| Username | Role | Akses utama |
|---|---|---|
| `owner` | Owner | Semua modul, persetujuan akun, reset demo |
| `manager` | Manager | Operasional, laba, aturan fee, audit |
| `cs` | CS | Workspace CS, keluhan (tanpa data laba) |
| `packing` | Packing | Produk dan stok (tanpa data laba) |
| `judge` | Judge | Evaluasi, Golden Set, laba, audit |

## Mengaktifkan Jev (opsional)

Isi `backend/.env`, lalu restart backend:

```
JEV_ENABLED=true
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
JEV_MODEL=typesafe/jev-1.14
```

Jev hanya menaikkan kewaspadaan klasifikasi (ambang 80%); tidak menulis draf dan tidak menghitung uang.
Jangan commit API key.

## Hitung laba dari CSV

Buka `/laba`, unggah CSV/XLSX, periksa pemetaan kolom, lalu konfirmasi. Contoh file ada di `data/demo/contoh_csv/`.

- **Dana dilepas** = omzet − diskon − refund − komisi − biaya admin − ongkir penjual − logistik retur − biaya lain
- **LK I** = dana dilepas − modal
- **LK II** = LK I − biaya packing
- **Harga impas** = modal ÷ (1 − tingkat potongan SKU)

## Pengujian

```bash
python -m pytest backend/tests -q
python backend/scripts/test_direct.py
```

Hasil Golden Set 100 percakapan: 99/100 dengan Jev aktif.

## Produksi

Set `DEMO_MODE=false` (backend) dan `NEXT_PUBLIC_DEMO_MODE=false` (frontend). Backend menolak menyala bila
`SESSION_SECRET` lemah, `SEED_USER_PASSWORD` kosong, atau `ALLOWED_ORIGINS` berisi `*`.
Langkah deploy lengkap ada di `deploy/README.md`.

## Struktur repositori

```
backend/    FastAPI (routers, services, models, tests)
frontend/   Next.js (halaman, komponen)
csv/        Data dummy katalog, FAQ, chat, operasional
data/demo/  Transaksi demo, aturan fee, Golden Set
deploy/     Panduan dan contoh env produksi
docs/       Requirement, desain, tech stack, audit
```

## Dokumen terkait

`docs/REQUIREMENT.md` · `docs/DESIGN.md` · `docs/TECHSTACK.md` · `docs/AUDIT.md` · `deploy/README.md`
