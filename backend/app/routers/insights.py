from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Complaint,
    Product,
    StockSnapshot,
    Transaction,
    TransactionCalculation,
)
from ..services import complaint_service, product_brain, profit_engine

router = APIRouter(prefix="/api/insights", tags=["insights"])


class WhatIfRequest(BaseModel):
    sku: str | None = None
    marketplace: str | None = None
    price_change_pct: float = 0.0  # e.g., +5% or -10%
    discount_change_pct: float = 0.0
    commission_override_pct: float | None = None
    packing_cost_delta: float = 0.0


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    summary = profit_engine.build_summary(db)
    cmp_stats = complaint_service.stats(db)

    # Attention items
    attention = []
    # 1. Reconciliation required transactions
    recon_count = summary["kpi"].get("reconciliation_count", 0)
    if recon_count > 0:
        attention.append({
            "type": "RECONCILIATION",
            "level": "warning",
            "title": f"{recon_count} Transaksi Perlu Rekonsiliasi",
            "description": "Biaya komisi atau admin marketplace belum lengkap/sesuai aturan fee.",
            "link": "/profit",
        })

    # 2. Urgent complaints
    urgent_complaints = db.scalar(
        select(func.count(Complaint.id)).where(
            Complaint.status.in_(["BARU", "PERLU_PERHATIAN"]),
            Complaint.severity.in_(["tinggi", "kritis"]),
        )
    ) or 0
    if urgent_complaints > 0:
        attention.append({
            "type": "COMPLAINT",
            "level": "danger",
            "title": f"{urgent_complaints} Tiket Keluhan Prioritas Tinggi",
            "description": "Keluhan pelanggan memerlukan verifikasi biaya dan eskalasi CS.",
            "link": "/complaints",
        })

    # 3. Stock freshness & out-of-stock
    now = datetime.now()
    products = db.scalars(select(Product)).all()
    out_of_stock = 0
    stale_stock = 0
    for p in products:
        snap = product_brain.latest_stock(db, p.id)
        if not snap or snap.stock <= 0:
            out_of_stock += 1
        elif product_brain.stock_state(snap, now) == "KEDALUWARSA":
            stale_stock += 1

    if out_of_stock > 0:
        attention.append({
            "type": "STOCK",
            "level": "warning",
            "title": f"{out_of_stock} Produk Stok Habis / Kritis",
            "description": "Periksa gudang sebelum menerima pesanan di Chat Copilot.",
            "link": "/products",
        })

    shipping_rule = product_brain.get_shipping_rule(db)
    today_capacity = product_brain.get_capacity_day(db, now.date())
    capacity_context = product_brain.shipping_context(db, now)

    return {
        "kpi": summary["kpi"],
        "period": summary["period"],
        "status_counts": summary["status_counts"],
        "by_marketplace": summary["by_marketplace"],
        "by_day": summary["by_day"],
        "top_products": summary["top_products"],
        "cost_breakdown": summary["cost_breakdown"],
        "attention": attention,
        "complaints_summary": cmp_stats,
        "operations": {
            "shipping_rule": {
                "cutoff_weekday": shipping_rule.cutoff_weekday if shipping_rule else "14:00",
                "cutoff_saturday": shipping_rule.cutoff_saturday if shipping_rule else "12:00",
                "daily_capacity": shipping_rule.packing_capacity_per_day if shipping_rule else 700,
            },
            "today_capacity": {
                "capacity": today_capacity.capacity if today_capacity else 700,
                "used": today_capacity.used if today_capacity else 0,
                "remaining": max(0, (today_capacity.capacity if today_capacity else 700) - (today_capacity.used if today_capacity else 0)),
                "is_closed": today_capacity.is_closed if today_capacity else False,
            },
            "capacity_context": capacity_context,
        },
        "formula_version": summary.get("formula_version", "profit-v1"),
        "margin_base": summary.get("margin_base", "NET_REVENUE"),
        "is_demo": True,
    }


