# DESIGN.md
# KOMPAS — Product Design System & Experience Specification
**Visual direction: Modern Operational Intelligence | Versi 1.0**

---

## 1. Design intent

KOMPAS harus terasa seperti produk SaaS operasional yang matang: presisi seperti financial dashboard, mudah dipahami seperti customer-support workspace, dan hangat seperti brand UMKM yang melayani kebutuhan sehari-hari.

**Karakter visual**
- Professional, calm, clear, confident.
- Warm-neutral canvas dengan aksen deep teal.
- Data-dense tetapi tidak sesak.
- Editorial hierarchy: judul kuat, angka mudah dipindai, label ringkas.
- Surface bersih, border halus, shadow sangat ringan.
- Tidak menggunakan glassmorphism berlebihan, gradient dekoratif, neon, atau kartu berlapis tanpa alasan.
- Tidak meniru tampilan marketplace.
- Tidak menggunakan foto makanan/stock imagery sebagai dekorasi dashboard.

**Prinsip utama:** kejelasan data lebih penting daripada dekorasi. Setiap warna, badge, chart, dan animasi harus membantu pengguna memahami status atau mengambil tindakan.

## 2. Brand and visual concept

### 2.1 Brand expression
- Nama: **KOMPAS**
- Kepanjangan: **Connected Operations & Margin Intelligence**
- Metafora: kompas membantu tim menemukan arah dari sinyal operasional dan angka margin.
- Logo direction: wordmark KOMPAS dengan simbol kompas minimalis/empat arah; jangan memakai logo marketplace atau logo mitra tanpa izin.
- Tagline internal: **Satu sumber data. Dua mesin kerja. Keputusan lebih terarah.**

### 2.2 Visual anchor
Gunakan kombinasi:
- Deep teal sebagai warna identitas dan navigasi aktif.
- Warm ivory sebagai latar utama.
- Slate ink untuk teks.
- Muted sage untuk status positif.
- Amber untuk perhatian/ketidakpastian.
- Muted red untuk error/risiko/eskalasi.
- Blue-gray untuk informasi netral.

### 2.3 Logo usage
- Primary: simbol + wordmark horizontal di sidebar.
- Compact: simbol saja pada sidebar collapsed.
- Minimum clear space: tinggi simbol.
- Jangan memodifikasi proporsi atau menambahkan efek 3D.
- Untuk halaman login, gunakan wordmark sederhana di atas panel form.

---

## 3. Color palette

### 3.1 Core palette
| Token | Hex | Penggunaan |
|---|---|---|
| `brand-950` | `#102F32` | Sidebar, dark anchor, high emphasis |
| `brand-900` | `#153F42` | Primary dark |
| `brand-800` | `#1C5557` | Hover/dark surface |
| `brand-700` | `#246B6B` | Primary action |
| `brand-600` | `#2F807D` | Primary interactive |
| `brand-500` | `#45958D` | Accent |
| `brand-100` | `#DDECE7` | Soft accent surface |
| `brand-50` | `#F0F6F3` | Selected subtle background |

### 3.2 Neutral palette
| Token | Hex | Penggunaan |
|---|---|---|
| `ink-950` | `#172629` | Heading utama |
| `ink-900` | `#223438` | Body utama |
| `ink-700` | `#526468` | Secondary text |
| `ink-600` | `#65777A` | Muted text |
| `ink-500` | `#849295` | Placeholder/disabled text |
| `line-strong` | `#D6DEDA` | Border kuat |
| `line` | `#E4E9E5` | Border standar |
| `line-soft` | `#EDF1EE` | Divider halus |
| `surface` | `#FFFFFF` | Card, table, dialog |
| `canvas` | `#F6F8F5` | App background |
| `canvas-warm` | `#F3F4EE` | Secondary warm panel |
| `surface-muted` | `#F8FAF8` | Input/hover surface |

### 3.3 Semantic palette
| Semantic | Foreground | Background | Border | Makna |
|---|---|---|---|---|
| Success | `#23634B` | `#EAF4EE` | `#CDE4D5` | Lengkap, selesai, terverifikasi |
| Warning | `#80551B` | `#FBF2DF` | `#EEDDB7` | Parsial, perlu pemeriksaan |
| Danger | `#9A3F3B` | `#F9EAE8` | `#EBCBC7` | Error, risiko, eskalasi |
| Info | `#355D7A` | `#EAF1F6` | `#CFDFEA` | Informasi, simulasi |
| Neutral | `#536267` | `#EFF2F0` | `#DCE3DF` | Draft, belum diproses |

