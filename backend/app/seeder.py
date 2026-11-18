"""Database Seeder for KOMPAS.
Seeds users, products, operational rules, FAQs, fee rules, capacity,
evidence, transactions, golden test sets, and initial calculation runs.
"""
from __future__ import annotations

import csv
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, engine, now_wib, utcnow
from .models import (
    Base,
    CapacityDay,
    ChatMessage,
    Complaint,
    FeeRule,
    GoldenChatCase,
    GoldenProfitCase,
    OperationalRule,
    Faq,
    Product,
    ProductEvidence,
    ShippingRule,
    StockSnapshot,
    Transaction,
    User,
)
from .security import hash_password
from .services import profit_engine

ROOT = Path(__file__).resolve().parents[2]
CSV_DIR = ROOT / "csv"
DATA_DIR = ROOT / "data" / "demo"


def parse_date(val: str | None) -> date | None:
    if not val:
        return None
    val = val.strip()
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        pass
    try:
        return datetime.strptime(val, "%d/%m/%Y").date()
    except Exception:
        return None


def parse_datetime(val: str | None) -> datetime | None:
    if not val:
        return None
    val = val.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M"):
        try:
            return datetime.strptime(val, fmt)
        except Exception:
            continue
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None


def seed_users(db: Session) -> None:
    demo_users = [
        ("owner", "owner@kompasdev.my.id", "Husin (Owner)", "owner"),
        ("manager", "manager@kompasdev.my.id", "Operational Manager", "manager"),
        ("cs", "cs@kompasdev.my.id", "CS Specialist", "cs"),
        ("packing", "packing@kompasdev.my.id", "Warehouse & Packing", "packing"),
        ("judge", "judge@kompasdev.my.id", "Competition Evaluator / Judge", "judge"),
    ]
    for username, email, display_name, role in demo_users:
        existing = db.scalar(select(User).where(User.username == username))
        if not existing:
            user = User(
                username=username,
                email=email,
                display_name=display_name,
                role=role,
                password_hash=hash_password(settings.seed_user_password or "kompas123"),
                is_active=True,
            )
            db.add(user)
        elif not existing.email:
            existing.email = email
    db.commit()


def seed_operational_rules(db: Session) -> None:
    csv_file = CSV_DIR / "operasional_toko_dummy_husin.csv"
    if not csv_file.exists():
        return
    with csv_file.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("id_operasional", "").strip()
            if not code:
                continue
            rule = db.scalar(select(OperationalRule).where(OperationalRule.code == code))
            if not rule:
                rule = OperationalRule(
                    code=code,
                    category=row.get("kategori", "").strip(),
                    parameter=row.get("parameter", "").strip(),
                    rule_text=row.get("ketentuan", "").strip(),
                    scope=row.get("cakupan", "").strip() or None,
                )
                db.add(rule)
    db.commit()


def seed_faqs(db: Session) -> None:
    csv_file = CSV_DIR / "faq_dummy_husin.csv"
    if not csv_file.exists():
        return
    with csv_file.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("id_faq", "").strip()
            if not code:
                continue
            faq = db.scalar(select(Faq).where(Faq.code == code))
            if not faq:
                faq = Faq(
                    code=code,
                    category=row.get("kategori", "").strip(),
                    question=row.get("pertanyaan", "").strip(),
                    answer=row.get("jawaban_acuan", "").strip(),
                    ops_refs=row.get("id_operasional", "").strip() or None,
                )
                db.add(faq)
    db.commit()


def seed_shipping_rule(db: Session) -> None:
    existing = db.scalar(select(ShippingRule).limit(1))
    if not existing:
        rule = ShippingRule(
            name="Aturan Operasional Toko Husin",
            timezone="Asia/Jakarta",
            cutoff_weekday="14:00",
            cutoff_saturday="12:00",
            packing_capacity_per_day=700,
            cs_schedule="Senin–Sabtu 08.00–17.00 WIB",
            effective_from=date(2026, 1, 1),
            notes="Mengikuti ketentuan operasional OPS-006 s/d OPS-014",
        )
        db.add(rule)
        db.commit()


