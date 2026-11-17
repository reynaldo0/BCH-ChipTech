from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import AuditLog, ChatAnalysis, ChatMessage, User
from ..schemas import ChatAnalyzeRequest, ChatAnalyzeResponse, EvidenceItem
from ..security import get_current_user_optional
from ..services import chat_engine, jev

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequestWithProvider(ChatAnalyzeRequest):
    prefer_provider: str = "auto"  # "auto", "rule-based", "jev"


class QueueRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)
    platform: str = "Shopee"
    prefer_provider: str = "auto"


class WrongRouteRequest(BaseModel):
    expected_class: str | None = None
    note: str | None = Field(default=None, max_length=500)


CLASS_PRIORITY = {"COMPLAINT": 0, "UNCERTAIN_INFORMATION": 1, "GENERAL_QUESTION": 2}
SEVERITY_PRIORITY = {"kritis": 0, "tinggi": 1, "sedang": 2, "rendah": 3}


def split_messages(text: str) -> list[str]:
    """Split a pasted block into buyer messages.

    Blank lines separate messages; if there are none, each non-empty line is a
    message. Leading chat prefixes such as "Pembeli:" or "[10:21]" are removed.
    """
    import re

    text = text.replace("\r\n", "\n").strip()
    blocks = [b for b in re.split(r"\n\s*\n", text) if b.strip()]
    if len(blocks) <= 1:
        blocks = [line for line in text.split("\n") if line.strip()]
    cleaned = []
    for block in blocks:
        item = " ".join(part.strip() for part in block.split("\n") if part.strip())
        item = re.sub(r"^\s*(?:\d+[.)]\s+|[-*\u2022]\s+)", "", item)
        item = re.sub(r"^\s*\[?\d{1,2}[:.]\d{2}\]?\s*", "", item)
        item = re.sub(r"^\s*(?:pembeli|buyer|customer|cust)\s*:\s*", "", item, flags=re.IGNORECASE)
        if item:
            cleaned.append(item[:2000])
    return cleaned[:50]


def _serialise(res, original: str | None = None) -> dict[str, Any]:
    return {
        "message": original,
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
        "alternatives": res.alternatives,
        "copy_allowed": res.message_class != "UNCERTAIN_INFORMATION",
        "evidence": res.evidence,
        "warnings": res.warnings,
        "complaint_ticket": res.complaint_ticket,
        "order_ref": res.order_ref,
        "analysis_id": res.analysis_id,
        "normalized": res.normalized,
        "reason": res.reason,
        "latency_ms": res.latency_ms,
    }


@router.post("/analyze")
def analyze_chat(
    payload: ChatRequestWithProvider,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "cs_demo"

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
        use_ai=payload.prefer_provider != "rule-based",
    )
    return _serialise(res, payload.message)


@router.post("/queue")
def analyze_queue(
    payload: QueueRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Mode Antrean (Jalur C): split a pasted batch and sort by priority."""
    actor = current_user.username if current_user else "cs_demo"
    messages = split_messages(payload.text)
    if not messages:
        raise HTTPException(status_code=400, detail="Tidak ada pesan yang bisa dipisahkan.")
    items = []
    for index, message in enumerate(messages):
        res = chat_engine.analyze(
            db=db,
            message=message,
            platform=payload.platform,
            actor=actor,
            use_ai=payload.prefer_provider != "rule-based",
        )
        item = _serialise(res, message)
        item["position"] = index + 1
        items.append(item)
    items.sort(
        key=lambda it: (
            CLASS_PRIORITY.get(it["message_class"], 3),
            SEVERITY_PRIORITY.get(it["severity"], 4),
            it["position"],
        )
    )
    counts: dict[str, int] = {}
    for it in items:
        counts[it["message_class"]] = counts.get(it["message_class"], 0) + 1
    return {"total": len(items), "counts": counts, "items": items, "provider": jev.provider_info()}


@router.post("/{analysis_id}/wrong-route")
def report_wrong_route(
    analysis_id: int,
    payload: WrongRouteRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Tombol "rute salah" (proposal §6.6): log a misclassification for review."""
    analysis = db.get(ChatAnalysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan.")
    db.add(
        AuditLog(
            actor=current_user.username if current_user else "cs_demo",
            action="chat.wrong_route",
            entity="chat_analysis",
            entity_id=str(analysis_id),
            detail_json={
                "predicted_class": analysis.message_class,
                "expected_class": payload.expected_class,
                "note": payload.note,
            },
        )
    )
    db.commit()
    return {"ok": True, "message": "Terima kasih. Rute salah dicatat untuk perbaikan kamus."}


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
    return jev.provider_info()