### 3.4 Marketplace colors
Marketplace colors hanya dipakai sebagai penanda identitas pada chart/legend/filter, bukan sebagai warna dominan:
| Marketplace | Color |
|---|---|
| Shopee | `#D66A45` |
| TikTok Shop | `#34424A` |
| Lazada | `#5D68B5` |

Jangan menggunakan logo resmi tanpa aset dan izin yang sesuai. Warna dapat tampil sebagai dot/strip kecil disertai label.

### 3.5 Chart palette
- Revenue: `#2F807D`
- Cost: `#D7A35B`
- Profit: `#4F8A69`
- Refund/return: `#B96B67`
- Neutral series: `#8A9A9A`
- Grid: `#E8EDE9`

Chart tidak boleh mengandalkan warna saja; gunakan label, legend, dan tooltip. Hindari 3D, donut berlapis, gradient fill berlebihan, serta animasi chart yang menghambat pembacaan.

### 3.6 Dark mode
Dark mode boleh disiapkan sebagai fase lanjutan, bukan syarat MVP. Jika dibuat:
- Background: `#101B1D`.
- Surface: `#172629`.
- Elevated surface: `#1D3032`.
- Text: `#E8F0EC`.
- Border: `#2B4142`.
- Jaga kontras semantic colors; jangan sekadar membalik warna light mode.

---

## 4. Typography

### 4.1 Font
- Primary: **Inter** (self-hosted subset/variable jika lisensi dan file tersedia) atau system sans stack.
- Fallback: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Angka tabular: gunakan `font-variant-numeric: tabular-nums`.
- Hindari font display dekoratif untuk angka keuangan.

### 4.2 Type scale
| Style | Size | Weight | Line height | Penggunaan |
|---|---:|---:|---:|---|
| Display | 32–36 px | 650–700 | 1.1 | Headline halaman utama tertentu |
| H1 | 28 px | 650 | 1.2 | Judul halaman |
| H2 | 22 px | 650 | 1.25 | Judul section |
| H3 | 16 px | 600 | 1.35 | Card/section title |
| Body | 14 px | 400 | 1.55 | Teks utama dashboard |
| Body small | 13 px | 400 | 1.5 | Helper text, tabel |
| Label | 12 px | 550 | 1.3 | Form label, metadata |
| Caption | 11 px | 450 | 1.4 | Timestamp, footnote |

- Hindari teks utama di bawah 13 px.
- Label tabel harus tetap terbaca.
- Heading tidak perlu semua uppercase.
- Currency dan angka penting menggunakan tabular numerals.

---

## 5. Layout, grid, and spacing

### 5.1 App shell
Desktop:
- Sidebar fixed: 248 px expanded; 76 px collapsed.
- Topbar: 64–72 px.
- Main content max-width: 1440 px; padding horizontal 28–32 px.
- Background canvas `canvas`.
- Content sections memakai jarak vertikal 24–32 px.

Tablet:
- Sidebar menjadi drawer.
- Main padding 20–24 px.
- KPI grid 2 kolom.

Mobile:
- Sidebar menjadi navigation drawer.
- Topbar ringkas.
- Main padding 16 px.
- KPI grid 1–2 kolom sesuai lebar.
- Tabel kompleks menjadi card rows atau horizontal table dengan affordance yang jelas; jangan mengecilkan font secara ekstrem.

### 5.2 Spacing scale
Gunakan kelipatan 4 px:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

### 5.3 Radius
| Token | Value | Penggunaan |
|---|---:|---|
| `radius-xs` | 6 px | Small chips |
| `radius-sm` | 8 px | Inputs, compact buttons |
| `radius-md` | 12 px | Cards, dropdown |
| `radius-lg` | 16 px | Large panels |
| `radius-xl` | 20 px | Dialog besar/hero panel |
| `radius-pill` | 999 px | Status pill, avatar |

Gunakan radius secara konsisten. Jangan membuat setiap elemen berbentuk pill.

