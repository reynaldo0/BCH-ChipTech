# TECHSTACK.md
# KOMPAS — Technical Architecture & Stack Specification
**Target: fast, maintainable, lightweight web application | Versi 1.0**

---

## 1. Technical goals

1. Memenuhi kebutuhan COMPARE 2026 tanpa API marketplace dan tanpa akun toko produksi.
2. Menyelesaikan MVP dalam periode pengembangan singkat.
3. Menjaga initial client bundle kecil.
4. Memisahkan domain logic (terutama kalkulasi uang) dari UI.
5. Memungkinkan demo lokal dan deployment VPS/container.
6. Menggunakan teknologi modern yang kompatibel dan umum dipelihara.
7. Menghindari dependensi berat yang tidak memberikan nilai langsung pada kasus.

**Architecture decision:** Split-tier Modern Operational Architecture dengan **Backend FastAPI (Python 3.10+)** berkemampuan komputasi deterministik tinggi, asinkron, dan type-safe via Pydantic v2 + SQLAlchemy, dipadukan dengan **Frontend Modern Operational Dashboard** berbasis Tailwind CSS & Design System KOMPAS sesuai spesifikasi `DESIGN.md`.

---

## 2. Recommended stack (Updated: FastAPI Backend)

| Layer | Teknologi | Rekomendasi | Alasan & Relevansi |
|---|---|---|---|
| Backend Runtime | Python | 3.10+ (Current: 3.15 LTS) | Ekosistem data parsing, AI/NLP adapter, dan komputasi deterministik |
| Backend Framework | FastAPI | 0.115+ / 0.162+ | Asinkron berkecepatan tinggi, auto-generated OpenAPI docs (`/docs`), validasi schema Pydantic native |
| Schema & Validation | Pydantic v2 | 2.10+ / 2.14+ | Type checking ketat, parsing request/response, data serialization cepat |
| Financial Calculation | Python `decimal.Decimal` | Standard Library | Mencegah binary floating-point error dalam kalkulasi Rupiah dan margin |
| ORM & Database Layer | SQLAlchemy 2.0 | 2.0+ / 2.1+ | SQL-first, type-safe, transaksi ACID, mendukung SQLite & PostgreSQL |
| Database Engine | SQLite (Local/Demo) / PostgreSQL 16+ (Prod) | Relational SQL | Integritas referensial penuh, foreign keys, indeks, dan audit log |
| ASGI Web Server | Uvicorn | 0.30+ / 0.54+ | Web server ASGI berkinerja tinggi berbasis uvloop/asyncio |
| Frontend UI Layer | Modern Responsive Dashboard | HTML5 / ES Modules / Tailwind CSS | Rendering responsif, visual editorial sesuai `DESIGN.md`, ringan tanpa bundle bloat |
| Styling & Theme | Tailwind CSS v3/v4 Design System | Deep Teal `#102F32`, `#246B6B`, `#F6F8F5` | Utility CSS modern dengan token warna persis sesuai `DESIGN.md` |
| Component Primitives | Accessible UI Components | Cards, Drawers, Steppers, Tabular grids | Tampilan modern, tabular numbers (`tabular-nums`), focus rings |
| Icons | Lucide Icons | Modern SVG set | Konsisten, ringan, dan jelas untuk status operasional |
| CSV Engine | Python `csv` & Stream Parser | Standard Library + Pandas/Polars (opsional) | Pemrosesan file besar di server secara aman tanpa membebani client |
| Testing | Pytest + HTTPX TestClient | 8.x / 9.x | Unit test kalkulasi profit, golden set chat copilot, integration test |
| Lint & Format | Ruff / Black / Flake8 | Current | Analisis statis dan konsistensi kode |
| Deployment | Docker / Uvicorn standalone | Container / VPS | Multi-stage build ringan dan portabel |
| Observability | Structured JSON Logs & Audit Trails | Built-in | Request correlation ID, audit log setiap perubahan data penting |

