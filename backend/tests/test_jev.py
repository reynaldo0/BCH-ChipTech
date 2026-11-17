import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import httpx
import pytest

from backend.app.config import settings
from backend.app.services import jev


@pytest.fixture(autouse=True)
def enable_jev(monkeypatch):
    monkeypatch.setattr(settings, "jev_enabled", True)
    monkeypatch.setattr(settings, "openrouter_api_key", "sk-or-test")
    jev.breaker.reset()
    yield
    jev.breaker.reset()


def _response(answers):
    return httpx.Response(
        200,
        json={"id": "dec-1", "model": "typesafe/jev-1.14", "answers": answers, "usage": {"input_tokens": 90, "output_tokens": 0, "cost": 0.0000038}},
        request=httpx.Request("POST", settings.jev_endpoint),
    )


def test_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "jev_enabled", False)
    assert jev.classify("halo").status == "disabled"


def test_parses_decisions_api_and_masks_pii(monkeypatch):
    sent = {}

    def fake_post(payload):
        sent.update(payload)
        return _response({
            "kategori": {"type": "choice", "choice": "keluhan", "probabilities": {"umum": 0.1, "belum_pasti": 0.1, "keluhan": 0.8}, "confidence": 0.8},
            "injeksi": {"type": "noul", "noul": 0.02},
            "urgensi": {"type": "score", "score": 2.2, "probabilities": {}},
        })

    monkeypatch.setattr(jev, "_post", fake_post)
    result = jev.classify("paket belum datang, WA 0812-3456-7890")
    assert result.ok and result.says_complaint and result.severity == "tinggi"
    assert "0812" not in sent["state"]
    # "perlu_staf" was dropped: on real Jev output it scored 0.6-0.85 on ordinary stock questions.
    assert set(sent["questions"]) == {"kategori", "injeksi", "urgensi"}
    assert sent["questions"]["kategori"]["type"] == "choice"
    assert set(sent["questions"]["kategori"]["criteria"]) == {"umum", "belum_pasti", "keluhan"}


def test_timeout_retries_once_then_falls_back(monkeypatch):
    calls = {"n": 0}

    def slow(payload):
        calls["n"] += 1
        raise httpx.ReadTimeout("slow")

    monkeypatch.setattr(jev, "_post", slow)
    result = jev.classify("ready?")
    assert not result.ok and result.status == "timeout"
    assert calls["n"] == 2  # first try + one retry


def test_circuit_breaker_opens_after_three_failures(monkeypatch):
    calls = {"n": 0}

    def boom(payload):
        calls["n"] += 1
        raise httpx.ConnectError("down")

    monkeypatch.setattr(jev, "_post", boom)
    for _ in range(3):
        jev.classify("ready?")
    before = calls["n"]
    result = jev.classify("ready?")
    assert result.status == "circuit_open"
    assert calls["n"] == before  # no network call while open
    assert jev.provider_info()["mode_label"] == "Mode aturan"


def test_jev_can_only_raise_caution(monkeypatch):
    """A rule-based complaint must stay a complaint even if Jev says 'umum'."""
    from fastapi.testclient import TestClient
    from backend.app.main import app

    monkeypatch.setattr(jev, "_post", lambda payload: _response({
        "kategori": {"type": "choice", "choice": "umum", "probabilities": {"umum": 0.99}},
        "injeksi": {"type": "noul", "noul": 0.0},
        "perlu_staf": {"type": "noul", "noul": 0.0},
        "urgensi": {"type": "score", "score": 0},
    }))
    with TestClient(app) as client:
        complaint = client.post("/api/chat/analyze", json={"message": "Kurma Ajwa 250 g yang datang rusak, penyok semua", "persist": False, "create_complaint": False}).json()
        assert complaint["message_class"] == "COMPLAINT"

        # Jev raising: general stock question flagged as needs-human -> escalated.
        monkeypatch.setattr(jev, "_post", lambda payload: _response({
            "kategori": {"type": "choice", "choice": "belum_pasti", "probabilities": {"belum_pasti": 0.93}},
            "injeksi": {"type": "noul", "noul": 0.0},
            "urgensi": {"type": "score", "score": 1},
        }))
        raised = client.post("/api/chat/analyze", json={"message": "Kurma Ajwa 250 g ready kak?", "persist": False}).json()
        assert raised["decision"] == "ESKALASI"
        assert raised["message_class"] == "UNCERTAIN_INFORMATION"
        assert raised["provider"] == "rule-based+jev"


def test_raise_threshold_ignores_weak_signals(monkeypatch):
    """A 0.7 'belum_pasti' is below the calibrated 0.8 threshold and must not escalate."""
    monkeypatch.setattr(jev, "_post", lambda payload: _response({
        "kategori": {"type": "choice", "choice": "belum_pasti", "probabilities": {"umum": 0.3, "belum_pasti": 0.7}},
        "injeksi": {"type": "noul", "noul": 0.1},
        "urgensi": {"type": "score", "score": 0},
    }))
    result = jev.classify("Kurma Ajwa 250 g ready kak?", use_cache=False)
    assert result.ok and not result.says_uncertain and not result.says_complaint


def test_panel_shape_and_cache(monkeypatch):
    calls = {"n": 0}

    def post(payload):
        calls["n"] += 1
        return _response({
            "kategori": {"type": "choice", "choice": "keluhan", "probabilities": {"umum": 0.02, "belum_pasti": 0.03, "keluhan": 0.95}},
            "injeksi": {"type": "noul", "noul": 0.01},
            "urgensi": {"type": "score", "score": 2.0},
        })

    monkeypatch.setattr(jev, "_post", post)
    first = jev.classify("lecet semua pas dibuka")
    second = jev.classify("lecet semua pas dibuka")
    assert calls["n"] == 1 and second.cached and second.latency_ms == 0
    panel = first.panel("x")
    assert panel["category"] == "keluhan" and panel["category_probs"]["keluhan"] == 0.95
    assert panel["threshold"] == settings.jev_raise_threshold and "effect" in panel


def test_rate_limit_falls_back_to_rules(monkeypatch):
    monkeypatch.setattr(settings, "jev_max_calls_per_minute", 1)
    jev.stats.reset()
    monkeypatch.setattr(jev, "_post", lambda payload: _response({
        "kategori": {"type": "choice", "choice": "umum", "probabilities": {"umum": 1.0}},
        "injeksi": {"type": "noul", "noul": 0.0},
        "urgensi": {"type": "score", "score": 0},
    }))
    assert jev.classify("pesan satu", use_cache=False).ok
    assert jev.classify("pesan dua", use_cache=False).status == "rate_limited"


def test_engine_exposes_jev_panel_and_raises_complaint(monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app

    monkeypatch.setattr(jev, "_post", lambda payload: _response({
        "kategori": {"type": "choice", "choice": "keluhan", "probabilities": {"umum": 0.03, "belum_pasti": 0.02, "keluhan": 0.95}},
        "injeksi": {"type": "noul", "noul": 0.0},
        "urgensi": {"type": "score", "score": 2.0},
    }))
    with TestClient(app) as client:
        # Phrase the rule engine does not know -> only Jev can flag it.
        res = client.post("/api/chat/analyze", json={"message": "Barangnya lecet semua pas dibuka, mau dikembaliin", "persist": False, "create_complaint": False}).json()
    assert res["message_class"] == "COMPLAINT"
    assert res["jev"]["category"] == "keluhan" and "MENAIKKAN" in res["jev"]["effect"]