def seed_products(db: Session) -> None:
    csv_file = CSV_DIR / "data_dummy_produk_husin.csv"
    if not csv_file.exists():
        return
    with csv_file.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            sku = (row.get("sku") or row.get("sku_dummy") or "").strip()
            if not sku:
                continue
            product = db.scalar(select(Product).where(Product.sku == sku))
            raw_name = (row.get("nama") or row.get("nama_produk") or "").strip()
            raw_modal = (row.get("modal") or row.get("modal_barang") or "").replace(".", "").replace(",", ".").strip()
            raw_price = (row.get("harga_jual") or "").replace(".", "").replace(",", ".").strip()
            raw_stock = (row.get("stok") or row.get("stok_sistem") or "0").strip()
            modal = Decimal(raw_modal) if raw_modal else None
            price = Decimal(raw_price) if raw_price else None
            stock_qty = int(raw_stock) if raw_stock.isdigit() else 0

            category = row.get("kategori", "").strip()
            if not category or category == "Lainnya":
                from .services.product_brain import derive_category
                category = derive_category(sku, raw_name)

            from .services.product_brain import derive_variant, derive_unit
            variant = row.get("varian", "").strip() or derive_variant(raw_name)
            unit = row.get("satuan", "").strip() or derive_unit(raw_name)

            if not product:
                product = Product(
                    sku=sku,
                    name=raw_name,
                    category=category,
                    variant=variant,
                    unit=unit,
                    modal=modal,
                    price=price,
                    is_active=True,
                    source_file="data_dummy_produk_husin.csv",
                    source_row=row_idx,
                    is_demo=True,
                )
                db.add(product)
                db.flush()

                snapshot = StockSnapshot(
                    product_id=product.id,
                    stock=stock_qty,
                    captured_at=now_wib(),
                    source="seed_dummy_csv",
                    is_demo=True,
                )
                db.add(snapshot)
    db.commit()