### 2.1 Mengapa FastAPI Sangat Relevan untuk KOMPAS
1. **Ketepatan Hitung Uang (Deterministic Decimal Precision):**
   Modul Profit Engine membutuhkan jaminan mutlak bahwa `0.1 + 0.2 == 0.3`. Python menyediakan modul `decimal.Decimal` bawaan yang jauh lebih deterministik dan tahan terhadap precision leak dibanding runtime berbasis binary float.
2. **Validasi Skema Berlapis (Pydantic v2):**
   Setiap transaksi impor, baris produk, parameter operasional, dan payload chat tervalidasi secara instan dengan pesan error yang detail (baris, kolom, tipe data), memenuhi syarat PE-05 dan CC-01.
3. **Kesiapan Integrasi AI & NLP (Chat Copilot & Golden Set):**
   FastAPI dan Python adalah lingkungan alami untuk orkestrator Chat Copilot, baik saat menggunakan rule-based classifier deterministik, adapter Jev AI, maupun LLM fallback, tanpa perlu context-switching bahasa.
4. **Dokumentasi API Otomatis (`/docs` & `/redoc`):**
   Juri dan pengembang dapat langsung menguji setiap endpoint secara interaktif melalui Swagger UI bawaan FastAPI.
5. **Kinerja & Asinkronus:**
   FastAPI mendukung operasi async non-blocking untuk upload file CSV berukuran besar dan orkestrasi skenario chat simultan.

---

## 3. Architecture overview

```mermaid
flowchart TB
  U[Owner / Manager / CS / Packing / Judge]
  UI[Modern Operational UI - DESIGN.md Compliant]
  API[FastAPI REST Engine]
  AUTH[Auth & Server-side RBAC Guard]
  PB[Product Brain Service]
  CHAT[Chat Copilot Orchestrator]
  PROFIT[Profit Engine - Deterministic Decimal]
  IMPORT[Import & Mapping Wizard Service]
  COMP[Complaint Service]
  EVAL[Evaluation & Judge Golden Set Harness]
  DB[(SQLite / PostgreSQL DB)]
  AUDIT[Audit Log Engine]
  FILE[(Upload & Temp Storage)]
  AI_ADAPT[AI / Jev Adapter - Optional]

  U --> UI --> API
  API --> AUTH
  API --> PB
  API --> CHAT
  API --> PROFIT
  API --> IMPORT
  API --> COMP
  API --> EVAL
  API --> AUDIT
  PB --> DB
  CHAT --> PB
  CHAT --> AI_ADAPT
  PROFIT --> DB
  IMPORT --> DB
  IMPORT --> FILE
  COMP --> DB
  EVAL --> CHAT
  EVAL --> PROFIT
  AUDIT --> DB
```

### 3.1 Trust boundaries
- Browser input is untrusted.
- Uploaded files are untrusted.
- Customer message text is untrusted content, never a system instruction.
- AI provider output is untrusted until schema/policy validation.
- PostgreSQL records are authoritative only according to verification/freshness status.
- Demo mode must be isolated from any future production data.

### 3.2 Data flow rules
- UI calls server route/action.
- Server validates request with Zod.
- Server checks session and role.
- Domain service applies business rules.
- Drizzle performs typed SQL operations.
- Response is validated/serialized.
- Client receives only fields required for the screen.
- Never call database or provider API directly from client components.

---

## 4. Project structure