### 5.4 Elevation
- Default cards: border 1 px + no shadow atau shadow sangat halus.
- Dropdown/dialog: shadow medium, tidak terlalu gelap.
- Sticky header: border bawah.
- Hindari shadow besar pada semua card.

---

## 6. Navigation and information architecture

### 6.1 Sidebar
Order:
1. Overview
2. Chat Copilot
3. Complaint Center
4. Product Brain
5. Profit Engine
6. Insights
7. Evaluation
8. Settings & Audit

Sidebar:
- Logo dan nama KOMPAS di atas.
- Group label optional: WORKSPACE / DATA / SYSTEM.
- Active item memakai soft brand background, text brand-900, left indicator 3 px.
- Icon Lucide 18–20 px, stroke konsisten.
- Badge hanya untuk jumlah tiket/issue yang benar-benar perlu perhatian.
- Footer menampilkan demo environment badge dan profile menu.

### 6.2 Topbar
- Breadcrumb.
- Page title dapat berada di content area, bukan mengulang semua di topbar.
- Search hanya jika benar-benar memiliki pencarian lintas data.
- Period selector pada Overview/Insights.
- Notification hanya jika ada event nyata.
- Profile menu dan role indicator.
- Demo environment selalu terlihat.

### 6.3 Page header
Setiap halaman memiliki:
- Eyebrow/breadcrumb kecil.
- H1 jelas.
- Deskripsi satu kalimat.
- Primary action maksimal satu.
- Secondary action sebagai text/outline button.
- Filter berada dekat konten yang dipengaruhi.

---

## 7. Screen specifications

### 7.1 Overview — Owner dashboard
**Tujuan:** pemilik dapat memahami kondisi data dan menentukan hal yang perlu diperiksa tanpa membaca banyak tabel.

Layout:
1. Header: “Overview”, deskripsi, period selector.
2. KPI row: Penjualan bruto, Pendapatan bersih, Profit terhitung, Data lengkap.
3. Profit trend: garis/area sederhana dengan filter marketplace.
4. Marketplace comparison: tabel mini atau horizontal bar.
5. Attention panel: transaksi perlu rekonsiliasi, biaya belum tersedia, keluhan prioritas.
6. Product performance table: SKU, marketplace, penjualan, profit, margin, data status.
7. Complaint snapshot: kategori paling sering, status tiket.
8. Brief pemilik: 2–3 prioritas dengan sumber data.

KPI behavior:
- Setiap angka profit harus membawa status `Lengkap/Parsial/Perlu rekonsiliasi`.
- Jika data tidak cukup, tampilkan `—` atau `Belum tersedia`, bukan 0 palsu.
- Tooltip menjelaskan basis angka.
- Klik KPI membuka detail/filter terkait.

### 7.2 Chat Copilot — CS workspace
**Layout desktop dua kolom:**
- Left 40%: input/simulasi chat, scenario selector, sample messages.
- Right 60%: analysis result, decision state, suggested response, source evidence.
- Complaint state dapat mengambil full-width section di bawah atau panel samping.

Komponen:
- Input area dengan label “Pesan pelanggan (simulasi)”.
- Button “Analisis pesan”.
- Quick scenarios.
- Classification chip.
- Intent/entity summary.
- Decision panel: Jawab langsung / Jawab terbatas / Eskalasi.
- Draft editor.
- Evidence list: sumber, status, updated at.
- Primary action “Salin jawaban”.
- Secondary action “Buat tiket keluhan”.
- Feedback buttons: draft sesuai / perlu koreksi.
- AI disclaimer: “Draft bantuan sistem. Periksa sebelum dikirim.”

Visual hierarchy:
- Jangan tampilkan confidence sebagai angka yang memberi kesan kepastian mutlak. Jika dipakai, beri label “indikasi model” dan jelaskan.
- Keluhan harus punya alert yang jelas tetapi tidak agresif.
- Sumber harus dapat dibuka ke data Product Brain terkait.

### 7.3 Complaint Center
- Page header + filter status, severity, kategori, tanggal.
- Summary counters: Baru, Perlu perhatian, Menunggu, Selesai.
- Table columns: ID, waktu, ringkasan, kategori, SKU, severity, status, action.
- Detail drawer: isi pesan, kategori, sumber, SKU/transaksi, timeline, catatan, biaya terkonfirmasi/estimasi.
- Status action berupa menu eksplisit.
- Eskalasi memiliki label teks + icon; bukan warna merah saja.