def seed_product_evidence(db: Session) -> None:
    evidence_file = DATA_DIR / "product_evidence.json"
    if not evidence_file.exists():
        return
    with evidence_file.open(encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        sku = item.get("sku")
        product = db.scalar(select(Product).where(Product.sku == sku))
        if not product:
            continue
        existing = db.scalar(
            select(ProductEvidence).where(
                ProductEvidence.product_id == product.id,
                ProductEvidence.evidence_type == item.get("evidence_type"),
            )
        )
        if not existing:
            ev = ProductEvidence(
                product_id=product.id,
                evidence_type=item.get("evidence_type"),
                issuer=item.get("issuer", "LPPOM MUI"),
                document_no=item.get("document_no", "REG-DUMMY"),
                valid_from=parse_date(item.get("valid_from")),
                valid_to=parse_date(item.get("valid_to")),
                status=item.get("status", "VALID"),
                is_demo=True,
                file_ref=item.get("file_ref"),
                notes=item.get("notes"),
            )
            db.add(ev)
    db.commit()


def seed_capacity_days(db: Session) -> None:
    cap_file = DATA_DIR / "capacity_days.json"
    if not cap_file.exists():
        return
    with cap_file.open(encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        d = parse_date(item.get("day"))
        if not d:
            continue
        existing = db.scalar(select(CapacityDay).where(CapacityDay.day == d))
        if not existing:
            cap = CapacityDay(
                day=d,
                capacity=item.get("capacity", 700),
                used=item.get("used", 0),
                is_closed=item.get("is_closed", False),
                note=item.get("note"),
            )
            db.add(cap)
    db.commit()


def seed_fee_rules(db: Session) -> None:
    fee_file = DATA_DIR / "fee_rules.json"
    if not fee_file.exists():
        return
    with fee_file.open(encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        version = item.get("version", "v1")
        marketplace = item.get("marketplace")
        from_date = parse_date(item.get("effective_from")) or date(2026, 1, 1)
        existing = db.scalar(
            select(FeeRule).where(
                FeeRule.version == version,
                FeeRule.marketplace == marketplace,
                FeeRule.effective_from == from_date,
            )
        )
        if not existing:
            fee = FeeRule(
                marketplace=marketplace,
                category=item.get("category", "ALL"),
                version=version,
                effective_from=from_date,
                effective_to=parse_date(item.get("effective_to")),
                commission_pct=Decimal(str(item.get("commission_pct", "0"))),
                fixed_fee=Decimal(str(item.get("fixed_fee", "0"))),
                admin_pct=Decimal(str(item.get("admin_pct", "0"))),
                notes=item.get("notes"),
            )
            db.add(fee)
    db.commit()


def seed_golden_cases(db: Session) -> None:
    chat_file = DATA_DIR / "golden_chat_cases.json"
    if chat_file.exists():
        with chat_file.open(encoding="utf-8") as f:
            cases = json.load(f)
        for item in cases:
            cid = item.get("case_id")
            existing = db.scalar(select(GoldenChatCase).where(GoldenChatCase.case_id == cid))
            if not existing:
                gc = GoldenChatCase(
                    case_id=cid,
                    message=item.get("message", ""),
                    platform=item.get("platform", "Shopee"),
                    sku_context=item.get("sku_context"),
                    as_of=parse_datetime(item.get("as_of")),
                    expected_intent=item.get("expected_intent", "lainnya"),
                    expected_message_class=item.get("expected_message_class", "GENERAL_QUESTION"),
                    expected_decision=item.get("expected_decision", "JAWAB_TERBATAS"),
                    expected_complaint=item.get("expected_complaint", False),
                    expected_severity=item.get("expected_severity", "rendah"),
                    expected_abstain=item.get("expected_abstain", False),
                    injection=item.get("injection", False),
                    notes=item.get("notes"),
                    dataset_version=item.get("dataset_version", "demo-v1"),
                )
                db.add(gc)

    profit_file = DATA_DIR / "golden_profit_cases.json"
    if profit_file.exists():
        with profit_file.open(encoding="utf-8") as f:
            pcases = json.load(f)
        for item in pcases:
            cid = item.get("case_id")
            existing = db.scalar(select(GoldenProfitCase).where(GoldenProfitCase.case_id == cid))
            if not existing:
                def dec(val):
                    if val is None:
                        return None
                    s = str(val).strip()
                    if not s or s.lower() in ("none", "null"):
                        return None
                    try:
                        return Decimal(s)
                    except Exception:
                        return None

                exp = item.get("expected") or {}
                gp = GoldenProfitCase(
                    case_id=cid,
                    input_json=item.get("input", {}),
                    expected_net_revenue=dec(exp.get("net_revenue", item.get("expected_net_revenue"))),
                    expected_total_cost=dec(exp.get("total_cost", item.get("expected_total_cost"))),
                    expected_profit=dec(exp.get("profit", item.get("expected_profit"))),
                    expected_margin_pct=dec(exp.get("margin_pct", item.get("expected_margin_pct"))),
                    expected_status=exp.get("status", item.get("expected_status", "COMPLETE")),
                    notes=item.get("notes"),
                    dataset_version=item.get("dataset_version", "demo-v1"),
                )
                db.add(gp)
    db.commit()


def seed_chat_messages(db: Session) -> None:
    csv_file = CSV_DIR / "chat_customer_dummy_husin.csv"
    if not csv_file.exists():
        return
    count = db.scalar(select(ChatMessage).limit(1))
    if count:
        return
    with csv_file.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get("id_percakapan", "").strip()
            seq_val = row.get("urutan", "1").strip()
            if not cid:
                continue
            msg = ChatMessage(
                conversation_id=cid,
                seq=int(seq_val) if seq_val.isdigit() else 1,
                sent_at=parse_datetime(row.get("waktu_kirim")) or utcnow(),
                platform=row.get("kanal", "Shopee").strip(),
                sender=row.get("pengirim", "pembeli").strip(),
                message=row.get("pesan", "").strip(),
                sku_context=row.get("sku_konteks", "").strip() or None,
                customer_id=row.get("id_pelanggan", "").strip() or None,
                is_demo=True,
            )
            db.add(msg)
    db.commit()


def seed_transactions(db: Session) -> None:
    tx_file = DATA_DIR / "transactions_all.json"
    if not tx_file.exists():
        return
    count = db.scalar(select(Transaction).limit(1))
    if count:
        return
    with tx_file.open(encoding="utf-8") as f:
        data = json.load(f)

    sku_map = {p.sku: p.id for p in db.scalars(select(Product)).all()}

    def dec(v):
        if v is None:
            return None
        s = str(v).strip()
        if not s or s.lower() in ("none", "null"):
            return None
        try:
            return Decimal(s)
        except Exception:
            return None

    for item in data:
        sku = item.get("sku", "")
        tx = Transaction(
            transaction_id=item.get("transaction_id"),
            order_id=item.get("order_id"),
            marketplace=item.get("marketplace"),
            transaction_date=parse_date(item.get("transaction_date")),
            sku=sku,
            product_id=sku_map.get(sku),
            qty=item.get("qty", 1),
            gross_sales=dec(item.get("gross_sales")) or Decimal("0"),
            seller_discount=dec(item.get("seller_discount")),
            refund_amount=dec(item.get("refund_amount")),
            cogs=dec(item.get("cogs")),
            marketplace_commission=dec(item.get("marketplace_commission")),
            fixed_fee=dec(item.get("fixed_fee")),
            seller_shipping_cost=dec(item.get("seller_shipping_cost")),
            packing_cost=dec(item.get("packing_cost")),
            return_logistics_cost=dec(item.get("return_logistics_cost")),
            other_costs=dec(item.get("other_costs")),
            fee_rule_version=item.get("fee_rule_version", "v1"),
            status=item.get("status", "completed"),
            notes=item.get("notes"),
            is_demo=True,
        )
        db.add(tx)
    db.commit()


def seed_complaints(db: Session) -> None:
    count = db.scalar(select(Complaint).limit(1))
    if count:
        return

    sample_complaints = [
        Complaint(
            ticket_no="TKT-202611-0001",
            conversation_id="CHAT-SHP-0012",
            customer_id="CUST-08129",
            platform="Shopee",
            sku="SKU-PRFM-001",
            category="Kerusakan Barang",
            severity="tinggi",
            status="PERLU_PERHATIAN",
            summary="Botol parfum Kasturi Putih 6ml pecah saat dibuka, cairan merembes ke kardus luar.",
            estimated_cost=Decimal("70000.00"),
            confirmed_cost=Decimal("70000.00"),
            source="chat",
            notes="Customer melampirkan video unboxing jelas. Solusi: ganti kirim barang baru + klaim kurir.",
        ),
        Complaint(
            ticket_no="TKT-202611-0002",
            conversation_id="CHAT-TTS-0045",
            customer_id="CUST-05541",
            platform="TikTok Shop",
            sku="SKU-KRMA-002",
            category="Keterlambatan Pengiriman",
            severity="sedang",
            status="SELESAI",
            summary="Customer menanyakan paket Kurma Sukari belum tiba setelah 3 hari.",
            estimated_cost=Decimal("0.00"),
            confirmed_cost=Decimal("0.00"),
            source="chat",
            notes="CS melakukan follow up ke kurir. Paket sudah berhasil diserahterimakan pada hari ke-4.",
        ),
        Complaint(
            ticket_no="TKT-202611-0003",
            conversation_id="CHAT-LZD-0021",
            customer_id="CUST-09822",
            platform="Lazada",
            sku="SKU-CKLT-001",
            category="Salah Kirim",
            severity="tinggi",
            status="BARU",
            summary="Pesan Cokelat Kerikil Turki 500gr yang datang Kurma Khalas 500gr.",
            estimated_cost=Decimal("110000.00"),
            confirmed_cost=None,
            source="chat",
            notes="Menunggu nomor invoice dan foto label packing untuk crosscheck tim gudang.",
        ),
        Complaint(
            ticket_no="TKT-202611-0004",
            conversation_id="CHAT-SHP-0089",
            customer_id="CUST-03312",
            platform="Shopee",
            sku="SKU-ZAMZ-001",
            category="Kemasan Rusak",
            severity="sedang",
            status="BARU",
            summary="Segel galon Air Zamzam 5L sedikit rembes di tutupnya.",
            estimated_cost=Decimal("35000.00"),
            confirmed_cost=None,
            source="chat",
            notes="Tawaran cashback kompensasi sebesar Rp35.000 sedang diajukan ke pembeli.",
        ),
        Complaint(
            ticket_no="TKT-202611-0005",
            conversation_id="CHAT-SHP-0104",
            customer_id="CUST-01201",
            platform="Shopee",
            sku="SKU-HRBL-001",
            category="Pertanyaan Izin / Halal",
            severity="rendah",
            status="SELESAI",
            summary="Meminta kejelasan nomor izin edar BPOM dan sertifikat Halal Habbatussauda.",
            estimated_cost=Decimal("0.00"),
            confirmed_cost=Decimal("0.00"),
            source="chat",
            notes="CS sudah membagikan dokumen evidence Product Brain resmi yang terverifikasi.",
        ),
    ]
    for c in sample_complaints:
        db.add(c)
    db.commit()


def seed_all(force: bool = False) -> None:
    if force:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_users(db)
        seed_operational_rules(db)
        seed_faqs(db)
        seed_shipping_rule(db)
        seed_products(db)
        seed_product_evidence(db)
        seed_capacity_days(db)
        seed_fee_rules(db)
        seed_golden_cases(db)
        seed_chat_messages(db)
        seed_transactions(db)
        seed_complaints(db)

        # Trigger initial profit calculation run if none exists
        latest_calc = profit_engine.latest_run(db)
        if not latest_calc:
            try:
                profit_engine.run_calculation(db, scope="all", actor="system_seeder")
            except Exception as e:
                print(f"[seeder] profit calculation notice: {e}")


if __name__ == "__main__":
    print("Starting seeder...")
    seed_all()
    print("Database successfully seeded!")