Recommended FastAPI + Modern Operational UI project structure:
```text
KOMPAS/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI entrypoint, middleware, static mount
│   │   ├── config.py                 # Pydantic Settings & environment variables
│   │   ├── database.py               # SQLAlchemy engine & session factory
│   │   ├── models/                   # SQLAlchemy declarative models
│   │   │   ├── __init__.py
│   │   │   ├── product.py            # Product, Variant, StockSnapshot, CostBatch
│   │   │   ├── rules.py              # ShippingRule, PackingCapacity, FeeRule
│   │   │   ├── transaction.py        # ImportJob, Transaction, CostComponent, Issue
│   │   │   ├── complaint.py          # ComplaintTicket, ComplaintLog
│   │   │   ├── chat.py               # ChatTestLog, DecisionRecord
│   │   │   └── audit.py              # AuditLog
│   │   ├── schemas/                  # Pydantic v2 schemas for request/response
│   │   │   ├── product.py
│   │   │   ├── chat.py
│   │   │   ├── complaint.py
│   │   │   ├── profit.py
│   │   │   ├── import_job.py
│   │   │   └── evaluation.py
│   │   ├── services/                 # Domain Services
│   │   │   ├── product_brain.py      # Catalog, stock freshness, rules
│   │   │   ├── chat_orchestrator.py  # Classifier, policy gate, draft, prompt injection guard
│   │   │   ├── profit_engine.py      # Deterministic decimal math, reconciliation, breakdown
│   │   │   ├── import_service.py     # CSV parsing, mapping suggest, validation
│   │   │   ├── complaint_service.py  # Ticket management, status flow, impact linking
│   │   │   ├── evaluation_service.py # Golden set runner, metrics calculator
│   │   │   └── seeder.py             # Auto-seeder from CSV directory
│   │   └── routers/                  # API Endpoints
│   │       ├── products.py
│   │       ├── chat.py
│   │       ├── complaints.py
│   │       ├── profit.py
│   │       ├── imports.py
│   │       ├── insights.py
│   │       ├── evaluation.py
│   │       └── settings.py
│   ├── tests/
│   │   ├── test_profit_engine.py     # Unit test deterministic decimal math
│   │   ├── test_chat_copilot.py      # Unit test triage & policy gate
│   │   ├── test_import_wizard.py     # Unit test CSV mapping & validation
│   │   └── test_api_integration.py   # FastAPI HTTPX testclient
│   └── requirements.txt
├── frontend/                         # Modern Operational Dashboard
│   ├── index.html                    # Single-page dashboard application
│   ├── css/
│   │   └── style.css                 # KOMPAS design tokens (Teal, Slate, Ivory)
│   └── js/
│       ├── app.js                    # Core UI state & routing controller
│       ├── api.js                    # Fetch client for FastAPI endpoints
│       └── components/               # UI Modules (Overview, Chat, Profit, etc.)
├── csv/                              # Synthetic Datasets
│   ├── data_dummy_produk_husin.csv
│   ├── operasional_toko_dummy_husin.csv
│   ├── faq_dummy_husin.csv
│   └── chat_customer_dummy_husin.csv
├── docs/
│   ├── DESIGN.md
│   ├── REQUIREMENT.md
│   └── TECHSTACK.md
├── run.py                            # Fast launcher script
└── README.md
```

### 4.1 Component placement
- `components/ui`: shadcn primitives only or small wrappers around them.
- `components/<domain>`: domain-specific visual components.
- `features/<domain>`: schemas, actions, services, and queries.
- `server/`: server-only providers/parsers and sensitive logic.
- `lib/`: cross-domain infrastructure helpers.
- Do not put profit formulas inside React components.
- Do not place provider keys in `NEXT_PUBLIC_*`.

---

## 5. Setup & execution commands

Menjalankan backend FastAPI dan modern dashboard:
```bash
# 1. Jalankan FastAPI server (otomatis seed data CSV saat pertama kali start)
python run.py
# Atau:
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Akses Aplikasi & Dokumentasi
# Dashboard Web UI : http://localhost:8000/
# Swagger OpenAPI  : http://localhost:8000/docs
# ReDoc Interactive: http://localhost:8000/redoc

# 3. Menjalankan Unit & Integration Tests
python -m pytest backend/tests -v
```

---

## 6. Database design

