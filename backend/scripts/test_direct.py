"""Quick smoke test of every KOMPAS module through the real HTTP API (no server needed).

Run from the repository root:  python backend/scripts/test_direct.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402


def main() -> None:
    with TestClient(app) as client:
        owner = client.post("/api/auth/switch-role", json={"role": "owner"}).json()["token"]
        auth = {"Authorization": f"Bearer {owner}"}

        print("--- 1. Product Brain ---")
        products = client.get("/api/products", headers=auth).json()
        print("Produk:", products["total"])

        print("--- 2. Workspace CS ---")
        chat = client.post(
            "/api/chat/analyze",
            json={"message": "Kurma Ajwa 250 g ready kak?", "prefer_provider": "rule-based"},
        ).json()
        print(f"{chat['message_class']} / {chat['decision']}: {chat['draft'][:90]}")

        print("--- 3. Profit Engine (Laba Kontribusi) ---")
        summary = client.get("/api/profit/summary", headers=auth).json()
        c = summary["contribution"]
        print("Omzet:", c["gross_sales"], "| Dana dilepas:", c["dana_dilepas"])
        print("LK I:", c["lk1"], f"({c['lk1_margin_pct']}%)", "| LK II:", c["lk2"] or f"Belum lengkap ({c['lk2_rows_missing']} baris)")

        print("--- 4. Keluhan ---")
        print("Tiket:", client.get("/api/complaints").json()["total"])

        print("--- 5. Golden Set profit ---")
        profit_eval = client.post("/api/evaluation/profit/run").json()["metrics"]
        print("Lulus:", profit_eval["passed_ratio"])
        assert profit_eval["passed"] >= 17 and profit_eval["total"] == 18

        print("--- 6. Golden Set chat ---")
        chat_eval = client.post("/api/evaluation/chat/run", json={"provider": "rule-based"}).json()["metrics"]
        print(
            "Kelas:", chat_eval["class_accuracy"], "| Keputusan:", chat_eval["decision_accuracy"],
            "| Recall keluhan:", chat_eval["complaint_recall"],
        )
        assert chat_eval["decision_correct"] >= 24

    print("\nSEMUA MODUL BACKEND LULUS SMOKE TEST.")


if __name__ == "__main__":
    main()
