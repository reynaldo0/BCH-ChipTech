from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
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
    from sqlalchemy import select
    from .db import SessionLocal
    from .models import Product
    with SessionLocal() as db:
        if not db.scalar(select(Product).limit(1)):
            try:
                seed_all(force=False)
            except Exception as e:
                print(f"[KOMPAS Startup] Seeder notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    }


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
