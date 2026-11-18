import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import AccountRequest, AuditLog, User
from ..schemas import AccountDecision, AccountRequestCreate, AuthResponse, LoginRequest, UserOut, UserRoleChange
from ..security import create_access_token, get_current_user, hash_password, require_role, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_failures: dict[str, list[float]] = {}


def _throttle_key(request: Request, username: str) -> str:
    host = request.client.host if request.client else "?"
    return f"{host}|{username.lower()}"


def _check_throttle(key: str) -> None:
    now = time.monotonic()
    recent = [t for t in _failures.get(key, []) if now - t < settings.login_window_s]
    _failures[key] = recent
    if len(recent) >= settings.login_max_failures:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan login gagal. Coba lagi beberapa menit lagi.",
        )

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
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    key = _throttle_key(request, payload.username)
    _check_throttle(key)
    identifier = payload.username.strip()
    user = db.scalar(
        select(User).where((User.username == identifier) | (User.email == identifier.lower()))
    )
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        _failures.setdefault(key, []).append(time.monotonic())
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


@router.post("/register-request")
def register_request(payload: AccountRequestCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(AccountRequest).where(AccountRequest.email == payload.email, AccountRequest.status == "PENDING"))
    if existing:
        raise HTTPException(status_code=409, detail="Pengajuan dengan email ini sedang menunggu persetujuan owner.")
    db.add(
        AccountRequest(
            display_name=payload.display_name,
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            requested_role=payload.requested_role,
        )
    )
    db.commit()
    return {"message": "Pengajuan akses berhasil dikirim ke owner."}


@router.get("/account-requests")
def account_requests(db: Session = Depends(get_db), _owner: User = Depends(require_role("owner"))):
    requests = db.scalars(select(AccountRequest).order_by(AccountRequest.created_at.desc())).all()
    return {"requests": [
        {
            "id": item.id,
            "display_name": item.display_name,
            "email": item.email,
            "requested_role": item.requested_role,
            "status": item.status,
            "reviewed_by": item.reviewed_by,
            "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
            "created_at": item.created_at.isoformat(),
        }
        for item in requests
    ]}


@router.post("/account-requests/{request_id}/decision")
def decide_account_request(
    request_id: int,
    payload: AccountDecision,
    db: Session = Depends(get_db),
    owner: User = Depends(require_role("owner")),
):
    request = db.get(AccountRequest, request_id)
    if not request or request.status != "PENDING":
        raise HTTPException(status_code=404, detail="Pengajuan aktif tidak ditemukan.")
    request.status = "APPROVED" if payload.action == "approve" else "REJECTED"
    request.reviewed_by = owner.username
    request.reviewed_at = datetime.now(timezone.utc)
    if payload.action == "approve":
        username = request.email.split("@", 1)[0].lower().replace(".", "_")
        if db.scalar(select(User).where(User.username == username)):
            username = f"{username}_{request.id}"
        user = User(
            username=username,
            email=request.email,
            display_name=request.display_name,
            role=payload.role or request.requested_role,
            password_hash=request.password_hash,
            is_active=True,
        )
        db.add(user)
    db.add(AuditLog(actor=owner.username, action=f"account_request.{payload.action}", entity="account_request", entity_id=str(request.id)))
    db.commit()
    return {"message": f"Pengajuan berhasil {'disetujui' if payload.action == 'approve' else 'ditolak'}."}


@router.get("/users")
def list_users(db: Session = Depends(get_db), _owner: User = Depends(require_role("owner"))):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return {"users": [UserOut.model_validate(user).model_dump() | {"is_active": user.is_active, "created_at": user.created_at.isoformat()} for user in users]}


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    payload: UserRoleChange,
    db: Session = Depends(get_db),
    owner: User = Depends(require_role("owner")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")
    if user.id == owner.id and payload.role != "owner":
        raise HTTPException(status_code=400, detail="Role owner aktif tidak dapat diturunkan dari akun sendiri.")
    user.role = payload.role
    db.add(AuditLog(actor=owner.username, action="user.role.update", entity="user", entity_id=str(user.id), detail_json={"role": payload.role}))
    db.commit()
    return {"message": "Role pengguna berhasil diperbarui."}


@router.get("/roles")
def list_roles():
    return {"roles": ROLE_INFO}
