"""Complaint Center helpers: status flow, cost separation, audit timeline."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditLog, Complaint
from ..schemas import ComplaintUpdate

STATUSES = ("BARU", "PERLU_PERHATIAN", "MENUNGGU", "SELESAI", "DITOLAK")
STATUS_LABELS = {
    "BARU": "Baru",
    "PERLU_PERHATIAN": "Perlu perhatian",
    "MENUNGGU": "Menunggu informasi",
    "SELESAI": "Selesai",
    "DITOLAK": "Ditolak",
}


def update_complaint(
    db: Session, complaint_id: int, payload: ComplaintUpdate, actor: str
) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise ValueError("Tiket keluhan tidak ditemukan.")
    before = {
        "status": complaint.status,
        "severity": complaint.severity,
        "notes": complaint.notes,
        "confirmed_cost": str(complaint.confirmed_cost) if complaint.confirmed_cost is not None else None,
    }
    if payload.status is not None:
        if payload.status not in STATUSES:
            raise ValueError("Status keluhan tidak dikenal.")
        complaint.status = payload.status
    if payload.severity is not None:
        complaint.severity = payload.severity
    if payload.notes is not None:
        complaint.notes = payload.notes
    if payload.confirmed_cost is not None:
        if payload.confirmed_cost < 0:
            raise ValueError("Biaya terkonfirmasi tidak boleh negatif.")
        complaint.confirmed_cost = payload.confirmed_cost
    complaint.updated_at = datetime.now()
    after = {
        "status": complaint.status,
        "severity": complaint.severity,
        "notes": complaint.notes,
        "confirmed_cost": str(complaint.confirmed_cost) if complaint.confirmed_cost is not None else None,
    }
    db.add(
        AuditLog(
            actor=actor,
            action="complaint.update",
            entity="complaint",
            entity_id=complaint.ticket_no,
            detail_json={"before": before, "after": after},
        )
    )
    db.commit()
    db.refresh(complaint)
    return complaint


def timeline(db: Session, complaint: Complaint) -> list[dict[str, Any]]:
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.entity == "complaint", AuditLog.entity_id == complaint.ticket_no)
        .order_by(AuditLog.created_at)
    )
    return [
        {
            "action": log.action,
            "actor": log.actor,
            "created_at": log.created_at.isoformat(),
            "detail": log.detail_json or {},
        }
        for log in logs
    ]


def stats(db: Session) -> dict[str, Any]:
    rows = db.execute(
        select(Complaint.status, func.count()).group_by(Complaint.status)
    ).all()
    counts = {status: 0 for status in STATUSES}
    for status, count in rows:
        counts[status] = count
    severity_rows = db.execute(
        select(Complaint.severity, func.count()).group_by(Complaint.severity)
    ).all()
    confirmed = db.scalar(
        select(func.coalesce(func.sum(Complaint.confirmed_cost), Decimal("0")))
    ) or Decimal("0")
    estimated = db.scalar(
        select(func.coalesce(func.sum(Complaint.estimated_cost), Decimal("0")))
    ) or Decimal("0")
    return {
        "status_counts": counts,
        "total": sum(counts.values()),
        "severity_counts": {severity: count for severity, count in severity_rows},
        "confirmed_cost_total": str(confirmed),
        "estimated_cost_total": str(estimated),
        "note": "Estimasi dan biaya terkonfirmasi dipisahkan; estimasi tidak masuk Profit Engine.",
    }