### 6.1 PostgreSQL schema groups
- Identity: users, sessions, accounts, roles (if auth).
- Product Brain: products, variants, stock_snapshots, cost_batches, product_evidence, shipping_rules, packing_capacity, fee_rules.
- Profit: imports, import_rows, transactions, transaction_lines, transaction_costs, reconciliation_issues.
- Chat: chat_tests, chat_decisions, chat_sources, complaints.
- Evaluation: evaluation_datasets, evaluation_cases, evaluation_runs, evaluation_results.
- Audit: audit_logs.

### 6.2 Important data types
- IDs: UUID.
- Rupiah: `numeric(18,2)` or integer minor units where policy supports; use decimal library/SQL numeric, never JS float for financial arithmetic.
- Rates: `numeric(9,6)` or explicit basis points.
- Date/time: `timestamptz` for event timestamps; `date` for effective dates where appropriate.
- Status: enum or constrained text values.
- Raw import row: JSONB for traceability, with normalized columns stored separately.
- File metadata: name, MIME, size, checksum optional, uploaded_at, import_job_id.

### 6.3 Integrity
- Unique SKU constraint.
- Foreign keys for product/variant/transaction relationships.
- Unique import transaction key where reliable; otherwise duplicate detection key based on configurable fields.
- Index transaction_date, marketplace, product_id, variant_id, status, complaint status.
- Add database transaction around import commit.
- Store formula version and fee rule reference per calculation result.

---

## 7. Domain services

### 7.1 Product Brain Service
Responsibilities:
- CRUD product/variant.
- Stock snapshot update.
- Freshness calculation.
- Product evidence validation.
- Shipping/packing rule lookup.
- Fee rule lookup by effective date.
- Data completeness calculation.

### 7.2 Chat Copilot Orchestrator
Pipeline:
1. Validate and store input scenario.
2. Normalize text (preserve original).
3. Classify message.
4. Extract candidate product/variant and complaint signals.
5. Retrieve Product Brain facts.
6. Evaluate freshness and evidence.
7. Apply policy gate.
8. Generate deterministic/template draft or call optional language model.
9. Validate output schema and source references.
10. Create complaint ticket if needed.
11. Store decision, sources, latency, and result.

Decision enum:
- `ANSWER_DIRECTLY`
- `ANSWER_WITH_REVIEW`
- `ESCALATE`
- `ABSTAIN`

MVP classifier:
- Deterministic rules/keyword + small curated patterns as baseline.
- Jev AI may be tested as a classifier/router behind adapter/feature flag.
- LLM is not required for initial MVP.
- A model prediction must never override hard policy rules for complaint escalation or high-risk product claims.

### 7.3 Profit Calculator
- Pure functions with typed input/output.
- No AI dependency.
- Use Decimal arithmetic.
- Formula version stored with output.
- Unit tests cover all cost components, returns, discounts, and rounding.
- Same input + same formula version = same result.

### 7.4 Import Service
Pipeline:
1. Validate extension, MIME, file size, and allowed format.
2. Parse file server-side.
3. Detect delimiter/encoding for CSV.
4. Select sheet for XLSX.
5. Preview rows.
6. Suggest mapping.
7. Require user confirmation.
8. Normalize rows.
9. Validate fields.
10. Detect duplicates/unmatched SKU/fee gaps.
11. Commit valid rows transactionally.
12. Store invalid rows/issues for review.
13. Run calculation after commit or explicit user action.

Limits should be environment-configurable. Initial safe defaults for a competition prototype: 10 MB max file, 10,000 data rows, 30 columns; adjust after load testing and parser review. Never trust client-provided file metadata alone.

---

## 8. Profit calculation implementation

### 8.1 Decimal handling
Use PostgreSQL `numeric` and a Decimal library such as `decimal.js` or `big.js` in domain calculations. Pick one and use it consistently. Convert to string/decimal at API boundaries; never parse financial values into JS `number` for arithmetic.