### 7.4 Product Brain
Tab:
1. Products & Variants
2. Stock
3. Cost / Modal
4. Shipping & Capacity
5. Evidence
6. Fee Rules

Product list:
- SKU, nama, kategori, varian aktif, stok ringkas, status data, updated at.
- Search/filter.
- Create product button.
- Detail panel dengan tab per domain.
- Edit modal/drawer untuk form pendek; halaman penuh untuk data kompleks.

Status:
- Verified, Unverified, Stale, Missing, Invalid.
- Status selalu disertai teks.
- Tampilkan sumber dan last updated.

### 7.5 Profit Engine
**Flow stepper:**
1. Upload file.
2. Pilih marketplace/sheet.
3. Map columns.
4. Preview & validate.
5. Review issues.
6. Confirm import.
7. Calculation result.

Upload area:
- Drag/drop dan browse.
- Format diterima: CSV; XLSX jika implementasi tersedia.
- Batas file dan contoh template ditampilkan.
- Label: “Data dummy untuk demo”.

Mapping:
- Source column → KOMPAS field.
- Auto-suggestion boleh ada, tetapi user harus confirm.
- Required/optional marker.
- Preview sample rows.
- Unmapped columns dan required fields kosong ditampilkan.

Validation:
- Summary valid rows, invalid rows, duplicate rows, unmatched SKU.
- Error table dengan row number, field, value, reason, suggested action.
- Jangan commit otomatis.

Result:
- Summary KPI.
- Profit status.
- Cost breakdown.
- Comparison by marketplace/SKU.
- Transaction table.
- Drilldown drawer.
- Export action jika dibangun.

### 7.6 Insights
- Profit Detective explanation card.
- Margin movement breakdown.
- Complaint trend.
- FAQ/query frequency.
- Risk indicators.
- What-if simulation panel.

Setiap insight wajib memiliki:
- Periode.
- Basis dataset.
- Sumber data.
- Status kelengkapan.
- Label simulasi jika bukan data aktual.
- Kalimat sebab-akibat hanya jika dapat ditautkan ke komponen angka.

### 7.7 Evaluation / Judge Mode
- Header menampilkan “Evaluation sandbox”.
- Dataset selector.
- Test case list.
- Custom input.
- Expected vs actual result.
- Pass/fail state.
- Metrics summary dengan numerator/denominator.
- Profit reference comparison.
- Red-team cases.
- Version stamp: app version + dataset version.
- Tombol reset dataset demo.
- Tidak ada data produksi.

### 7.8 Settings & Audit
- Users & roles.
- Fee rules.
- Freshness settings.
- Demo data reset.
- Audit log.
- AI provider settings (feature flag, no secrets displayed).
- Export/import settings only if safe.

---

## 8. Component library

Gunakan shadcn/ui sebagai fondasi, lalu bangun komponen domain KOMPAS.

### 8.1 Core primitives
- Button.
- Input.
- Textarea.
- Select / Combobox.
- Checkbox / Switch.
- Tabs.
- Dialog.
- Sheet/Drawer.
- Dropdown menu.
- Tooltip.
- Popover.
- Calendar/Date picker.
- Table.
- Skeleton.
- Alert.
- Separator.
- Toast/Sonner.

