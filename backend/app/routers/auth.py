from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User
from ..schemas import AuthResponse, LoginRequest, UserOut, UserRoleUpdate
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

ROLE_INFO = [
    {
        "role": "owner",
        "name": "Husin (Owner)",
        "description": "Akses menyeluruh: margin, persetujuan biaya, pengaturan fee, dan audit.",
    },
    {
        "role": "manager",
        "name": "Operational Manager",
        "description": "Pengawasan stok, kapasitas packing, investigasi komplain, dan rekonsiliasi.",
    },
    {
        "role": "cs",
        "name": "Customer Service",
        "description": "Chat Copilot, draft jawaban berbasis bukti, eskalasi tiket keluhan.",
    },
    {
        "role": "packing",
        "name": "Gudang & Packing",
        "description": "Update stok fisik, monitoring kapasitas harian, verifikasi label pengiriman.",
    },
    {
        "role": "judge",
        "name": "Juri / Evaluator",
        "description": "Evaluasi golden set chat (GC-01..27) dan profit (PFT-001..18), trace audit.",
    },
]


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password keliru.",
        )
    token = create_access_token(user)
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        expires_in_hours=settings.session_ttl_hours,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/switch-role", response_model=AuthResponse)
def switch_role(payload: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.role == payload.role))
    if not user:
        # Create user if missing
        role_map = {r["role"]: r["name"] for r in ROLE_INFO}
        display_name = role_map.get(payload.role, payload.role.capitalize())
        user = User(
            username=payload.role,
            display_name=display_name,
            role=payload.role,
            password_hash=hash_password("kompas123"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        expires_in_hours=settings.session_ttl_hours,
    )


@router.get("/roles")
def list_roles():
    return {"roles": ROLE_INFO}
