from __future__ import annotations

from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import AuditLog, FeeRule, User
from ..schemas import FeeRuleOut
from ..security import get_current_user_optional, require_admin, require_finance, require_role
from ..seeder import seed_all

router = APIRouter(prefix="/api/settings", tags=["settings"])


class FeeRuleCreate(BaseModel):
    marketplace: str
    category: str = "ALL"
    version: str = "v1"
    effective_from: date
    effective_to: date | None = None
    commission_pct: Decimal = Decimal("0")
    fixed_fee: Decimal = Decimal("0")
    admin_pct: Decimal = Decimal("0")
    notes: str | None = None


@router.get("/fee-rules")
def list_fee_rules(db: Session = Depends(get_db), _user: User = Depends(require_finance)):
    rules = db.scalars(select(FeeRule).order_by(FeeRule.marketplace, FeeRule.effective_from.desc())).all()
    return {
        "fee_rules": [
            {
                "id": r.id,
                "marketplace": r.marketplace,
                "category": r.category,
                "version": r.version,
                "effective_from": r.effective_from.isoformat(),
                "effective_to": r.effective_to.isoformat() if r.effective_to else None,
                "commission_pct": str(r.commission_pct),
                "fixed_fee": str(r.fixed_fee),
                "admin_pct": str(r.admin_pct),
                "notes": r.notes,
            }
            for r in rules
        ]
    }


@router.post("/fee-rules")
def create_fee_rule(
    payload: FeeRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    actor = current_user.username
    fee = FeeRule(
        marketplace=payload.marketplace,
        category=payload.category,
        version=payload.version,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        commission_pct=payload.commission_pct,
        fixed_fee=payload.fixed_fee,
        admin_pct=payload.admin_pct,
        notes=payload.notes,
    )
    db.add(fee)
    db.add(
        AuditLog(
            actor=actor,
            action="fee_rule.create",
            entity="fee_rule",
            entity_id=f"{payload.marketplace}-{payload.version}",
            detail_json=payload.model_dump(mode="json"),
        )
    )
    db.commit()
    db.refresh(fee)
    return {"message": "Aturan biaya marketplace berhasil ditambahkan.", "id": fee.id}


@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    action: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_finance),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.where(AuditLog.action == action)
    logs = db.scalars(query.limit(limit)).all()

    return {
        "logs": [
            {
                "id": l.id,
                "actor": l.actor,
                "action": l.action,
                "entity": l.entity,
                "entity_id": l.entity_id,
                "detail": l.detail_json,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ]
    }


@router.post("/reset-demo")
def reset_demo_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Reset data hanya tersedia di mode demo.")
    actor = current_user.username
    seed_all(force=True)
    return {
        "message": "Basis data demo berhasil di-reset ulang ke kondisi awal lengkap.",
        "actor": actor,
    }
