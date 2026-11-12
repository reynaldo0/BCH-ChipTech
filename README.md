# KOMPAS

KOMPAS is a demo operational and margin intelligence dashboard for UMKM
Husin. It combines Product Brain, Chat Copilot, Complaint Center, Profit
Engine, marketplace imports, insights, and evaluation tools.

## Requirements

- Python 3.9+ (Python 3.10+ recommended)
- Node.js 18.17+ (Node.js 20 LTS recommended)

## Run the backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API is available at <http://127.0.0.1:8000> and its OpenAPI documentation
is at <http://127.0.0.1:8000/docs>.

## Run the frontend

In another terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

## Verify the backend

With the virtual environment activated:

```bash
python backend/scripts/test_direct.py
python -m pytest backend/tests -q
```

The demo database is created and seeded automatically on the first backend
startup. Use the Settings screen to reset it to the deterministic demo state.

## Production notes

- Set a unique `SESSION_SECRET`; never use the example value.
- Set `DEMO_MODE=false` and use PostgreSQL through `DATABASE_URL` for production.
- Set `ALLOWED_ORIGINS` to the exact deployed frontend origin(s).
- Jev is optional. The deterministic rule-based provider remains available when
  Jev is disabled or unavailable.
