"""Golden Set 100 from proposal Lampiran 3 (76 umum, 13 belum pasti, 11 keluhan)."""
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from backend.app.db import SessionLocal
from backend.app.main import app
from backend.app.services.chat_engine import analyze


def test_golden_set_100_matches_lampiran3():
    labels = json.loads((ROOT / "data/demo/golden_set_100_lampiran3.json").read_text())["labels"]
    first = {}
    with (ROOT / "csv/chat_customer_dummy_husin.csv").open(encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            if row["pengirim"] == "pelanggan" and row["id_percakapan"] not in first:
                first[row["id_percakapan"]] = row
    wrong, leaked = [], []
    with TestClient(app):
        db = SessionLocal()
        try:
            for cid, expected in labels.items():
                row = first[cid]
                res = analyze(
                    db, row["isi_pesan"], row["platform"], row["sku_konteks"] or None, cid,
                    datetime.fromisoformat(row["waktu_wib"]), persist=False, create_complaint=False, use_ai=False,
                )
                if res.message_class != expected:
                    wrong.append((cid, expected, res.message_class))
                    if expected == "COMPLAINT" and res.message_class == "GENERAL_QUESTION":
                        leaked.append(cid)
        finally:
            db.close()
    assert not leaked, f"Keluhan lolos sebagai pertanyaan umum: {leaked}"
    assert len(wrong) <= 10, f"Akurasi di bawah 90%: {wrong}"
