from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import production_problems, settings
from .db import engine
from .models import Base
from .routers import (
    auth,
    chat,
    complaints,
    evaluation,
    imports,
    insights,
    products,
    profit,
    settings as settings_router,
)
from .seeder import seed_all


def init_db():
    Base.metadata.create_all(engine)
    from sqlalchemy import inspect, select, text
    from .db import SessionLocal
    from .models import Product, User
    from .seeder import seed_users
    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    if "email" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
    with SessionLocal() as db:
        legacy_emails = {
            "owner": "owner@kompasdev.my.id",
            "manager": "manager@kompasdev.my.id",
            "cs": "cs@kompasdev.my.id",
            "packing": "packing@kompasdev.my.id",
            "judge": "judge@kompasdev.my.id",
        }
        for username, email in legacy_emails.items():
            user = db.scalar(select(User).where(User.username == username))
            if user and not user.email:
                user.email = email
        seed_users(db)
        db.commit()
    with SessionLocal() as db:
        if not db.scalar(select(Product).limit(1)):
            try:
                seed_all(force=False)
            except Exception as e:
                print(f"[KOMPAS Startup] Seeder notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.demo_mode:
        problems = production_problems(settings)
        if problems:
            raise RuntimeError("Konfigurasi produksi tidak aman:\n- " + "\n- ".join(problems))
    init_db()
    yield
    # Shutdown


app = FastAPI(
    title="KOMPAS API",
    description="Connected Operations & Margin Intelligence for UMKM Husin (Shopee, TikTok Shop, Lazada)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(chat.router)
app.include_router(complaints.router)
app.include_router(profit.router)
app.include_router(imports.router)
app.include_router(insights.router)
app.include_router(evaluation.router)
app.include_router(settings_router.router)


@app.get("/")
def root():
    return {
        "app": "KOMPAS API",
        "description": "Connected Operations & Margin Intelligence",
        "version": "1.0.0",
        "docs_url": "/docs",
        "demo_mode": settings.demo_mode,
        "jev_enabled": settings.jev_enabled,
        "jev_ready": settings.jev_ready,
    }


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
