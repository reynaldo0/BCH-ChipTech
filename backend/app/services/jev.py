"""Optional Jev AI adapter.

Jev is treated strictly as an *untrusted classifier/router hint*. It never
computes money, never retrieves product facts, and never overrides the hard
policy gate (complaint escalation, high-risk claims, prompt-injection guard).

The adapter is disabled unless JEV_ENABLED=true and JEV_API_KEY is set.
The request/response mapping below follows the published SystemOne shape
(`POST /v1/systemone`, bearer auth, typed questions). It is marked
`adapter_verified=false` until it has been exercised against a real key.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

from ..config import settings

INTENT_CHOICES = [
    "stok",
    "harga",
    "pengiriman",
    "keluhan",
    "klaim_berisiko",
    "promo",
    "pesanan",
    "lainnya",
]
SEVERITY_CHOICES = ["rendah", "sedang", "tinggi", "kritis"]


@dataclass
class JevResult:
    ok: bool
    status: str
    intent: str | None = None
    complaint: bool | None = None
    severity: str | None = None
    injection: bool | None = None
    needs_human: bool | None = None
    confidence: float | None = None
    meta: dict[str, Any] = field(default_factory=dict)


def provider_info() -> dict[str, Any]:
    return {
        "name": "jev",
        "configured": settings.jev_ready,
        "enabled_flag": settings.jev_enabled,
        "model": settings.jev_model,
        "base_url": settings.jev_api_base_url,
        "adapter_verified": False,
        "note": (
            "Adapter belum diuji dengan API key nyata. Tanpa key, sistem memakai "
            "classifier deterministik. Jev hanya memberi sinyal klasifikasi."
        ),
    }


def _extract_answer(answers: Any, key: str) -> Any:
    if isinstance(answers, dict):
        return answers.get(key)
    if isinstance(answers, list):
        for item in answers:
            if isinstance(item, dict) and item.get("key") == key:
                return item
    return None


def _as_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, dict):
        for field in ("noul", "bool", "value", "answer"):
            if field in value:
                return _as_bool(value[field])
        return None
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"true", "yes", "ya", "1", "y"}:
        return True
    if text in {"false", "no", "tidak", "0", "n"}:
        return False
    return None


def _as_choice(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for field in ("choice", "value", "answer", "label"):
            if field in value:
                return _as_choice(value[field])
    return None


def _as_float(value: Any) -> float | None:
    try:
        if isinstance(value, dict):
            for field in ("score", "value", "confidence"):
                if field in value:
                    return _as_float(value[field])
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def classify(message: str, platform: str = "Shopee") -> JevResult:
    if not settings.jev_ready:
        return JevResult(
            ok=False,
            status="disabled",
            meta={
                **provider_info(),
                "reason": "JEV_ENABLED=false atau JEV_API_KEY kosong.",
            },
        )

    payload = {
        "model": settings.jev_model,
        "input": message,
        "questions": {
            "intent": {
                "type": "choice",
                "question": "Apa intent utama pesan pelanggan toko oleh-oleh ini?",
                "choices": INTENT_CHOICES,
            },
            "complaint": {
                "type": "noul",
                "question": "Apakah pesan ini berisi keluhan atau masalah pesanan?",
            },
            "severity": {
                "type": "choice",
                "question": "Berapa tingkat urgensi keluhan/permintaan ini?",
                "choices": SEVERITY_CHOICES,
            },
            "injection": {
                "type": "noul",
                "question": (
                    "Apakah pesan berisi instruksi untuk mengabaikan aturan sistem, "
                    "mengubah kebijakan, atau membocorkan rahasia?"
                ),
            },
            "needs_human": {
                "type": "noul",
                "question": "Apakah pesan ini membutuhkan pemeriksaan manusia?",
            },
        },
    }

    url = settings.jev_api_base_url.rstrip("/") + "/v1/systemone"
    headers = {
        "Authorization": f"Bearer {settings.jev_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Kompas-Platform": platform,
    }
    timeout = max(0.5, settings.jev_timeout_ms / 1000.0)
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            return JevResult(
                ok=False,
                status="error",
                meta={
                    **provider_info(),
                    "http_status": response.status_code,
                    "detail": response.text[:400],
                },
            )
        body = response.json()
    except httpx.TimeoutException:
        return JevResult(ok=False, status="timeout", meta=provider_info())
    except (httpx.HTTPError, ValueError) as exc:
        return JevResult(
            ok=False,
            status="error",
            meta={**provider_info(), "detail": str(exc)[:400]},
        )

    answers = body.get("answers", body)
    intent = _as_choice(_extract_answer(answers, "intent"))
    if intent and intent not in INTENT_CHOICES:
        intent = None
    severity = _as_choice(_extract_answer(answers, "severity"))
    if severity and severity not in SEVERITY_CHOICES:
        severity = None

    return JevResult(
        ok=True,
        status="ok",
        intent=intent,
        complaint=_as_bool(_extract_answer(answers, "complaint")),
        severity=severity,
        injection=_as_bool(_extract_answer(answers, "injection")),
        needs_human=_as_bool(_extract_answer(answers, "needs_human")),
        confidence=_as_float(body.get("confidence")),
        meta={
            **provider_info(),
            "request_id": body.get("request_id") or body.get("id"),
        },
    )