### 8.2 Formula contract
```ts
type ProfitInput = {
  grossSales: DecimalLike;
  sellerDiscount: DecimalLike | null;
  refundAmount: DecimalLike | null;
  cogs: DecimalLike | null;
  marketplaceCommission: DecimalLike | null;
  fixedFee: DecimalLike | null;
  sellerShippingCost: DecimalLike | null;
  packingCost: DecimalLike | null;
  returnLogisticsCost: DecimalLike | null;
  otherCosts: DecimalLike[];
  marginBase: "GROSS_SALES" | "NET_REVENUE";
  formulaVersion: string;
};

type CompletenessStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "RECONCILIATION_REQUIRED"
  | "NOT_CALCULABLE";
```

Do not treat `null` as zero. Only an explicit numeric zero is zero. Formula semantics must be finalized in the project decision log and reference dataset before implementation.

### 8.3 Calculation trace
Persist:
- Raw input reference.
- Normalized values.
- Fee rule ID/version.
- Formula version.
- Intermediate revenue.
- Each cost component.
- Profit.
- Margin base.
- Completeness status.
- Reconciliation warnings.
- Calculation timestamp.

### 8.4 Rounding
- Use a documented rounding mode (recommended half-up for displayed Rupiah, subject to agreed business rule).
- Keep sufficient precision during intermediate operations.
- Round only at defined output boundaries.
- Reference calculations must use the same rounding policy.

---

## 9. AI / Jev integration strategy

### 9.1 Design principle
AI is an optional language/decision assistance layer, not the system of record.

- Product Brain is the authoritative source of product facts.
- Policy gate decides what can be answered.
- Profit Calculator computes all money.
- AI may classify, route, or explain verified results.
- Human staff approves and sends any customer-facing response.

### 9.2 Jev AI
Treat Jev AI as an optional provider adapter, not a hard dependency:
- Intended use: structured classification, complaint routing, priority scoring, confidence/decision output.
- Not intended use: calculating profit, inventing product facts, or generating unsupported customer promises.
- Verify actual API, SDK, authentication, quotas, pricing, latency, privacy, and Indonesian-language performance before enabling.
- Compare Jev against deterministic rules and an LLM baseline on the same golden set.
- Keep provider call behind `server/ai/jev/`.
- Add `JEV_ENABLED=false` by default until tested.
- Store provider/model/version metadata for evaluation.
- Do not send personal/production data; use synthetic text only.

### 9.3 LLM reply generation
Optional phase:
- Input only relevant retrieved facts and approved response policy.
- Structured output schema: `draft`, `usedFacts`, `needsHumanReview`, `reason`.
- Reject output containing unsupported facts.
- No tools/actions to marketplace.
- Never include secrets or unnecessary customer data.
- Template response is the fallback.

### 9.4 Provider fallback
- Jev unavailable: deterministic classifier.
- LLM unavailable: template-based response.
- Both unavailable: show classification rules where possible or escalate to human.
- Profit Engine remains fully functional.

### 9.5 Evaluation
Minimum comparison:
- 30–50 synthetic Indonesian messages if time permits.
- Include slang, typo, mixed intent, complaints, high-risk claims, ambiguous SKU, and prompt injection.
- Metrics: per-class accuracy, complaint recall, precision, abstention precision, false-negative high-risk count, latency, and estimated cost.
- Do not choose a provider based only on demo appearance.

---

## 10. API and server action conventions

