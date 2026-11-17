import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from fastapi.testclient import TestClient

from backend.app.config import production_problems, settings
from backend.app.main import app


def test_unsafe_production_config_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "session_secret", "kompas-demo-secret-change-me")
    monkeypatch.setattr(settings, "seed_user_password", "")
    problems = production_problems(settings)
    assert len(problems) >= 2


def test_safe_production_config_passes(monkeypatch):
    monkeypatch.setattr(settings, "session_secret", "x" * 40)
    monkeypatch.setattr(settings, "seed_user_password", "kata-sandi-awal-kuat")
    monkeypatch.setattr(settings, "allowed_origins", "https://kompas.example.com")
    assert production_problems(settings) == []


def test_role_switch_and_reset_disabled_outside_demo(monkeypatch):
    with TestClient(app) as client:
        owner = client.post("/api/auth/login", json={"username": "owner", "password": "kompas123"}).json()["token"]
        monkeypatch.setattr(settings, "demo_mode", False)
        assert client.post("/api/auth/switch-role", json={"role": "owner"}).status_code == 404
        headers = {"Authorization": f"Bearer {owner}"}
        assert client.post("/api/settings/reset-demo", headers=headers).status_code == 403


def test_login_is_throttled_after_repeated_failures(monkeypatch):
    from backend.app.routers import auth

    auth._failures.clear()
    monkeypatch.setattr(settings, "login_max_failures", 3)
    with TestClient(app) as client:
        for _ in range(3):
            assert client.post("/api/auth/login", json={"username": "owner", "password": "salah"}).status_code == 401
        assert client.post("/api/auth/login", json={"username": "owner", "password": "salah"}).status_code == 429
    auth._failures.clear()
