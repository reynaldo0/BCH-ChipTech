from datetime import date
from decimal import Decimal
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CalculationRun, Product, Transaction, TransactionCalculation, User
from ..security import get_current_user_optional
from ..services import profit_engine

router = APIRouter(prefix="/api/profit", tags=["profit"])


class CalculateRequest(BaseModel):
    scope: str = "all"


@router.get("/summary")
def get_profit_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    marketplace: str | None = None,
    sku: str | None = None,
    status: str | None = None,
    run_id: int | None = None,
    db: Session = Depends(get_db),
):
    summary = profit_engine.build_summary(
        db=db,
        run_id=run_id,
        start_date=start_date,
        end_date=end_date,
        marketplace=marketplace,
        sku=sku,
        status=status,
    )
    return summary


@router.get("/transactions")
def list_transactions(
    marketplace: str | None = None,
    status: str | None = None,
    calc_status: str | None = None,
    sku: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    run = profit_engine.latest_run(db)
    run_id = run.id if run else None

    query = select(Transaction, TransactionCalculation).outerjoin(
        TransactionCalculation,
        (TransactionCalculation.transaction_pk == Transaction.id)
        & (TransactionCalculation.run_id == run_id),
    ).order_by(Transaction.transaction_date.desc(), Transaction.id.desc())

    if marketplace:
        query = query.where(Transaction.marketplace == marketplace)
    if status:
        query = query.where(Transaction.status == status)
    if calc_status:
        query = query.where(TransactionCalculation.status == calc_status)
    if sku:
        query = query.where(Transaction.sku == sku)
    if search:
        s = f"%{search}%"
        query = query.where(
            (Transaction.transaction_id.ilike(s))
            | (Transaction.order_id.ilike(s))
            | (Transaction.sku.ilike(s))
        )

    # Count total
    # For pagination
    offset = (page - 1) * limit
    rows = db.execute(query.offset(offset).limit(limit)).all()

    items = []
    for tx, calc in rows:
        items.append({
            "id": tx.id,
            "transaction_id": tx.transaction_id,
            "order_id": tx.order_id,
            "marketplace": tx.marketplace,
            "transaction_date": tx.transaction_date.isoformat(),
            "sku": tx.sku,
            "qty": tx.qty,
            "gross_sales": str(tx.gross_sales),
            "seller_discount": str(tx.seller_discount) if tx.seller_discount is not None else None,
            "refund_amount": str(tx.refund_amount) if tx.refund_amount is not None else None,
            "cogs": str(tx.cogs) if tx.cogs is not None else None,
            "marketplace_commission": str(tx.marketplace_commission) if tx.marketplace_commission is not None else None,
            "fixed_fee": str(tx.fixed_fee) if tx.fixed_fee is not None else None,
            "seller_shipping_cost": str(tx.seller_shipping_cost) if tx.seller_shipping_cost is not None else None,
            "packing_cost": str(tx.packing_cost) if tx.packing_cost is not None else None,
            "return_logistics_cost": str(tx.return_logistics_cost) if tx.return_logistics_cost is not None else None,
            "other_costs": str(tx.other_costs) if tx.other_costs is not None else None,
            "status": tx.status,
            # Calculation
            "calc_status": calc.status if calc else "NOT_CALCULATED",
            "net_revenue": str(calc.net_revenue) if calc and calc.net_revenue is not None else None,
            "total_cost": str(calc.total_cost) if calc and calc.total_cost is not None else None,
            "profit": str(calc.profit) if calc and calc.profit is not None else None,
            "margin_pct": str(calc.margin_pct) if calc and calc.margin_pct is not None else None,
            "warnings": calc.warnings_json if calc and calc.warnings_json else [],
        })

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": len(items),
        "run_id": run_id,
    }


@router.get("/transactions/{id}")
def get_transaction_detail(id: int, db: Session = Depends(get_db)):
    tx = db.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")

    run = profit_engine.latest_run(db)
    calc = None
    if run:
        calc = db.scalar(
            select(TransactionCalculation).where(
                TransactionCalculation.transaction_pk == tx.id,
                TransactionCalculation.run_id == run.id,
            )
        )

    product = db.get(Product, tx.product_id) if tx.product_id else None

    return {
        "transaction": {
            "id": tx.id,
            "transaction_id": tx.transaction_id,
            "order_id": tx.order_id,
            "marketplace": tx.marketplace,
            "transaction_date": tx.transaction_date.isoformat(),
            "sku": tx.sku,
            "product_name": product.name if product else None,
            "qty": tx.qty,
            "gross_sales": str(tx.gross_sales),
            "seller_discount": str(tx.seller_discount) if tx.seller_discount is not None else None,
            "refund_amount": str(tx.refund_amount) if tx.refund_amount is not None else None,
            "cogs": str(tx.cogs) if tx.cogs is not None else None,
            "marketplace_commission": str(tx.marketplace_commission) if tx.marketplace_commission is not None else None,
            "fixed_fee": str(tx.fixed_fee) if tx.fixed_fee is not None else None,
            "seller_shipping_cost": str(tx.seller_shipping_cost) if tx.seller_shipping_cost is not None else None,
            "packing_cost": str(tx.packing_cost) if tx.packing_cost is not None else None,
            "return_logistics_cost": str(tx.return_logistics_cost) if tx.return_logistics_cost is not None else None,
            "other_costs": str(tx.other_costs) if tx.other_costs is not None else None,
            "fee_rule_version": tx.fee_rule_version,
            "status": tx.status,
            "notes": tx.notes,
        },
        "calculation": {
            "status": calc.status if calc else "NOT_CALCULATED",
            "net_revenue": str(calc.net_revenue) if calc and calc.net_revenue is not None else None,
            "total_cost": str(calc.total_cost) if calc and calc.total_cost is not None else None,
            "profit": str(calc.profit) if calc and calc.profit is not None else None,
            "margin_pct": str(calc.margin_pct) if calc and calc.margin_pct is not None else None,
            "warnings": calc.warnings_json if calc and calc.warnings_json else [],
            "trace": calc.trace_json if calc else {},
        } if calc else None,
    }


@router.post("/calculate")
def recalculate_profit(
    payload: CalculateRequest = CalculateRequest(),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "profit_manual"
    run = profit_engine.run_calculation(db, scope=payload.scope, actor=actor)
    summary = profit_engine.build_summary(db, run_id=run.id)
    return {
        "message": "Kalkulasi profit deterministik selesai.",
        "run_id": run.id,
        "summary": summary,
    }


@router.get("/runs")
def list_runs(limit: int = 10, db: Session = Depends(get_db)):
    runs = db.scalars(
        select(CalculationRun).order_by(CalculationRun.created_at.desc()).limit(limit)
    ).all()
    return {
        "runs": [
            {
                "id": r.id,
                "formula_version": r.formula_version,
                "margin_base": r.margin_base,
                "scope": r.scope,
                "created_by": r.created_by,
                "created_at": r.created_at.isoformat(),
            }
            for r in runs
        ]
    }
