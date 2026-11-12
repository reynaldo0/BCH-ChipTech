from dataclasses import asdict
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import ChatAnalysis, ChatMessage, User
from ..schemas import ChatAnalyzeRequest, ChatAnalyzeResponse, EvidenceItem
from ..security import get_current_user_optional
from ..services import chat_engine, jev

router = APIRouter(prefix="/api/chat", tags=["chat"])

# In-memory toggle for demo simulation of Jev AI
DEMO_STATE = {
    "jev_demo_mode": False,
}


class ChatRequestWithProvider(ChatAnalyzeRequest):
    prefer_provider: str = "auto"  # "auto", "rule-based", "jev"


class ToggleJevRequest(BaseModel):
    enabled: bool


@router.post("/analyze")
def analyze_chat(
    payload: ChatRequestWithProvider,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "cs_demo"

    # If demo mode is active or requested, adjust settings temporarily or pass provider
    prefer = payload.prefer_provider
    if DEMO_STATE["jev_demo_mode"] and prefer == "auto":
        prefer = "jev"

    res = chat_engine.analyze(
        db=db,
        message=payload.message,
        platform=payload.platform,
        sku_context=payload.sku_context,
        conversation_id=payload.conversation_id,
        as_of=payload.as_of,
        persist=payload.persist,
        create_complaint=payload.create_complaint,
        actor=actor,
    )

    return {
        "message_class": res.message_class,
        "intent": res.intent,
        "intents": res.intents,
        "decision": res.decision,
        "severity": res.severity,
        "complaint": res.complaint,
        "injection": res.injection,
        "confidence": float(res.confidence),
        "provider": res.provider,
        "provider_status": res.provider_status,
        "provider_meta": res.provider_meta,
        "sku": res.sku,
        "product_name": res.product_name,
        "draft": res.draft,
        "evidence": res.evidence,
        "warnings": res.warnings,
        "complaint_ticket": res.complaint_ticket,
        "analysis_id": res.analysis_id,
        "normalized": res.normalized,
        "reason": res.reason,
        "latency_ms": res.latency_ms,
    }


@router.get("/history")
def get_chat_history(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    analyses = db.scalars(
        select(ChatAnalysis).order_by(ChatAnalysis.created_at.desc()).limit(limit)
    ).all()

    return {
        "history": [
            {
                "id": a.id,
                "conversation_id": a.conversation_id,
                "platform": a.platform,
                "message": a.message,
                "intent": a.intent,
                "decision": a.decision,
                "severity": a.severity,
                "complaint": a.complaint_flag,
                "injection": a.injection_flag,
                "confidence": float(a.confidence) if a.confidence else 0.0,
                "provider": a.provider,
                "draft": a.draft,
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ]
    }


@router.get("/sample-conversations")
def get_sample_conversations(
    platform: str | None = None,
    limit: int = 30,
    db: Session = Depends(get_db),
):
    query = select(ChatMessage).order_by(ChatMessage.sent_at.desc())
    if platform:
        query = query.where(ChatMessage.platform == platform)
    messages = db.scalars(query.limit(limit)).all()

    return {
        "messages": [
            {
                "id": m.id,
                "conversation_id": m.conversation_id,
                "seq": m.seq,
                "platform": m.platform,
                "sender": m.sender,
                "message": m.message,
                "sku_context": m.sku_context,
                "customer_id": m.customer_id,
                "sent_at": m.sent_at.isoformat(),
            }
            for m in messages
        ]
    }


@router.get("/provider")
def get_provider_info():
    info = jev.provider_info()
    info["demo_simulation_enabled"] = DEMO_STATE["jev_demo_mode"]
    return info


@router.post("/toggle-jev")
def toggle_jev(payload: ToggleJevRequest):
    DEMO_STATE["jev_demo_mode"] = payload.enabled
    return {
        "message": f"Mode Jev AI {'diaktifkan' if payload.enabled else 'dinonaktifkan'}.",
        "jev_demo_mode": DEMO_STATE["jev_demo_mode"],
    }