Suggested endpoints:
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/products` | List/search products |
| POST | `/api/products` | Create product |
| GET | `/api/products/:id` | Product detail |
| PATCH | `/api/products/:id` | Update product |
| POST | `/api/chat/analyze` | Analyze simulated message |
| GET | `/api/complaints` | List complaint tickets |
| POST | `/api/complaints` | Create complaint |
| PATCH | `/api/complaints/:id` | Update status/notes |
| POST | `/api/imports/preview` | Upload and preview file |
| POST | `/api/imports/:id/confirm` | Confirm mapping/commit |
| GET | `/api/imports/:id/issues` | Import issues |
| POST | `/api/profit/calculate` | Run deterministic calculation |
| GET | `/api/profit/summary` | Aggregated profit |
| GET | `/api/profit/transactions/:id` | Drilldown |
| POST | `/api/evaluation/run` | Execute golden set |

Use route handlers for file uploads and external provider calls. Server Actions may be used for small authenticated mutations, but maintain one consistent validation/authorization layer. Do not duplicate business logic between routes and actions.

Response envelope:
```ts
type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> }; requestId: string };
```

---

## 11. Performance and bundle budget

### 11.1 Rendering strategy
- Default to React Server Components.
- Add `"use client"` only for interactive islands.
- Fetch page data on server.
- Use pagination and server-side filtering for transaction/complaint tables.
- Avoid large global providers.
- Avoid client-side state libraries unless actual complexity requires them.

### 11.2 Bundle strategy
- Do not import XLSX parser in client components.
- Lazy-load evaluation/advanced insight screens.
- Use dynamic import for optional heavy modules.
- Prefer CSS/SVG charts.
- Use Lucide icons as tree-shaken named imports.
- Avoid GSAP/ScrollTrigger for this product.
- Avoid large animation libraries.
- Avoid multiple date libraries.
- Avoid both TanStack Query and SWR unless a demonstrated use case requires one.

### 11.3 Suggested budgets (targets, not framework guarantees)
- Initial route JS: target under 200 KB gzip for typical dashboard route, excluding shared framework runtime; measure actual production build.
- No spreadsheet parser in browser bundle.
- No large hero imagery on dashboard.
- No animation that blocks input or scroll.
- Database list endpoints must paginate.
- Import must provide progress and enforce limits.
- Lighthouse/Web Vitals should be checked on deployed build; do not claim score before measuring.

### 11.4 Database performance
- Index common filter fields.
- Avoid N+1 query patterns.
- Aggregate profit in SQL or bounded domain service after validation.
- Do not fetch every transaction to the browser for chart aggregation.
- Add pagination for long tables.
- Cache only stable read-heavy data; invalidate on updates.

---

## 12. Security

- Zod validation at every server boundary.
- Server-side RBAC for every protected operation.
- Parameterized SQL via Drizzle.
- Secure session cookies if auth enabled.
- Rate limit chat analyze and import endpoints.
- File upload validation and parser isolation.
- Never trust file extension alone.
- Escape user-controlled text; render as text, not HTML.
- CSRF protection where cookie-authenticated mutation requires it.
- Restrict CORS to known origins if separate origins exist.
- Security headers via Next.js/Nginx.
- Secrets only in server environment.
- `.env` ignored by git; `.env.example` contains placeholders only.
- Logs redact message/file contents where possible.
- Use synthetic demo data.
- Add prompt injection tests.
- No marketplace auto-send integration.

---

## 13. Environment variables

Example `.env.example`:
```env
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kompas

# Authentication (only if configured)
BETTER_AUTH_SECRET=replace-with-long-random-secret
BETTER_AUTH_URL=http://localhost:3000

# AI provider flags — disabled by default
JEV_ENABLED=false
JEV_API_KEY=
JEV_API_BASE_URL=
LLM_ENABLED=false
LLM_API_KEY=
LLM_MODEL=

# Import limits
IMPORT_MAX_FILE_MB=10
IMPORT_MAX_ROWS=10000
IMPORT_MAX_COLUMNS=30

