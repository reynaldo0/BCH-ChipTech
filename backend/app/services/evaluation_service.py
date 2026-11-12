"""Golden-set evaluation harness (chat + profit). No production data used."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AuditLog, EvaluationRun, GoldenChatCase, GoldenProfitCase
from .chat_engine import DECISION_ESCALATE, analyze
from .profit_engine import FeeRuleSnapshot, ProfitInput, calculate


def _as_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    return Decimal(str(value))


def _as_date(value: Any) -> date:
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _fee_snapshot(data: dict[str, Any] | None) -> FeeRuleSnapshot | None:
    if not data:
        return None
    return FeeRuleSnapshot(
        id=data.get("id"),
        version=data.get("version", "demo-v1"),
        marketplace=data.get("marketplace", "Shopee"),
        category=data.get("category", "ALL"),
        effective_from=_as_date(data["effective_from"]),
        effective_to=_as_date(data["effective_to"]) if data.get("effective_to") else None,
        commission_pct=Decimal(str(data.get("commission_pct", "0"))),
        fixed_fee=Decimal(str(data.get("fixed_fee", "0"))),
        admin_pct=Decimal(str(data.get("admin_pct", "0"))),
    )


def _profit_input(data: dict[str, Any]) -> ProfitInput:
    return ProfitInput(
        transaction_id=data["transaction_id"],
        transaction_date=_as_date(data["transaction_date"]),
        marketplace=data["marketplace"],
        sku=data["sku"],
        qty=int(data["qty"]),
        gross_sales=_as_decimal(data.get("gross_sales")),
        order_id=data.get("order_id"),
        seller_discount=_as_decimal(data.get("seller_discount")),
        refund_amount=_as_decimal(data.get("refund_amount")),
        cogs=_as_decimal(data.get("cogs")),
        marketplace_commission=_as_decimal(data.get("marketplace_commission")),
        fixed_fee=_as_decimal(data.get("fixed_fee")),
        seller_shipping_cost=_as_decimal(data.get("seller_shipping_cost")),
        packing_cost=_as_decimal(data.get("packing_cost")),
        return_logistics_cost=_as_decimal(data.get("return_logistics_cost")),
        other_costs=[_as_decimal(value) for value in data.get("other_costs", [])]
        if data.get("other_costs")
        else None,
        product_modal=_as_decimal(data.get("product_modal")),
        product_exists=bool(data.get("product_exists", True)),
        fee_rule=_fee_snapshot(data.get("fee_rule")),
        duplicate_transaction=bool(data.get("duplicate_transaction", False)),
        duplicate_fixed_fee_order=bool(data.get("duplicate_fixed_fee_order", False)),
    )


def run_chat_evaluation(
    db: Session, dataset_version: str, actor: str | None, provider: str = "rule-based"
) -> EvaluationRun:
    if provider == "jev" and not settings.jev_ready:
        raise ValueError(
            "Jev belum dikonfigurasi (JEV_ENABLED/JEV_API_KEY). "
            "Evaluasi Jev tidak dapat dijalankan tanpa key nyata."
        )
    cases = list(
        db.scalars(
            select(GoldenChatCase)
            .where(GoldenChatCase.dataset_version == dataset_version)
            .order_by(GoldenChatCase.case_id)
        )
    )
    results: list[dict[str, Any]] = []
    intent_correct = 0
    decision_correct = 0
    severity_correct = 0
    class_correct = 0
    complaint_tp = complaint_fp = complaint_fn = complaint_tn = 0
    abstain_tp = abstain_fp = abstain_fn = abstain_tn = 0
    injection_correct = 0

    for case in cases:
        as_of = case.as_of
        result = analyze(
            db,
            message=case.message,
            platform=case.platform,
            sku_context=case.sku_context,
            as_of=as_of,
            persist=False,
            create_complaint=False,
            actor=actor,
        )
        predicted_abstain = bool(
            result.decision == DECISION_ESCALATE
            and (result.intent == "klaim_berisiko" or result.injection)
        )
        checks = {
            "message_class": result.message_class == case.expected_message_class,
            "intent": result.intent == case.expected_intent,
            "decision": result.decision == case.expected_decision,
            "complaint": bool(result.complaint) == bool(case.expected_complaint),
            "severity": result.severity == case.expected_severity,
            "abstain": predicted_abstain == bool(case.expected_abstain),
            "injection": bool(result.injection) == bool(case.injection),
        }
        intent_correct += int(checks["intent"])
        decision_correct += int(checks["decision"])
        severity_correct += int(checks["severity"])
        injection_correct += int(checks["injection"])
        class_correct += int(checks["message_class"])

        if case.expected_complaint and result.complaint:
            complaint_tp += 1
        elif case.expected_complaint and not result.complaint:
            complaint_fn += 1
        elif not case.expected_complaint and result.complaint:
            complaint_fp += 1
        else:
            complaint_tn += 1

        if case.expected_abstain and predicted_abstain:
            abstain_tp += 1
        elif case.expected_abstain and not predicted_abstain:
            abstain_fn += 1
        elif not case.expected_abstain and predicted_abstain:
            abstain_fp += 1
        else:
            abstain_tn += 1

        results.append(
            {
                "case_id": case.case_id,
                "message": case.message,
                "expected": {
                    "message_class": case.expected_message_class,
                    "intent": case.expected_intent,
                    "decision": case.expected_decision,
                    "complaint": case.expected_complaint,
                    "severity": case.expected_severity,
                    "abstain": case.expected_abstain,
                    "injection": case.injection,
                },
                "actual": {
                    "message_class": result.message_class,
                    "intent": result.intent,
                    "intents": result.intents,
                    "decision": result.decision,
                    "complaint": result.complaint,
                    "severity": result.severity,
                    "abstain": predicted_abstain,
                    "injection": result.injection,
                    "sku": result.sku,
                    "provider": result.provider,
                    "provider_status": result.provider_status,
                    "draft": result.draft,
                    "evidence": result.evidence,
                    "warnings": result.warnings,
                    "reason": result.reason,
                },
                "checks": checks,
                "pass": all(checks.values()),
            }
        )

    total = len(cases)
    metrics = {
        "dataset_version": dataset_version,
        "provider_requested": provider,
        "total": total,
        "passed": sum(1 for row in results if row["pass"]),
        "intent_correct": intent_correct,
        "intent_accuracy": f"{intent_correct}/{total}",
        "class_correct": class_correct,
        "class_accuracy": f"{class_correct}/{total}",
        "decision_correct": decision_correct,
        "decision_accuracy": f"{decision_correct}/{total}",
        "severity_correct": severity_correct,
        "complaint_recall": f"{complaint_tp}/{complaint_tp + complaint_fn}",
        "complaint_precision": f"{complaint_tp}/{complaint_tp + complaint_fp}",
        "complaint_confusion": {
            "tp": complaint_tp,
            "fp": complaint_fp,
            "fn": complaint_fn,
            "tn": complaint_tn,
        },
        "abstain_precision": f"{abstain_tp}/{abstain_tp + abstain_fp}",
        "abstain_recall": f"{abstain_tp}/{abstain_tp + abstain_fn}",
        "abstain_confusion": {"tp": abstain_tp, "fp": abstain_fp, "fn": abstain_fn, "tn": abstain_tn},
        "false_negative_high_risk": abstain_fn,
        "injection_correct": f"{injection_correct}/{total}",
        "providers_used": sorted({row["actual"]["provider"] for row in results}),
        "provider_statuses": sorted({row["actual"]["provider_status"] for row in results}),
        "disclaimer": (
            "Hasil hanya untuk dataset dummy. Bukan klaim akurasi produksi. "
            "Semua denominator ditampilkan."
        ),
    }
    run = EvaluationRun(
        dataset_version=dataset_version,
        provider=provider,
        status="COMPLETED",
        metrics_json={"chat": metrics},
        results_json=[{"type": "chat", **row} for row in results],
        finished_at=datetime.now(),
        created_by=actor,
    )
    db.add(run)
    db.flush()
    db.add(
        AuditLog(
            actor=actor or "system",
            action="evaluation.chat",
            entity="evaluation_run",
            entity_id=str(run.id),
            detail_json={"total": total, "passed": metrics["passed"]},
        )
    )
    db.commit()
    db.refresh(run)
    return run


def run_profit_evaluation(
    db: Session, dataset_version: str, actor: str | None
) -> EvaluationRun:
    cases = list(
        db.scalars(
            select(GoldenProfitCase)
            .where(GoldenProfitCase.dataset_version == dataset_version)
            .order_by(GoldenProfitCase.case_id)
        )
    )
    results: list[dict[str, Any]] = []
    passed = 0
    for case in cases:
        result = calculate(_profit_input(case.input_json))
        checks = {
            "status": result.status == case.expected_status,
            "net_revenue": result.net_revenue == case.expected_net_revenue
            if case.expected_net_revenue is not None
            else True,
            "total_cost": result.total_cost == case.expected_total_cost
            if case.expected_total_cost is not None
            else True,
            "profit": result.profit == case.expected_profit
            if case.expected_profit is not None
            else result.profit is None,
            "margin": result.margin_pct == case.expected_margin_pct
            if case.expected_margin_pct is not None
            else True,
        }
        checks["all"] = all(value for key, value in checks.items() if key != "all")
        passed += int(checks["all"])
        results.append(
            {
                "case_id": case.case_id,
                "expected": {
                    "net_revenue": str(case.expected_net_revenue)
                    if case.expected_net_revenue is not None
                    else None,
                    "total_cost": str(case.expected_total_cost)
                    if case.expected_total_cost is not None
                    else None,
                    "profit": str(case.expected_profit)
                    if case.expected_profit is not None
                    else None,
                    "margin_pct": str(case.expected_margin_pct)
                    if case.expected_margin_pct is not None
                    else None,
                    "status": case.expected_status,
                },
                "actual": {
                    "net_revenue": str(result.net_revenue) if result.net_revenue is not None else None,
                    "total_cost": str(result.total_cost) if result.total_cost is not None else None,
                    "profit": str(result.profit) if result.profit is not None else None,
                    "margin_pct": str(result.margin_pct) if result.margin_pct is not None else None,
                    "status": result.status,
                    "trace": result.trace,
                    "warnings": result.warnings,
                },
                "checks": checks,
                "pass": checks["all"],
                "notes": case.notes,
            }
        )
    total = len(cases)
    metrics = {
        "dataset_version": dataset_version,
        "total": total,
        "passed": passed,
        "passed_ratio": f"{passed}/{total}",
        "formula_version": settings.formula_version,
        "margin_base": settings.margin_base,
        "rounding": settings.rounding_mode,
        "disclaimer": (
            "Expected values dihitung oleh generator referensi terpisah dari kode engine. "
            "Dataset dummy; bukan klaim hasil produksi."
        ),
    }
    run = EvaluationRun(
        dataset_version=dataset_version,
        provider="deterministic",
        status="COMPLETED",
        metrics_json={"profit": metrics},
        results_json=[{"type": "profit", **row} for row in results],
        finished_at=datetime.now(),
        created_by=actor,
    )
    db.add(run)
    db.flush()
    db.add(
        AuditLog(
            actor=actor or "system",
            action="evaluation.profit",
            entity="evaluation_run",
            entity_id=str(run.id),
            detail_json={"total": total, "passed": passed},
        )
    )
    db.commit()
    db.refresh(run)
    return run
