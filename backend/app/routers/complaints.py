from decimal import Decimal
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db, utcnow
from ..models import Complaint, User
from ..schemas import ComplaintOut, ComplaintUpdate
from ..security import get_current_user, get_current_user_optional
from ..services import complaint_service

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


class ComplaintCreate(BaseModel):
    summary: str
    category: str = "Lainnya"
    severity: str = "sedang"
    platform: str | None = "Shopee"
    sku: str | None = None
    customer_id: str | None = None
    estimated_cost: Decimal | None = None
    notes: str | None = None


@router.get("")
def list_complaints(
    status: str | None = None,
    severity: str | None = None,
    platform: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Complaint).order_by(Complaint.created_at.desc())
    if status:
        query = query.where(Complaint.status == status)
    if severity:
        query = query.where(Complaint.severity == severity)
    if platform:
        query = query.where(Complaint.platform == platform)

    complaints = db.scalars(query).all()
    statistics = complaint_service.stats(db)

    return {
        "complaints": [
            {
                "id": c.id,
                "ticket_no": c.ticket_no,
                "conversation_id": c.conversation_id,
                "customer_id": c.customer_id,
                "platform": c.platform,
                "sku": c.sku,
                "category": c.category,
                "severity": c.severity,
                "status": c.status,
                "summary": c.summary,
                "estimated_cost": str(c.estimated_cost) if c.estimated_cost is not None else None,
                "confirmed_cost": str(c.confirmed_cost) if c.confirmed_cost is not None else None,
                "source": c.source,
                "notes": c.notes,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in complaints
        ],
        "stats": statistics,
        "total": len(complaints),
    }


@router.get("/{id}")
def get_complaint(id: int, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Tiket keluhan tidak ditemukan.")

    tl = complaint_service.timeline(db, complaint)
    return {
        "complaint": {
            "id": complaint.id,
            "ticket_no": complaint.ticket_no,
            "conversation_id": complaint.conversation_id,
            "customer_id": complaint.customer_id,
            "platform": complaint.platform,
            "sku": complaint.sku,
            "category": complaint.category,
            "severity": complaint.severity,
            "status": complaint.status,
            "summary": complaint.summary,
            "estimated_cost": str(complaint.estimated_cost) if complaint.estimated_cost is not None else None,
            "confirmed_cost": str(complaint.confirmed_cost) if complaint.confirmed_cost is not None else None,
            "source": complaint.source,
            "notes": complaint.notes,
            "created_at": complaint.created_at.isoformat(),
            "updated_at": complaint.updated_at.isoformat() if complaint.updated_at else None,
        },
        "timeline": tl,
    }


@router.patch("/{id}")
def update_complaint(
    id: int,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "cs_staff"
    try:
        updated = complaint_service.update_complaint(db, id, payload, actor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Tiket keluhan berhasil diperbarui.",
        "complaint": {
            "id": updated.id,
            "ticket_no": updated.ticket_no,
            "status": updated.status,
            "severity": updated.severity,
            "notes": updated.notes,
            "confirmed_cost": str(updated.confirmed_cost) if updated.confirmed_cost is not None else None,
        },
    }


@router.post("")
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "cs_manual"
    now = utcnow()
    ym = now.strftime("%Y%m")
    prefix = f"TKT-{ym}-"
    last = db.scalar(
        select(Complaint.ticket_no)
        .where(Complaint.ticket_no.like(f"{prefix}%"))
        .order_by(Complaint.id.desc())
        .limit(1)
    )
    num = 1
    if last:
        try:
            num = int(last.split("-")[-1]) + 1
        except Exception:
            num = 1
    ticket_no = f"{prefix}{num:04d}"

    c = Complaint(
        ticket_no=ticket_no,
        customer_id=payload.customer_id,
        platform=payload.platform,
        sku=payload.sku,
        category=payload.category,
        severity=payload.severity,
        status="BARU",
        summary=payload.summary,
        estimated_cost=payload.estimated_cost,
        confirmed_cost=None,
        source="manual",
        notes=payload.notes,
        created_at=now,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"message": "Tiket keluhan berhasil dibuat.", "ticket_no": ticket_no, "id": c.id}
