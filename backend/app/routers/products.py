from datetime import date, datetime
from decimal import Decimal
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db, utcnow
from ..models import (
    AuditLog,
    CapacityDay,
    Faq,
    OperationalRule,
    Product,
    ProductEvidence,
    ShippingRule,
    StockSnapshot,
    User,
)
from ..schemas import StockSnapshotIn
from ..security import get_current_user, require_role
from ..services import product_brain

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_all_products(
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Product).order_by(Product.name)
    if category:
        query = query.where(Product.category == category)
    products = db.scalars(query).all()

    results = []
    now = datetime.now()
    for p in products:
        if q:
            term = q.lower()
            if term not in p.name.lower() and term not in p.sku.lower():
                continue

        snap = product_brain.latest_stock(db, p.id)
        current_stock = snap.stock if snap else 0
        state = product_brain.stock_state(snap, now)
        age = product_brain.stock_age_hours(snap, now) if snap else None

        # Evidence count
        ev_list = db.scalars(select(ProductEvidence).where(ProductEvidence.product_id == p.id)).all()
        valid_ev = [e for e in ev_list if product_brain.evidence_is_valid(e, now.date())]

        # Margin reference
        margin_ref = None
        if p.price and p.modal and p.price > 0:
            margin_ref = round(float((p.price - p.modal) / p.price * 100), 1)

        results.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "variant": p.variant,
            "unit": p.unit,
            "modal": str(p.modal) if p.modal is not None else None,
            "price": str(p.price) if p.price is not None else None,
            "margin_ref_pct": margin_ref,
            "is_active": p.is_active,
            "stock": current_stock,
            "stock_state": state,
            "stock_age_hours": age,
            "stock_updated_at": snap.captured_at.isoformat() if snap else None,
            "evidence_count": len(ev_list),
            "evidence_valid_count": len(valid_ev),
            "has_halal": any(e.evidence_type == "halal" and product_brain.evidence_is_valid(e, now.date()) for e in ev_list),
            "has_bpom": any(e.evidence_type == "bpom" and product_brain.evidence_is_valid(e, now.date()) for e in ev_list),
        })

    return {"products": results, "total": len(results)}


@router.get("/rules/operational")
def list_operational_rules(db: Session = Depends(get_db)):
    rules = db.scalars(select(OperationalRule).order_by(OperationalRule.code)).all()
    return {
        "rules": [
            {
                "code": r.code,
                "category": r.category,
                "parameter": r.parameter,
                "rule_text": r.rule_text,
                "scope": r.scope,
            }
            for r in rules
        ]
    }


@router.get("/rules/shipping")
def get_shipping_info(db: Session = Depends(get_db)):
    rule = product_brain.get_shipping_rule(db)
    now = datetime.now()
    ctx = product_brain.shipping_context(db, now)
    return {
        "rule": {
            "name": rule.name if rule else "Aturan Standar",
            "timezone": rule.timezone if rule else "Asia/Jakarta",
            "cutoff_weekday": rule.cutoff_weekday if rule else "14:00",
            "cutoff_saturday": rule.cutoff_saturday if rule else "12:00",
            "packing_capacity_per_day": rule.packing_capacity_per_day if rule else 700,
            "cs_schedule": rule.cs_schedule if rule else "Senin-Sabtu 08:00-17:00 WIB",
        },
        "context": ctx,
    }


@router.get("/rules/capacity")
def list_capacity_days(
    limit: int = 30,
    db: Session = Depends(get_db),
):
    days = db.scalars(
        select(CapacityDay).order_by(CapacityDay.day.desc()).limit(limit)
    ).all()
    return {
        "capacity_days": [
            {
                "day": d.day.isoformat(),
                "capacity": d.capacity,
                "used": d.used,
                "remaining": max(0, d.capacity - d.used),
                "is_closed": d.is_closed,
                "note": d.note,
                "usage_pct": round(float(d.used / d.capacity * 100), 1) if d.capacity > 0 else 0,
            }
            for d in reversed(days)
        ]
    }


@router.get("/rules/faqs")
def list_faqs(db: Session = Depends(get_db)):
    faqs = db.scalars(select(Faq).order_by(Faq.code)).all()
    return {
        "faqs": [
            {
                "code": f.code,
                "category": f.category,
                "question": f.question,
                "answer": f.answer,
                "ops_refs": f.ops_refs,
            }
            for f in faqs
        ]
    }


@router.get("/{id}")
def get_product_detail(id: int, db: Session = Depends(get_db)):
    product = db.get(Product, id)
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")

    now = datetime.now()
    snap = product_brain.latest_stock(db, product.id)
    state = product_brain.stock_state(snap, now)
    snapshots = db.scalars(
        select(StockSnapshot)
        .where(StockSnapshot.product_id == product.id)
        .order_by(StockSnapshot.captured_at.desc())
        .limit(10)
    ).all()

    evidence = db.scalars(
        select(ProductEvidence).where(ProductEvidence.product_id == product.id)
    ).all()

    return {
        "product": {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "category": product.category,
            "variant": product.variant,
            "unit": product.unit,
            "modal": str(product.modal) if product.modal is not None else None,
            "price": str(product.price) if product.price is not None else None,
            "is_active": product.is_active,
            "stock": snap.stock if snap else 0,
            "stock_state": state,
            "stock_updated_at": snap.captured_at.isoformat() if snap else None,
        },
        "snapshots": [
            {
                "id": s.id,
                "stock": s.stock,
                "captured_at": s.captured_at.isoformat(),
                "source": s.source,
            }
            for s in snapshots
        ],
        "evidence": [
            {
                "id": e.id,
                "evidence_type": e.evidence_type,
                "issuer": e.issuer,
                "document_no": e.document_no,
                "valid_from": e.valid_from.isoformat() if e.valid_from else None,
                "valid_to": e.valid_to.isoformat() if e.valid_to else None,
                "status": e.status,
                "is_valid": product_brain.evidence_is_valid(e, now.date()),
                "file_ref": e.file_ref,
                "notes": e.notes,
            }
            for e in evidence
        ],
    }


@router.post("/{id}/stock")
def update_product_stock(
    id: int,
    payload: StockSnapshotIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.get(Product, id)
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")

    snapshot = StockSnapshot(
        product_id=product.id,
        stock=payload.stock,
        captured_at=payload.captured_at or utcnow(),
        source=f"manual_{current_user.username}",
        is_demo=True,
    )
    db.add(snapshot)
    db.add(
        AuditLog(
            actor=current_user.username,
            action="stock.update",
            entity="product",
            entity_id=product.sku,
            detail_json={"stock": payload.stock, "product_id": product.id},
        )
    )
    db.commit()
    return {"message": "Stok berhasil diperbarui.", "stock": payload.stock}