# Demo environment
DEMO_MODE=true
DEMO_DATASET_VERSION=demo-v1
```
- Jangan commit `.env`.
- Jangan memakai prefix `NEXT_PUBLIC_` untuk secret.
- Validasi environment pada startup.
- Bila provider tidak aktif, aplikasi harus tetap bisa dijalankan.

---

## 14. Local development and deployment

### 14.1 Local
1. Install Node 22 LTS dan pnpm 10.
2. Jalankan PostgreSQL lokal atau Docker Compose.
3. Salin `.env.example` menjadi `.env.local`.
4. Jalankan migration.
5. Jalankan seed dummy.
6. Jalankan `pnpm dev`.
7. Buka `http://localhost:3000`.

### 14.2 Docker Compose
- Service `web`: Next.js standalone server.
- Service `db`: PostgreSQL 16/17 dengan named volume.
- Database hanya bind ke internal Docker network atau localhost, bukan publik.
- Healthcheck untuk database.
- Gunakan non-root user pada image jika memungkinkan.
- Persistent volume untuk DB.
- Upload sementara disimpan di lokasi terbatas dan dibersihkan sesuai kebijakan.

### 14.3 Production build
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Jalankan migrasi secara terkontrol.
- Seed demo hanya pada environment demo.
- Nginx reverse proxy + TLS.
- Backup DB sebelum perubahan schema.
- Health endpoint tidak membocorkan konfigurasi.

### 14.4 Hosting cost
Dokumentasikan biaya aktual:
- VPS/hosting.
- Domain.
- Database (jika managed).
- Storage.
- AI provider (jika diaktifkan).
- Maintenance.
- Free-tier quota/limit.
Jangan mengklaim layanan gratis tanpa memeriksa kuota dan kebijakan terkini.

---

## 15. Testing strategy

### Unit
- Profit formula.
- Decimal/rounding.
- Fee rule date matching.
- Completeness status.
- Duplicate detection.
- CSV/XLSX parsing.
- Mapping normalization.
- Complaint classification.
- Policy gate/high-risk abstention.
- Jev adapter schema/fallback.

### Integration
- Product Brain CRUD.
- Import lifecycle.
- Transaction calculation.
- Chat orchestration.
- Complaint linkage.
- RBAC.
- Audit log.

### E2E
1. Login/demo role.
2. Add product and variant.
3. Update stock and shipping rule.
4. Analyze common question and copy draft.
5. Analyze complaint and create ticket.
6. Upload CSV, map, validate, confirm.
7. View profit summary and transaction drilldown.
8. Verify missing cost status.
9. Run evaluation suite.
10. Verify fallback when AI disabled.

