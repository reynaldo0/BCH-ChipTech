"""Deterministic profit calculator.

Locked defaults (see DECISIONS.md):
- margin basis: NET_REVENUE
- formula: profit-v1
- rounding: ROUND_HALF_UP, money quantised to 2 decimals, display 0 decimals
- fixed fee basis: per order
- COGS: transaction value, fallback to Product Brain modal * qty
- null is never zero
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    AuditLog,
    CalculationRun,
    FeeRule,
    Product,
    StockSnapshot,
    Transaction,
    TransactionCalculation,
)

Q2 = Decimal("0.01")
Q4 = Decimal("0.0001")
ZERO = Decimal("0")
MONEY_FIELDS = (
    "gross_sales",
    "seller_discount",
    "refund_amount",
    "cogs",
    "marketplace_commission",
    "fixed_fee",
    "seller_shipping_cost",
    "packing_cost",
    "return_logistics_cost",
)
REQUIRED_COST_FIELDS = (
    "cogs",
    "marketplace_commission",
    "fixed_fee",
    "seller_shipping_cost",
    "packing_cost",
    "return_logistics_cost",
)
COMPONENT_LABELS = {
    "cogs": "Modal barang",
    "marketplace_commission": "Komisi marketplace",
    "fixed_fee": "Biaya tetap/administrasi",
    "seller_shipping_cost": "Ongkir ditanggung penjual",
    "packing_cost": "Biaya packing",
    "return_logistics_cost": "Biaya logistik retur",
    "other_costs": "Biaya lain",
}

STATUS_COMPLETE = "COMPLETE"
STATUS_PARTIAL = "PARTIAL"
STATUS_RECON = "RECONCILIATION_REQUIRED"
STATUS_INVALID = "NOT_CALCULABLE"
STATUS_LABELS = {
    STATUS_COMPLETE: "Lengkap",
    STATUS_PARTIAL: "Parsial",
    STATUS_RECON: "Perlu rekonsiliasi",
    STATUS_INVALID: "Tidak dapat dihitung",
}


def q2(value: Decimal) -> Decimal:
    return value.quantize(Q2, rounding=ROUND_HALF_UP)


def q4(value: Decimal) -> Decimal:
    return value.quantize(Q4, rounding=ROUND_HALF_UP)


def decimal_or_none(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


@dataclass
class FeeRuleSnapshot:
    id: int | None
    version: str
    marketplace: str
    category: str
    effective_from: date
    effective_to: date | None
    commission_pct: Decimal
    fixed_fee: Decimal
    admin_pct: Decimal

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "version": self.version,
            "marketplace": self.marketplace,
            "category": self.category,
            "effective_from": self.effective_from.isoformat(),
            "effective_to": self.effective_to.isoformat() if self.effective_to else None,
            "commission_pct": str(self.commission_pct),
            "fixed_fee": str(self.fixed_fee),
            "admin_pct": str(self.admin_pct),
        }


@dataclass
class ProfitInput:
    transaction_id: str
    transaction_date: date
    marketplace: str
    sku: str
    qty: int
    gross_sales: Decimal | None
    order_id: str | None = None
    seller_discount: Decimal | None = None
    refund_amount: Decimal | None = None
    cogs: Decimal | None = None
    marketplace_commission: Decimal | None = None
    fixed_fee: Decimal | None = None
    seller_shipping_cost: Decimal | None = None
    packing_cost: Decimal | None = None
    return_logistics_cost: Decimal | None = None
    other_costs: list[Decimal] | None = None
    product_modal: Decimal | None = None
    product_exists: bool = True
    fee_rule: FeeRuleSnapshot | None = None
    duplicate_transaction: bool = False
    duplicate_fixed_fee_order: bool = False
    source_status: str = "completed"
    fixed_fee_allocated: bool = False
    order_fixed_fee_total: Decimal | None = None


@dataclass
class ProfitResult:
    net_revenue: Decimal | None
    total_cost: Decimal | None
    profit: Decimal | None
    margin_pct: Decimal | None
    status: str
    warnings: list[str] = field(default_factory=list)
    trace: dict[str, Any] = field(default_factory=dict)


def _fee_snapshot(rule: FeeRule | None) -> FeeRuleSnapshot | None:
    if rule is None:
        return None
    return FeeRuleSnapshot(
        id=rule.id,
        version=rule.version,
        marketplace=rule.marketplace,
        category=rule.category,
        effective_from=rule.effective_from,
        effective_to=rule.effective_to,
        commission_pct=rule.commission_pct,
        fixed_fee=rule.fixed_fee,
        admin_pct=rule.admin_pct,
    )


def calculate(data: ProfitInput) -> ProfitResult:
    warnings: list[str] = []
    missing: list[str] = []

    if data.qty is None or data.qty <= 0:
        return ProfitResult(
            net_revenue=None,
            total_cost=None,
            profit=None,
            margin_pct=None,
            status=STATUS_INVALID,
            warnings=["Kuantitas harus bilangan positif."],
            trace={"formula_version": settings.formula_version, "missing": ["qty"]},
        )
    if data.gross_sales is None:
        return ProfitResult(
            net_revenue=None,
            total_cost=None,
            profit=None,
            margin_pct=None,
            status=STATUS_INVALID,
            warnings=["Penjualan bruto tidak tersedia."],
            trace={"formula_version": settings.formula_version, "missing": ["gross_sales"]},
        )
    if data.gross_sales < 0:
        return ProfitResult(
            net_revenue=None,
            total_cost=None,
            profit=None,
            margin_pct=None,
            status=STATUS_INVALID,
            warnings=["Penjualan bruto negatif."],
            trace={"formula_version": settings.formula_version, "invalid": ["gross_sales"]},
        )

    gross = q2(data.gross_sales)
    discount = data.seller_discount
    refund = data.refund_amount
    if discount is None:
        missing.append("seller_discount")
    if refund is None:
        missing.append("refund_amount")

    net_revenue: Decimal | None
    if discount is None or refund is None:
        net_revenue = None
    else:
        net_revenue = q2(gross - discount - refund)

    # COGS: explicit value wins; otherwise Product Brain modal * qty.
    cogs = data.cogs
    cogs_source = "transaction"
    if cogs is None and data.product_exists and data.product_modal is not None:
        cogs = q2(data.product_modal * Decimal(data.qty))
        cogs_source = "product_fallback"
    elif cogs is None:
        cogs_source = "missing"
    if cogs is None:
        missing.append("cogs")

    # Commission and fixed fee may be derived from a matching fee rule.
    commission = data.marketplace_commission
    commission_source = "transaction"
    fixed_fee = data.fixed_fee
    fixed_fee_source = "transaction"
    rule = data.fee_rule

    if rule is None:
        if commission is None:
            missing.append("marketplace_commission")
            commission_source = "missing"
        if fixed_fee is None:
            missing.append("fixed_fee")
            fixed_fee_source = "missing"
        warnings.append("Fee rule tidak ditemukan untuk marketplace/tanggal ini.")
    else:
        expected_commission = q2(
            gross * (rule.commission_pct + rule.admin_pct) / Decimal("100")
        )
        # Nothing is charged on a line whose net sale is zero (e.g. 100% voucher).
        fully_discounted = net_revenue is not None and net_revenue <= 0
        if commission is None:
            commission = ZERO if fully_discounted else expected_commission
            commission_source = "fee_rule"
        elif fully_discounted and q2(commission) == ZERO:
            pass
        elif abs(q2(commission) - expected_commission) > Decimal("2"):
            warnings.append(
                "Komisi transaksi tidak cocok dengan fee rule "
                f"(input {q2(commission)}, acuan {expected_commission})."
            )
        if data.fixed_fee_allocated:
            fixed_fee_source = "order_allocation"
            if data.order_fixed_fee_total is not None and abs(
                q2(data.order_fixed_fee_total) - q2(rule.fixed_fee)
            ) > Decimal("2"):
                warnings.append(
                    "Biaya tetap pesanan tidak cocok dengan fee rule "
                    f"(input {q2(data.order_fixed_fee_total)}, acuan {q2(rule.fixed_fee)})."
                )
        elif fixed_fee is None:
            fixed_fee = q2(rule.fixed_fee)
            fixed_fee_source = "fee_rule"
        elif fully_discounted and q2(fixed_fee) == ZERO:
            pass
        elif abs(q2(fixed_fee) - q2(rule.fixed_fee)) > Decimal("2"):
            warnings.append(
                "Biaya tetap transaksi tidak cocok dengan fee rule "
                f"(input {q2(fixed_fee)}, acuan {q2(rule.fixed_fee)})."
            )

    for name in ("seller_shipping_cost", "packing_cost", "return_logistics_cost"):
        if getattr(data, name) is None:
            missing.append(name)

    other_total = q2(sum(data.other_costs, ZERO)) if data.other_costs else ZERO
    components = {
        "cogs": q2(cogs) if cogs is not None else None,
        "marketplace_commission": q2(commission) if commission is not None else None,
        "fixed_fee": q2(fixed_fee) if fixed_fee is not None else None,
        "seller_shipping_cost": q2(data.seller_shipping_cost)
        if data.seller_shipping_cost is not None
        else None,
        "packing_cost": q2(data.packing_cost) if data.packing_cost is not None else None,
        "return_logistics_cost": q2(data.return_logistics_cost)
        if data.return_logistics_cost is not None
        else None,
        "other_costs": other_total,
    }
    known_cost = q2(sum(value for value in components.values() if value is not None))

    reconciliation: list[str] = []
    if data.duplicate_transaction:
        reconciliation.append("ID transaksi duplikat; jangan menghitung dua kali.")
    if data.duplicate_fixed_fee_order:
        reconciliation.append(
            "Biaya tetap per order terdeteksi di beberapa baris order yang sama; "
            "potensi double count."
        )
    if not data.product_exists:
        reconciliation.append("SKU tidak cocok dengan Product Brain (unmatched).")
    if rule is None:
        reconciliation.append("Fee rule tidak ditemukan.")
    if warnings:
        reconciliation.extend(warnings)

    if discount is not None and discount > gross:
        reconciliation.append("Diskon penjual melebihi penjualan bruto.")
    if refund is not None and refund > gross:
        reconciliation.append("Refund melebihi penjualan bruto.")
    if data.qty > 1000:
        reconciliation.append("Kuantitas di luar kewajaran (>1000).")
    if gross > Decimal("50000000"):
        reconciliation.append("Nilai transaksi di luar kewajaran (>Rp50 juta).")
    if gross.quantize(Q2) / Decimal(data.qty) < Decimal("500"):
        reconciliation.append("Nilai per unit di bawah Rp500; perlu pemeriksaan.")
    if commission is not None and gross > 0 and commission > gross * Decimal("0.5"):
        reconciliation.append("Komisi >50% dari penjualan bruto; potensi double count.")

    total_cost = q2(known_cost)
    profit: Decimal | None = None
    margin: Decimal | None = None
    profit_estimate: Decimal | None = None
    margin_estimate: Decimal | None = None
    if net_revenue is not None:
        profit_estimate = q2(net_revenue - known_cost)
        margin_estimate = q4(profit_estimate / net_revenue * Decimal("100")) if net_revenue > 0 else None
        if not missing:
            profit = profit_estimate
            margin = margin_estimate

    if reconciliation:
        status = STATUS_RECON
    elif missing:
        status = STATUS_PARTIAL
    else:
        status = STATUS_COMPLETE

    trace = {
        "formula_version": settings.formula_version,
        "margin_base": settings.margin_base,
        "rounding": settings.rounding_mode,
        "inputs": {
            name: (str(getattr(data, name)) if getattr(data, name) is not None else None)
            for name in MONEY_FIELDS
        },
        "other_costs": [str(value) for value in (data.other_costs or [])],
        "components": {key: (str(value) if value is not None else None) for key, value in components.items()},
        "known_cost": str(known_cost),
        "cogs_source": cogs_source,
        "commission_source": commission_source,
        "fixed_fee_source": fixed_fee_source,
        "order_fixed_fee_total": str(data.order_fixed_fee_total) if data.order_fixed_fee_total is not None else None,
        "fee_rule": rule.to_dict() if rule else None,
        "missing": missing,
        "reconciliation": list(dict.fromkeys(reconciliation)),
        "profit_estimate": str(profit_estimate) if profit_estimate is not None else None,
        "margin_estimate_pct": str(margin_estimate) if margin_estimate is not None else None,
        "notes": "Null tidak diubah menjadi nol. Profit final hanya untuk status COMPLETE.",
    }

    return ProfitResult(
        net_revenue=net_revenue,
        total_cost=total_cost,
        profit=profit,
        margin_pct=margin,
        status=status,
        warnings=list(dict.fromkeys(warnings + reconciliation)),
        trace=trace,
    )


def profit_input_from_transaction(
    tx: Transaction,
    product: Product | None,
    fee_rule: FeeRule | None,
    duplicate_transaction: bool = False,
    duplicate_fixed_fee_order: bool = False,
    allocation: tuple[Decimal, Decimal] | None = None,
) -> ProfitInput:
    other = [tx.other_costs] if tx.other_costs is not None else None
    return ProfitInput(
        fixed_fee_allocated=allocation is not None,
        order_fixed_fee_total=allocation[1] if allocation else None,
        transaction_id=tx.transaction_id,
        transaction_date=tx.transaction_date,
        marketplace=tx.marketplace,
        sku=tx.sku,
        qty=tx.qty,
        gross_sales=tx.gross_sales,
        order_id=tx.order_id,
        seller_discount=tx.seller_discount,
        refund_amount=tx.refund_amount,
        cogs=tx.cogs,
        marketplace_commission=tx.marketplace_commission,
        fixed_fee=allocation[0] if allocation else tx.fixed_fee,
        seller_shipping_cost=tx.seller_shipping_cost,
        packing_cost=tx.packing_cost,
        return_logistics_cost=tx.return_logistics_cost,
        other_costs=other,
        product_modal=product.modal if product else None,
        product_exists=product is not None,
        fee_rule=_fee_snapshot(fee_rule),
        duplicate_transaction=duplicate_transaction,
        duplicate_fixed_fee_order=duplicate_fixed_fee_order,
        source_status=tx.status,
    )


def allocate_order_fixed_fees(transactions: list[Transaction]) -> dict[int, tuple[Decimal, Decimal]]:
    """Allocate an order-level fixed fee across its SKU lines by product value.

    Applies when exactly one line of a multi-SKU order carries the fee and the
    other lines state 0. The remainder goes to the last line so the allocated
    shares sum back to the order fee with Rp0 tolerance (proposal §3.3 rule 2).
    """
    by_order: dict[str, list[Transaction]] = {}
    for tx in transactions:
        if tx.order_id:
            by_order.setdefault(tx.order_id, []).append(tx)
    result: dict[int, tuple[Decimal, Decimal]] = {}
    for lines in by_order.values():
        if len(lines) < 2 or any(t.fixed_fee is None for t in lines):
            continue
        carriers = [t for t in lines if t.fixed_fee > 0]
        if len(carriers) != 1:
            continue
        total_fee = q2(carriers[0].fixed_fee)
        gross_sum = sum((t.gross_sales or ZERO for t in lines), ZERO)
        if gross_sum <= 0:
            continue
        ordered = sorted(lines, key=lambda t: t.id)
        remaining = total_fee
        for index, tx in enumerate(ordered):
            if index < len(ordered) - 1:
                share = q2(total_fee * (tx.gross_sales or ZERO) / gross_sum)
            else:
                share = remaining
            remaining -= share
            result[tx.id] = (share, total_fee)
    return result


def latest_run(db: Session) -> CalculationRun | None:
    return db.scalar(select(CalculationRun).order_by(CalculationRun.id.desc()))


def _load_fee_rule(db: Session, marketplace: str, on_date: date, category: str) -> FeeRule | None:
    stmt = (
        select(FeeRule)
        .where(
            FeeRule.marketplace == marketplace,
            FeeRule.effective_from <= on_date,
        )
        .where((FeeRule.effective_to.is_(None)) | (FeeRule.effective_to >= on_date))
        .order_by(
            (FeeRule.category == category).desc(),
            FeeRule.effective_from.desc(),
        )
    )
    return db.scalar(stmt)


def run_calculation(
    db: Session,
    actor: str | None = None,
    scope: str = "all",
    transaction_ids: list[int] | None = None,
) -> CalculationRun:
    stmt = select(Transaction).order_by(Transaction.transaction_date, Transaction.id)
    if transaction_ids is not None:
        if not transaction_ids:
            transactions: list[Transaction] = []
        else:
            transactions = list(db.scalars(stmt.where(Transaction.id.in_(transaction_ids))))
    else:
        transactions = list(db.scalars(stmt))

    products = {product.id: product for product in db.scalars(select(Product))}
    products_by_sku = {product.sku: product for product in db.scalars(select(Product))}

    duplicate_counts = {
        tx_id: count
        for tx_id, count in db.execute(
            select(Transaction.transaction_id, func.count())
            .group_by(Transaction.transaction_id)
            .having(func.count() > 1)
        ).all()
    }
    fixed_fee_orders = {
        order_id: count
        for order_id, count in db.execute(
            select(Transaction.order_id, func.count())
            .where(Transaction.order_id.is_not(None), Transaction.fixed_fee > 0)
            .group_by(Transaction.order_id)
            .having(func.count() > 1)
        ).all()
    }

    allocations = allocate_order_fixed_fees(transactions)

    run = CalculationRun(
        formula_version=settings.formula_version,
        margin_base=settings.margin_base,
        scope=scope,
        created_by=actor,
    )
    db.add(run)
    db.flush()

    status_counts: dict[str, int] = {}
    for tx in transactions:
        product = products.get(tx.product_id) if tx.product_id else products_by_sku.get(tx.sku)
        fee_rule = _load_fee_rule(db, tx.marketplace, tx.transaction_date, product.category if product else "ALL")
        data = profit_input_from_transaction(
            tx,
            product,
            fee_rule,
            duplicate_transaction=tx.transaction_id in duplicate_counts,
            duplicate_fixed_fee_order=bool(tx.order_id and tx.order_id in fixed_fee_orders),
            allocation=allocations.get(tx.id),
        )
        result = calculate(data)
        status_counts[result.status] = status_counts.get(result.status, 0) + 1
        db.add(
            TransactionCalculation(
                run_id=run.id,
                transaction_pk=tx.id,
                net_revenue=result.net_revenue,
                total_cost=result.total_cost,
                profit=result.profit,
                margin_pct=result.margin_pct,
                status=result.status,
                warnings_json=result.warnings,
                trace_json=result.trace,
            )
        )

    run.summary_json = {
        "status_counts": status_counts,
        "transaction_count": len(transactions),
        "formula_version": settings.formula_version,
        "margin_base": settings.margin_base,
        "duplicate_transaction_ids": len(duplicate_counts),
        "duplicate_fixed_fee_orders": len(fixed_fee_orders),
    }
    db.add(
        AuditLog(
            actor=actor or "system",
            action="profit.calculate",
            entity="calculation_run",
            entity_id=str(run.id),
            detail_json=run.summary_json,
        )
    )
    db.commit()
    db.refresh(run)
    return run


def _filtered_calculations(
    db: Session,
    run_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    marketplace: str | None = None,
    sku: str | None = None,
    status: str | None = None,
) -> list[tuple[TransactionCalculation, Transaction]]:
    stmt = (
        select(TransactionCalculation, Transaction)
        .join(Transaction, Transaction.id == TransactionCalculation.transaction_pk)
        .where(TransactionCalculation.run_id == run_id)
        .order_by(Transaction.transaction_date, Transaction.id)
    )
    if start_date:
        stmt = stmt.where(Transaction.transaction_date >= start_date)
    if end_date:
        stmt = stmt.where(Transaction.transaction_date <= end_date)
    if marketplace:
        stmt = stmt.where(Transaction.marketplace == marketplace)
    if sku:
        stmt = stmt.where(Transaction.sku == sku)
    if status:
        stmt = stmt.where(TransactionCalculation.status == status)
    return [(calc, tx) for calc, tx in db.execute(stmt).all()]


DEDUCTION_COMPONENTS = (
    "marketplace_commission",
    "fixed_fee",
    "seller_shipping_cost",
    "return_logistics_cost",
    "other_costs",
)


def contribution_levels(trace: dict[str, Any], gross: Decimal) -> dict[str, Any]:
    """Proposal Tabel 3.3 profit tiers, computed from one calculation trace.

    Dana dilepas = omzet - diskon - refund - komisi - biaya tetap - ongkir penjual
                   - logistik retur - biaya lain
    LK I         = dana dilepas - modal (modal x qty)
    LK II        = LK I - biaya variabel toko (packing)
    A missing component is never treated as zero: the tier becomes None.
    """
    inputs = trace.get("inputs") or {}
    comps = trace.get("components") or {}
    missing_dana = [k for k in ("seller_discount", "refund_amount") if inputs.get(k) is None]
    missing_dana += [k for k in DEDUCTION_COMPONENTS if comps.get(k) is None]
    dana = None
    if not missing_dana:
        dana = gross - Decimal(inputs["seller_discount"]) - Decimal(inputs["refund_amount"])
        dana -= sum((Decimal(str(comps[k])) for k in DEDUCTION_COMPONENTS), ZERO)
    cogs = comps.get("cogs")
    lk1 = dana - Decimal(str(cogs)) if dana is not None and cogs is not None else None
    packing = comps.get("packing_cost")
    lk2 = lk1 - Decimal(str(packing)) if lk1 is not None and packing is not None else None
    missing_lk1 = missing_dana + (["cogs"] if cogs is None else [])
    missing_lk2 = missing_lk1 + (["packing_cost"] if packing is None else [])
    return {
        "dana": dana,
        "cogs": Decimal(str(cogs)) if cogs is not None else None,
        "lk1": lk1,
        "lk2": lk2,
        "missing_lk1": missing_lk1,
        "missing_lk2": missing_lk2,
    }


def _money(value: Decimal | None) -> Decimal | None:
    return q2(value) if value is not None else None


def build_summary(
    db: Session,
    run_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    marketplace: str | None = None,
    sku: str | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    run = db.get(CalculationRun, run_id) if run_id else latest_run(db)
    if run is None:
        return {
            "period": {"start": start_date.isoformat() if start_date else None, "end": end_date.isoformat() if end_date else None},
            "kpi": {
                "gross_sales": "0.00",
                "net_revenue_complete": "0.00",
                "profit_complete": None,
                "profit_partial_estimate": None,
                "profit_reconciliation": None,
                "margin_complete_pct": None,
                "transaction_count": 0,
                "completeness_pct": 0,
                "overall_status": "Tidak dapat dihitung",
                "final_profit_claimable": False,
            },
            "status_counts": {},
            "by_marketplace": [],
            "by_day": [],
            "top_products": [],
            "cost_breakdown": [],
            "missing_components": [],
            "formula_version": settings.formula_version,
            "margin_base": settings.margin_base,
            "run_id": None,
            "is_demo": True,
        }

    rows = _filtered_calculations(db, run.id, start_date, end_date, marketplace, sku, status)
    status_counts: dict[str, int] = {}
    gross_total = ZERO
    net_complete = ZERO
    profit_complete = ZERO
    profit_partial = ZERO
    profit_recon = ZERO
    have_partial = False
    have_recon = False
    have_invalid = False
    component_totals = {key: ZERO for key in ("cogs", "marketplace_commission", "fixed_fee", "seller_shipping_cost", "packing_cost", "return_logistics_cost", "other_costs")}
    component_missing = {key: 0 for key in component_totals}
    missing_counter: dict[str, int] = {}

    marketplace_acc: dict[str, dict[str, Any]] = {}
    day_acc: dict[str, dict[str, Any]] = {}
    product_acc: dict[str, dict[str, Any]] = {}
    lk_totals = {"dana": ZERO, "lk1": ZERO, "lk2": ZERO, "gross_lk1": ZERO}
    lk_missing = {"lk1_rows": 0, "lk2_rows": 0}
    sku_lk: dict[str, dict[str, Any]] = {}

    for calc, tx in rows:
        status_counts[calc.status] = status_counts.get(calc.status, 0) + 1
        if calc.status == STATUS_PARTIAL:
            have_partial = True
        if calc.status == STATUS_RECON:
            have_recon = True
        if calc.status == STATUS_INVALID:
            have_invalid = True

        gross = tx.gross_sales or ZERO
        gross_total += gross

        trace = calc.trace_json or {}
        missing = trace.get("missing") or []
        for name in missing:
            missing_counter[name] = missing_counter.get(name, 0) + 1
        components = trace.get("components") or {}
        for key in component_totals:
            value = components.get(key)
            if value is None:
                component_missing[key] += 1
            else:
                component_totals[key] += Decimal(str(value))

        levels = contribution_levels(trace, gross) if calc.status != STATUS_INVALID else None
        sk = sku_lk.setdefault(
            tx.sku,
            {"qty": 0, "gross": ZERO, "dana": ZERO, "cogs": ZERO, "lk1": ZERO, "lk2": ZERO,
             "rows": 0, "rows_lk1_missing": 0, "rows_lk2_missing": 0, "missing": set(),
             "marketplaces": set(), "recon_rows": 0, "negative_rows": 0},
        )
        sk["qty"] += tx.qty
        sk["rows"] += 1
        sk["marketplaces"].add(tx.marketplace)
        if calc.status == STATUS_RECON:
            sk["recon_rows"] += 1
        if levels is None or levels["lk1"] is None:
            lk_missing["lk1_rows"] += 1
            sk["rows_lk1_missing"] += 1
            sk["missing"].update(levels["missing_lk1"] if levels else ["gross_sales"])
        else:
            lk_totals["dana"] += levels["dana"]
            lk_totals["lk1"] += levels["lk1"]
            lk_totals["gross_lk1"] += gross
            sk["gross"] += gross
            sk["dana"] += levels["dana"]
            sk["cogs"] += levels["cogs"]
            sk["lk1"] += levels["lk1"]
            if levels["lk1"] < 0:
                sk["negative_rows"] += 1
        if levels is None or levels["lk2"] is None:
            lk_missing["lk2_rows"] += 1
            sk["rows_lk2_missing"] += 1
            if levels:
                sk["missing"].update(levels["missing_lk2"])
        else:
            lk_totals["lk2"] += levels["lk2"]
            sk["lk2"] += levels["lk2"]

        if calc.status == STATUS_COMPLETE:
            net_complete += calc.net_revenue or ZERO
            profit_complete += calc.profit or ZERO
        elif calc.status == STATUS_PARTIAL:
            estimate = trace.get("profit_estimate")
            if estimate is not None:
                profit_partial += Decimal(str(estimate))
        elif calc.status == STATUS_RECON and calc.profit is not None:
            profit_recon += calc.profit

        market = tx.marketplace
        m = marketplace_acc.setdefault(
            market,
            {"marketplace": market, "gross_sales": ZERO, "net_revenue_complete": ZERO, "profit_complete": ZERO, "profit_partial_estimate": ZERO, "transaction_count": 0, "status_counts": {}, "dana_dilepas": ZERO, "lk1": ZERO, "gross_lk1": ZERO, "lk1_rows_missing": 0},
        )
        m["gross_sales"] += gross
        m["transaction_count"] += 1
        if levels is not None and levels["lk1"] is not None:
            m["dana_dilepas"] += levels["dana"]
            m["lk1"] += levels["lk1"]
            m["gross_lk1"] += gross
        else:
            m["lk1_rows_missing"] += 1
        m["status_counts"][calc.status] = m["status_counts"].get(calc.status, 0) + 1
        if calc.status == STATUS_COMPLETE:
            m["net_revenue_complete"] += calc.net_revenue or ZERO
            m["profit_complete"] += calc.profit or ZERO
        elif calc.status == STATUS_PARTIAL and trace.get("profit_estimate") is not None:
            m["profit_partial_estimate"] += Decimal(str(trace["profit_estimate"]))

        day_key = tx.transaction_date.isoformat()
        d = day_acc.setdefault(
            day_key,
            {"date": day_key, "gross_sales": ZERO, "profit_complete": ZERO, "profit_partial_estimate": ZERO, "transaction_count": 0},
        )
        d["gross_sales"] += gross
        d["transaction_count"] += 1
        if calc.status == STATUS_COMPLETE:
            d["profit_complete"] += calc.profit or ZERO
        elif calc.status == STATUS_PARTIAL and trace.get("profit_estimate") is not None:
            d["profit_partial_estimate"] += Decimal(str(trace["profit_estimate"]))

        p = product_acc.setdefault(
            tx.sku,
            {"sku": tx.sku, "product_name": None, "qty": 0, "gross_sales": ZERO, "profit_complete": ZERO, "net_revenue_complete": ZERO, "transaction_count": 0, "status_counts": {}},
        )
        p["qty"] += tx.qty
        p["gross_sales"] += gross
        p["transaction_count"] += 1
        p["status_counts"][calc.status] = p["status_counts"].get(calc.status, 0) + 1
        if calc.status == STATUS_COMPLETE:
            p["profit_complete"] += calc.profit or ZERO
            p["net_revenue_complete"] += calc.net_revenue or ZERO
        if p["product_name"] is None:
            product = db.get(Product, tx.product_id) if tx.product_id else None
            p["product_name"] = product.name if product else None

    total_rows = len(rows)
    complete_count = status_counts.get(STATUS_COMPLETE, 0)
    if total_rows and complete_count == total_rows:
        overall = "Lengkap"
    elif have_recon:
        overall = "Perlu rekonsiliasi"
    elif have_partial:
        overall = "Parsial"
    elif have_invalid:
        overall = "Tidak dapat dihitung"
    elif total_rows == 0:
        overall = "Belum ada data"
    else:
        overall = "Lengkap"

    margin = q4(profit_complete / net_complete * Decimal("100")) if net_complete > 0 else None

    def serialise_accumulator(item: dict[str, Any]) -> dict[str, Any]:
        result = {}
        for key, value in item.items():
            result[key] = str(q2(value)) if isinstance(value, Decimal) else value
        if "net_revenue_complete" in item and item["net_revenue_complete"] > 0:
            result["margin_complete_pct"] = str(
                q4(item["profit_complete"] / item["net_revenue_complete"] * Decimal("100"))
            )
        else:
            result["margin_complete_pct"] = None
        return result

    product_rows = []
    for item in product_acc.values():
        row = serialise_accumulator(item)
        row["margin_complete_pct"] = row.get("margin_complete_pct")
        product_rows.append(row)
    product_rows.sort(key=lambda row: Decimal(row["profit_complete"]), reverse=True)

    stock_by_sku: dict[str, int | None] = {}
    modal_by_sku: dict[str, Decimal | None] = {}
    name_by_sku: dict[str, str] = {}
    for product in db.scalars(select(Product)):
        modal_by_sku[product.sku] = product.modal
        name_by_sku[product.sku] = product.name
        snap = db.scalar(
            select(StockSnapshot)
            .where(StockSnapshot.product_id == product.id)
            .order_by(StockSnapshot.captured_at.desc())
            .limit(1)
        )
        stock_by_sku[product.sku] = snap.stock if snap else None

    by_sku = []
    for sku_code, item in sku_lk.items():
        gross_sku = item["gross"]
        deduction_rate = (gross_sku - item["dana"]) / gross_sku if gross_sku > 0 else None
        modal_unit = modal_by_sku.get(sku_code)
        break_even = None
        if modal_unit is not None and deduction_rate is not None and deduction_rate < 1:
            break_even = q2(modal_unit / (Decimal("1") - deduction_rate))
        complete_lk1 = item["rows_lk1_missing"] == 0
        complete_lk2 = item["rows_lk2_missing"] == 0
        warnings_sku = []
        if sku_code not in modal_by_sku:
            warnings_sku.append("SKU tidak ada di katalog (unmatched).")
        if stock_by_sku.get(sku_code) == 0:
            warnings_sku.append("Stok katalog 0 tetapi tercatat terjual: peringatan data.")
        by_sku.append({
            "sku": sku_code,
            "product_name": name_by_sku.get(sku_code),
            "marketplaces": sorted(item["marketplaces"]),
            "qty": item["qty"],
            "rows": item["rows"],
            "gross_sales": str(q2(gross_sku)),
            "dana_dilepas": str(q2(item["dana"])),
            "deduction_pct": str(q4(deduction_rate * Decimal("100"))) if deduction_rate is not None else None,
            "cogs": str(q2(item["cogs"])),
            "lk1": str(q2(item["lk1"])),
            "lk1_margin_pct": str(q4(item["lk1"] / gross_sku * Decimal("100"))) if gross_sku > 0 else None,
            "lk2": str(q2(item["lk2"])) if complete_lk2 else None,
            "modal_unit": str(q2(modal_unit)) if modal_unit is not None else None,
            "break_even_price": str(break_even) if break_even is not None else None,
            "lk1_status": "Lengkap" if complete_lk1 else "Belum lengkap",
            "lk2_status": "Lengkap" if complete_lk2 else "Belum lengkap",
            "rows_incomplete": item["rows_lk1_missing"],
            "missing_components": sorted(COMPONENT_LABELS.get(m, m) for m in item["missing"]),
            "negative_rows": item["negative_rows"],
            "reconciliation_rows": item["recon_rows"],
            "data_warnings": warnings_sku,
        })
    by_sku.sort(key=lambda row: Decimal(row["lk1"]), reverse=True)

    contribution = {
        "gross_sales": str(q2(gross_total)),
        "gross_sales_lk1_basis": str(q2(lk_totals["gross_lk1"])),
        "dana_dilepas": str(q2(lk_totals["dana"])),
        "lk1": str(q2(lk_totals["lk1"])),
        "lk1_margin_pct": str(q4(lk_totals["lk1"] / lk_totals["gross_lk1"] * Decimal("100"))) if lk_totals["gross_lk1"] > 0 else None,
        "lk1_status": "Lengkap" if lk_missing["lk1_rows"] == 0 else "Belum lengkap",
        "lk1_rows_missing": lk_missing["lk1_rows"],
        "lk2": str(q2(lk_totals["lk2"])) if lk_missing["lk2_rows"] == 0 else None,
        "lk2_partial": str(q2(lk_totals["lk2"])),
        "lk2_status": "Lengkap" if lk_missing["lk2_rows"] == 0 else "Belum lengkap",
        "lk2_rows_missing": lk_missing["lk2_rows"],
        "operating_profit": None,
        "operating_profit_note": "Laba operasional (LK II - gaji, sewa) di luar cakupan KOMPAS.",
        "definitions": {
            "dana_dilepas": "Omzet - diskon - refund - komisi - biaya tetap - ongkir penjual - logistik retur - biaya lain",
            "lk1": "Dana dilepas - modal produk (modal x qty)",
            "lk2": "LK I - biaya variabel toko (packing)",
            "break_even_price": "Modal / (1 - tingkat potongan SKU), asumsi tingkat potongan tetap",
        },
    }

    cost_breakdown = [
        {
            "component": key,
            "label": COMPONENT_LABELS[key],
            "total": str(q2(component_totals[key])),
            "missing_count": component_missing[key],
        }
        for key in component_totals
    ]

    kpi = {
        "gross_sales": str(q2(gross_total)),
        "net_revenue_complete": str(q2(net_complete)),
        "profit_complete": str(q2(profit_complete)) if complete_count else None,
        "profit_partial_estimate": str(q2(profit_partial)) if have_partial else None,
        "profit_reconciliation": str(q2(profit_recon)) if have_recon else None,
        "margin_complete_pct": str(margin) if margin is not None else None,
        "transaction_count": total_rows,
        "completeness_pct": str(q4(Decimal(complete_count) / Decimal(total_rows) * Decimal("100"))) if total_rows else "0.0000",
        "complete_count": complete_count,
        "partial_count": status_counts.get(STATUS_PARTIAL, 0),
        "reconciliation_count": status_counts.get(STATUS_RECON, 0),
        "not_calculable_count": status_counts.get(STATUS_INVALID, 0),
        "overall_status": overall,
        "final_profit_claimable": bool(total_rows and complete_count == total_rows),
    }

    return {
        "period": {
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None,
        },
        "kpi": kpi,
        "status_counts": {
            STATUS_LABELS.get(key, key): value for key, value in status_counts.items()
        },
        "status_counts_raw": status_counts,
        "by_marketplace": [
            {
                **serialise_accumulator(value),
                "deduction_pct": str(q4((value["gross_lk1"] - value["dana_dilepas"]) / value["gross_lk1"] * Decimal("100"))) if value["gross_lk1"] > 0 else None,
                "lk1_margin_pct": str(q4(value["lk1"] / value["gross_lk1"] * Decimal("100"))) if value["gross_lk1"] > 0 else None,
            }
            for value in sorted(marketplace_acc.values(), key=lambda v: -v["gross_sales"])
        ],
        "by_day": [serialise_accumulator(value) for value in sorted(day_acc.values(), key=lambda x: x["date"])],
        "top_products": product_rows[:8],
        "contribution": contribution,
        "by_sku": by_sku,
        "cost_breakdown": cost_breakdown,
        "missing_components": [
            {"component": key, "label": COMPONENT_LABELS.get(key, key), "transaction_count": value}
            for key, value in sorted(missing_counter.items(), key=lambda item: -item[1])
        ],
        "formula_version": run.formula_version,
        "margin_base": run.margin_base,
        "run_id": run.id,
        "is_demo": True,
    }