### 8.2 Domain components
- `AppSidebar`
- `AppHeader`
- `PageHeader`
- `MetricCard`
- `StatusBadge`
- `MarketplaceBadge`
- `DataFreshness`
- `CompletenessIndicator`
- `ProfitAmount`
- `MarginIndicator`
- `CostBreakdown`
- `EvidenceList`
- `DecisionCard`
- `ChatComposer`
- `SuggestedReply`
- `ComplaintPriority`
- `ComplaintTimeline`
- `ImportDropzone`
- `ColumnMapper`
- `ImportPreviewTable`
- `ValidationSummary`
- `ReconciliationIssue`
- `ProfitDrilldown`
- `EvaluationScorecard`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`

### 8.3 Button hierarchy
- Primary: deep teal filled; one per major section.
- Secondary: neutral outline.
- Tertiary: ghost/text.
- Destructive: semantic danger, confirmation for irreversible action.
- Icon-only: accessible label + tooltip; never ambiguous.

### 8.4 Card behavior
- Card is used for a coherent content group, not every single text.
- Header has title, optional description, optional action.
- Body padding 20–24 px desktop; 16 px mobile.
- Do not nest multiple cards unnecessarily.
- Important data can be displayed directly in table/section rather than isolated card.

---

## 9. Data visualization

### 9.1 Chart principles
- Prioritize comparison and trend readability.
- Use line chart for trends; horizontal bars for category comparison.
- Use stacked bars only when categories sum to meaningful total.
- Pie/donut only for few mutually exclusive categories and only when proportion matters.
- Avoid 3D charts.
- Axis, unit, period, legend, and data source must be visible.
- Show `Rp` and percentages explicitly.
- Empty data state must explain what input is missing.

### 9.2 Financial display
- Use Indonesian number formatting: `id-ID`.
- Currency: `Rp 1.250.000` (no decimals by default; decimals only if data requires).
- Negative: `−Rp 125.000` with minus sign and danger label.
- Margin: `12,5%`.
- Use tabular numerals and right alignment.
- Do not color every positive value green; reserve semantic color for meaningful status.

### 9.3 Partial data
For partial profit:
- Show `Profit parsial` label.
- Show amount only with explicit `Estimasi` prefix if policy allows.
- List missing components directly.
- Avoid a green success treatment.
- Do not compare partial values against complete values without warning.

---

## 10. Status system and microcopy

### 10.1 Standard status vocabulary
| Status | Label UI | Tone |
|---|---|---|
| VERIFIED | Terverifikasi | Success |
| COMPLETE | Lengkap | Success |
| PARTIAL | Parsial | Warning |
| UNVERIFIED | Belum diverifikasi | Warning |
| STALE | Perlu diperbarui | Warning |
| MISSING | Belum tersedia | Neutral/warning |
| INVALID | Tidak valid | Danger |
| REVIEW | Perlu pemeriksaan | Warning |
| ESCALATED | Dieskalasikan | Danger |
| SIMULATED | Simulasi | Info |
| RESOLVED | Selesai | Success |

### 10.2 Microcopy rules
- Gunakan bahasa Indonesia yang ringkas, jelas, tidak menggurui.
- Istilah teknis boleh dipakai jika konsisten dan diberi konteks.
- Hindari “AI memutuskan” untuk keputusan yang harus dikonfirmasi manusia.
- Gunakan “Saran sistem”, “Draft jawaban”, “Perlu pemeriksaan staf”.
- Jangan menampilkan “Akurat 99%” tanpa hasil evaluasi yang sah.
- Jangan menyebut data dummy sebagai data toko.

Contoh:
- “Stok terakhir diperbarui 2 jam lalu.”
- “Data ongkir penjual belum tersedia. Profit ditampilkan sebagai parsial.”
- “Keluhan terdeteksi. Periksa detail pesanan sebelum membalas.”
- “Bukti produk belum tersedia. Sistem tidak dapat memastikan klaim ini.”
- “File berhasil dibaca. Periksa pemetaan kolom sebelum melanjutkan.”

---

## 11. Interaction and motion

### 11.1 Motion principles
- Motion subtle, short, functional.
- Default duration 120–180 ms for hover/focus.
- 180–240 ms for drawer/dialog.
- Use opacity/transform only when possible.
- Respect `prefers-reduced-motion`.
- No scroll-jacking, pinned full-screen stages, parallax, infinite carousel, or GSAP-heavy scene.

### 11.2 Required interaction states
For each interactive component:
- Default.
- Hover.
- Focus-visible.
- Active/pressed.
- Disabled.
- Loading.
- Error.
- Success.
- Empty.
- Partial/unverified where relevant.

### 11.3 Feedback
- Toast for non-blocking success/failure.
- Inline validation for forms.
- Dialog for destructive/irreversible actions.
- Skeleton only when loading layout data.
- Avoid generic spinner without context for file import.

---

## 12. Responsive behavior

### Breakpoints
- `sm`: 640 px.
- `md`: 768 px.
- `lg`: 1024 px.
- `xl`: 1280 px.
- `2xl`: 1536 px.

Rules:
- Desktop: persistent sidebar and multi-column dashboards.
- Tablet: collapsible sidebar; 2-column KPI; tables preserve key columns.
- Mobile: drawer navigation, stacked panels, sticky bottom action only where necessary.
- Chat workspace stacks input above result.
- Import mapping becomes scrollable step-by-step form.
- No hover-only actions; all actions available by touch/keyboard.

---

## 13. Accessibility

Target: WCAG 2.2 AA as design target (team must test; do not claim certified compliance).

Checklist:
- Text contrast 4.5:1 for normal text; 3:1 for large text/UI boundaries where applicable.
- Visible keyboard focus.
- Correct semantic headings.
- Form labels and error descriptions.
- Buttons have accessible names.
- Icons decorative unless labeled.
- Status includes text, icon, and color.
- Dialog focus trap and restore.
- Tables have header cells.
- Charts include text summary/table alternative.
- Do not rely on color alone.
- Support zoom/reflow.
- Reduced motion.
- Error messages identify the field and correction.
- Screen reader announcement for analysis result and import completion.

---

## 14. Empty, loading, and error states

### Empty state
- Explain why there is no data.
- Give one next action.
- Example: “Belum ada transaksi. Unggah laporan CSV untuk mulai menghitung profit.”

### Loading state
- Skeleton matching final layout for dashboard.
- Import progress shows phase: membaca file, memvalidasi, menghitung.
- Prevent duplicate submit while request is processing.

### Error state
- State what failed and what user can do.
- Provide retry only if operation is safe/idempotent.
- Never expose stack trace, SQL, secret, or provider error detail.

### Partial state
- Show what is available and what is missing.
- Explain impact on result.
- Keep the action to resolve missing data visible.

---

## 15. Content and asset direction
- Avoid stock photography in core dashboard.
- Use Lucide icons with consistent 1.75–2 px stroke.
- Use initials/avatar placeholders for demo users.
- Use simple logo mark; no marketplace logo unless official asset use is allowed.
- Avoid emoji as primary status/iconography.
- Product images are optional; if used, they must be clearly demo assets and not influence stock/profit facts.
- No food-menu carousel or chef imagery from the supplied Dish Orbit component.

---

## 16. Design tokens implementation map
Map tokens into CSS variables and Tailwind theme:
```css
:root {
  --background: #F6F8F5;
  --foreground: #172629;
  --card: #FFFFFF;
  --card-foreground: #223438;
  --popover: #FFFFFF;
  --popover-foreground: #223438;
  --primary: #246B6B;
  --primary-foreground: #FFFFFF;
  --secondary: #EFF4F1;
  --secondary-foreground: #24494A;
  --muted: #F0F3F0;
  --muted-foreground: #65777A;
  --accent: #DDECE7;
  --accent-foreground: #153F42;
  --destructive: #A34842;
  --destructive-foreground: #FFFFFF;
  --border: #E4E9E5;
  --input: #E4E9E5;
  --ring: #45958D;
  --success: #23634B;
  --success-bg: #EAF4EE;
  --warning: #80551B;
  --warning-bg: #FBF2DF;
  --danger: #9A3F3B;
  --danger-bg: #F9EAE8;
  --info: #355D7A;
  --info-bg: #EAF1F6;
  --radius: 0.75rem;
}
```

Implement semantic tokens once; do not scatter raw hex codes through components. For data visualization, use a separate chart token map.

---

## 17. Design acceptance checklist
- [ ] Dashboard looks like one coherent SaaS product.
- [ ] CS workspace is visually distinct from owner analytics.
- [ ] All pages use the same spacing, typography, radius, and color tokens.
- [ ] Primary action is obvious on each page.
- [ ] Profit values show completeness/reconciliation status.
- [ ] Missing values are not visually represented as zero.
- [ ] Every AI-generated/suggested answer shows source and freshness.
- [ ] High-risk claims show abstain/escalation state.
- [ ] Import has upload, mapping, preview, validation, confirmation, and result states.
- [ ] Charts have labels, units, and text alternatives.
- [ ] Mobile and tablet behavior is intentional.
- [ ] Keyboard focus and reduced-motion support work.
- [ ] No decorative heavy animation or unrelated food carousel.
- [ ] Demo/simulated data is visibly labeled.