@router.get("/detective")
def get_profit_detective(db: Session = Depends(get_db)):
    run = profit_engine.latest_run(db)
    if not run:
        return {"detective_items": [], "summary": {}}

    calcs = db.execute(
        select(TransactionCalculation, Transaction)
        .join(Transaction, Transaction.id == TransactionCalculation.transaction_pk)
        .where(TransactionCalculation.run_id == run.id)
    ).all()

    negative_margin_items = []
    recon_items = []
    high_return_items = []
    platform_drags = {"Shopee": Decimal("0"), "TikTok Shop": Decimal("0"), "Lazada": Decimal("0")}

    for calc, tx in calcs:
        # Negative margin
        if calc.profit is not None and calc.profit < 0:
            negative_margin_items.append({
                "transaction_id": tx.transaction_id,
                "sku": tx.sku,
                "marketplace": tx.marketplace,
                "gross_sales": str(tx.gross_sales),
                "profit": str(calc.profit),
                "margin_pct": str(calc.margin_pct) if calc.margin_pct else None,
                "reason": "Beban biaya (komisi, ongkir seller, atau retur) melampaui margin kotor.",
            })

        # Reconciliation required
        if calc.status == profit_engine.STATUS_RECON:
            recon_items.append({
                "transaction_id": tx.transaction_id,
                "sku": tx.sku,
                "marketplace": tx.marketplace,
                "warnings": calc.warnings_json or [],
            })

        # Return logistics cost
        if tx.return_logistics_cost and tx.return_logistics_cost > 0:
            high_return_items.append({
                "transaction_id": tx.transaction_id,
                "sku": tx.sku,
                "marketplace": tx.marketplace,
                "return_cost": str(tx.return_logistics_cost),
                "refund": str(tx.refund_amount) if tx.refund_amount else "0.00",
            })

        # Accumulate marketplace commissions
        if tx.marketplace in platform_drags and tx.marketplace_commission:
            platform_drags[tx.marketplace] += tx.marketplace_commission

    return {
        "negative_margin_count": len(negative_margin_items),
        "negative_margin_samples": negative_margin_items[:10],
        "reconciliation_count": len(recon_items),
        "reconciliation_samples": recon_items[:10],
        "high_return_count": len(high_return_items),
        "high_return_samples": high_return_items[:10],
        "platform_commission_totals": {
            k: str(v.quantize(Decimal("0.01"))) for k, v in platform_drags.items()
        },
        "insights": [
            {
                "category": "Kebocoran Margin",
                "finding": f"Ditemukan {len(negative_margin_items)} transaksi dengan margin bersih negatif.",
                "recommendation": "Evaluasi promo penjual dan subsidi ongkir berlebih pada SKU terkait.",
            },
            {
                "category": "Audit Biaya Marketplace",
                "finding": f"{len(recon_items)} transaksi membutuhkan rekonsiliasi aturan fee.",
                "recommendation": "Pastikan tabel fee_rules diperbarui sesuai kategori produk.",
            },
            {
                "category": "Dampak Retur & Komplain",
                "finding": f"{len(high_return_items)} pesanan mencatat biaya logistik retur.",
                "recommendation": "Terapkan standard operating packing bubble wrap ganda pada botol parfum dan cairan zamzam.",
            },
        ],
    }


@router.post("/what-if")
def simulate_what_if(payload: WhatIfRequest, db: Session = Depends(get_db)):
    run = profit_engine.latest_run(db)
    if not run:
        return {"error": "Belum ada run kalkulasi."}

    calcs = db.execute(
        select(TransactionCalculation, Transaction)
        .join(Transaction, Transaction.id == TransactionCalculation.transaction_pk)
        .where(
            TransactionCalculation.run_id == run.id,
            TransactionCalculation.status == profit_engine.STATUS_COMPLETE,
        )
    ).all()

    orig_revenue = Decimal("0")
    orig_profit = Decimal("0")
    sim_revenue = Decimal("0")
    sim_profit = Decimal("0")
    evaluated_tx = 0

    price_factor = Decimal(str(1.0 + (payload.price_change_pct / 100.0)))
    discount_factor = Decimal(str(1.0 + (payload.discount_change_pct / 100.0)))
    packing_delta = Decimal(str(payload.packing_cost_delta))

    for calc, tx in calcs:
        if payload.sku and tx.sku != payload.sku:
            continue
        if payload.marketplace and tx.marketplace != payload.marketplace:
            continue

        evaluated_tx += 1
        orig_revenue += calc.net_revenue or Decimal("0")
        orig_profit += calc.profit or Decimal("0")

        # Simulate
        new_gross = tx.gross_sales * price_factor
        new_discount = (tx.seller_discount or Decimal("0")) * discount_factor
        new_refund = tx.refund_amount or Decimal("0")
        new_net = new_gross - new_discount - new_refund

        # Commission
        if payload.commission_override_pct is not None:
            new_comm = new_gross * Decimal(str(payload.commission_override_pct / 100.0))
        else:
            new_comm = tx.marketplace_commission or Decimal("0")

        new_packing = (tx.packing_cost or Decimal("0")) + packing_delta
        costs = (
            (tx.cogs or Decimal("0"))
            + new_comm
            + (tx.fixed_fee or Decimal("0"))
            + (tx.seller_shipping_cost or Decimal("0"))
            + new_packing
            + (tx.return_logistics_cost or Decimal("0"))
            + (tx.other_costs or Decimal("0"))
        )

        sim_rev_item = max(Decimal("0"), new_net)
        sim_prof_item = new_net - costs

        sim_revenue += sim_rev_item
        sim_profit += sim_prof_item

    orig_margin = (
        round(float(orig_profit / orig_revenue * 100), 2) if orig_revenue > 0 else 0.0
    )
    sim_margin = (
        round(float(sim_profit / sim_revenue * 100), 2) if sim_revenue > 0 else 0.0
    )

    return {
        "evaluated_transactions": evaluated_tx,
        "original": {
            "net_revenue": str(orig_revenue.quantize(Decimal("0.01"))),
            "profit": str(orig_profit.quantize(Decimal("0.01"))),
            "margin_pct": orig_margin,
        },
        "simulation": {
            "net_revenue": str(sim_revenue.quantize(Decimal("0.01"))),
            "profit": str(sim_profit.quantize(Decimal("0.01"))),
            "margin_pct": sim_margin,
            "profit_delta": str((sim_profit - orig_profit).quantize(Decimal("0.01"))),
            "margin_delta_pct": round(sim_margin - orig_margin, 2),
        },
    }
