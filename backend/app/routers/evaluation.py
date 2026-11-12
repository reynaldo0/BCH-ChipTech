from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import EvaluationRun, GoldenChatCase, GoldenProfitCase, User
from ..schemas import EvaluationRequest
from ..security import get_current_user_optional
from ..services import evaluation_service

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


@router.get("/chat/cases")
def list_golden_chat_cases(db: Session = Depends(get_db)):
    cases = db.scalars(select(GoldenChatCase).order_by(GoldenChatCase.case_id)).all()
    return {
        "cases": [
            {
                "case_id": c.case_id,
                "message": c.message,
                "platform": c.platform,
                "sku_context": c.sku_context,
                "as_of": c.as_of.isoformat() if c.as_of else None,
                "expected_intent": c.expected_intent,
                "expected_message_class": c.expected_message_class,
                "expected_decision": c.expected_decision,
                "expected_complaint": c.expected_complaint,
                "expected_severity": c.expected_severity,
                "expected_abstain": c.expected_abstain,
                "injection": c.injection,
                "notes": c.notes,
            }
            for c in cases
        ],
        "total": len(cases),
    }


@router.post("/chat/run")
def run_chat_evaluation_endpoint(
    payload: EvaluationRequest = EvaluationRequest(),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if isinstance(current_user, User) else "evaluator"
    run = evaluation_service.run_chat_evaluation(
        db=db,
        provider=payload.provider,
        dataset_version=payload.dataset_version,
        actor=actor,
    )
    return {
        "id": run.id,
        "dataset_version": run.dataset_version,
        "provider": run.provider,
        "status": run.status,
        "metrics": run.metrics_json.get("chat", run.metrics_json) if run.metrics_json else {},
        "results": run.results_json,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
    }


@router.get("/profit/cases")
def list_golden_profit_cases(db: Session = Depends(get_db)):
    cases = db.scalars(select(GoldenProfitCase).order_by(GoldenProfitCase.case_id)).all()
    return {
        "cases": [
            {
                "case_id": c.case_id,
                "input": c.input_json,
                "expected_net_revenue": str(c.expected_net_revenue) if c.expected_net_revenue is not None else None,
                "expected_total_cost": str(c.expected_total_cost) if c.expected_total_cost is not None else None,
                "expected_profit": str(c.expected_profit) if c.expected_profit is not None else None,
                "expected_margin_pct": str(c.expected_margin_pct) if c.expected_margin_pct is not None else None,
                "expected_status": c.expected_status,
                "notes": c.notes,
            }
            for c in cases
        ],
        "total": len(cases),
    }


@router.post("/profit/run")
def run_profit_evaluation_endpoint(
    dataset_version: str = "demo-v1",
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if isinstance(current_user, User) else "evaluator"
    run = evaluation_service.run_profit_evaluation(
        db=db,
        dataset_version=dataset_version,
        actor=actor,
    )
    return {
        "id": run.id,
        "dataset_version": run.dataset_version,
        "provider": run.provider,
        "status": run.status,
        "metrics": run.metrics_json.get("profit", run.metrics_json) if run.metrics_json else {},
        "results": run.results_json,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
    }


@router.get("/runs")
def list_evaluation_runs(limit: int = 10, db: Session = Depends(get_db)):
    runs = db.scalars(
        select(EvaluationRun).order_by(EvaluationRun.started_at.desc()).limit(limit)
    ).all()
    return {
        "runs": [
            {
                "id": r.id,
                "dataset_version": r.dataset_version,
                "provider": r.provider,
                "status": r.status,
                "metrics": r.metrics_json,
                "started_at": r.started_at.isoformat(),
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "created_by": r.created_by,
            }
            for r in runs
        ]
    }