### Quality gates
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright test
pnpm build
```
All must pass before final demo build, except any documented known issue with a reproducible reason.

---

## 16. Build sequence for 7-day development window

| Hari | Fokus | Output teknis |
|---|---|---|
| 1 | Scope, schema, wireframe, formula contract, golden set | ERD, decision log, demo dataset, route map |
| 2 | Product Brain | CRUD product/variant, stock, modal, shipping |
| 3 | Chat Copilot | classify, retrieve facts, policy gate, draft, copy, complaint |
| 4 | Import | CSV upload, mapping, preview, validation |
| 5 | Profit Engine | decimal calculator, status, reconciliation, drilldown |
| 6 | Integration + dashboard | complaint-to-margin, completeness, owner overview |
| 7 | Evaluation + QA + submission | golden set, fallback, README, demo video, final build |

Scope lock:
- P0 first.
- Jev AI only if baseline classification and fallback are already working.
- XLSX only after CSV path is stable.
- Charts and animation are secondary to correct data and traceability.

---

## 17. AI and third-party disclosure

Create an `AI_USAGE.md` table:
| Tool | Purpose | Part used | Team changes | Verification | Cost/license |
|---|---|---|---|---|---|
| ChatGPT / coding assistant | Ideation/code/docs | Exact items used | Explain changes | Tests/review | Actual plan/terms |
| Jev AI (if used) | Classification/routing experiment | Adapter and model output | Policy gate/fallback | Golden set comparison | Verify actual terms |
| Other library/service | Exact purpose | Exact component | Team implementation | Tests/license review | Actual cost |

The team must:
- Understand the code.
- Be able to explain architecture and calculations.
- Verify licenses for icons, fonts, libraries, and assets.
- Document external service quotas and fallback.
- Avoid using AI as a black-box substitute for required business logic.

---

## 18. Pasted Dish Orbit Carousel assessment

The supplied `dish-orbit-carousel.tsx` depends on React, GSAP, and ScrollTrigger and is designed for a food-menu display. It is not a KOMPAS requirement and should not be integrated into the product:
- Domain mismatch: food discovery/order UI does not solve chat triage, complaint handling, or profit analysis.
- Bundle/runtime cost: GSAP and ScrollTrigger add code and animation lifecycle complexity without product value.
- UX mismatch: pinned scroll, orbit motion, and food imagery conflict with data-dense operational workflows.
- Security/business: `onOrder`/`onPlay` callbacks have no valid KOMPAS action.
- Asset mismatch: provided dish/chef/restaurant content is unrelated to demo data.

If the team wants to preserve the supplied component, place it in an isolated playground outside the production route tree. Do not add it to the KOMPAS dependency list.

---

## 19. Technical decisions and constraints

1. Modular monolith; no microservices.
2. PostgreSQL is the single relational source of truth.
3. Drizzle is the only ORM/query layer.
4. Profit math is deterministic and Decimal-based.
5. AI provider is optional and adapter-based.
6. Jev AI is a classifier/router experiment only until measured.
7. LLM may generate text only from retrieved verified facts.
8. No marketplace APIs or automatic sending.
9. CSV is mandatory MVP; XLSX is added only after stable CSV import.
10. Charts are CSS/SVG first; avoid heavy chart packages.
11. GSAP/ScrollTrigger excluded from app.
12. Auth must be server-enforced; demo mode must be clearly labeled.
13. Use only synthetic data in competition build.
14. Pin package versions and commit lockfile.
15. All major product requirements map to tests and UI acceptance criteria.

---

## 20. Official compatibility references

Periksa ulang sebelum instalasi karena patch/security release dapat berubah:
- Next.js Support Policy: https://nextjs.org/support-policy
- Next.js releases: https://github.com/vercel/next.js/releases
- shadcn/ui Tailwind v4 + React 19: https://ui.shadcn.com/docs/tailwind-v4
- Tailwind CSS compatibility: https://tailwindcss.com/docs/compatibility

Pada tanggal penyusunan dokumen (6 November 2026), sumber rilis yang diperiksa menunjukkan Next.js 16.4.5 sebagai stable patch terbaru yang tersedia; gunakan versi stabil terbaru yang telah dipatch, bukan canary. Tailwind v4 menargetkan browser modern (Chrome 111+, Safari 16.4+, Firefox 128+); bila target perangkat lebih lama, lakukan compatibility review atau pertimbangkan Tailwind 3.4 secara sadar.

## 21. Release checklist

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] TypeScript strict passes.
- [ ] Lint and tests pass.
- [ ] Production build passes.
- [ ] Migrations run from clean database.
- [ ] Demo seed is reproducible.
- [ ] Product Brain data can be created/updated.
- [ ] Chat handles general, complaint, uncertain, mixed, typo, high-risk, and prompt injection cases.
- [ ] Reply sources and freshness are visible.
- [ ] Copy action works; no marketplace send action exists.
- [ ] CSV upload/mapping/preview/validation/confirmation works.
- [ ] Profit output matches independent reference calculations.
- [ ] Missing costs remain missing, not zero.
- [ ] Duplicate and double-cost issues are flagged.
- [ ] Drilldown shows input, formula, and fee rule.
- [ ] Dashboard labels partial/simulated data.
- [ ] Jev/LLM disabled mode works.
- [ ] No secrets or real personal/transaction data in repository.
- [ ] README, AI_USAGE.md, and product result note are ready.
- [ ] Demo video shows actual functions and limitations.
