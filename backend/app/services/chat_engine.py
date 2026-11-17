"""Deterministic Chat Copilot orchestrator with a hard policy gate."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import now_wib
from ..models import AuditLog, ChatAnalysis, Complaint, Faq, Product
from ..policy import (
    STOCK_PATTERNS,
    classify_intent,
    detect_high_risk,
    detect_injection,
    detect_intents,
    extract_order_ref,
    extract_qty,
    format_idr,
    is_complaint,
    is_risky_payment,
    mask_pii,
    staff_check,
    normalize_message,
    severity_for,
)
from . import jev
from .product_brain import (
    ResolvedProduct,
    capacity_remaining,
    evidence_for,
    evidence_is_valid,
    faq_matches,
    get_product,
    latest_stock,
    ops_rules_by_refs,
    resolve_product,
    shipping_context,
    stock_age_hours,
    stock_state,
    valid_evidence_for,
)

DECISION_DIRECT = "JAWAB_LANGSUNG"
DECISION_LIMITED = "JAWAB_TERBATAS"
DECISION_ESCALATE = "ESKALASI"

RISK_LABEL = {
    "halal": "sertifikat halal",
    "bpom": "izin edar/BPOM",
    "expiry": "tanggal kedaluwarsa",
    "composition": "komposisi/kandungan",
    "allergen": "alergen/kandungan",
    "storage": "cara penyimpanan",
}

# Fixed-answer FAQ intents (Jalur A topics). Order matters: first match wins.
FIXED_FAQ = [
    (r"transfer|rekening|\botp\b|kode\s+verifikasi", "FAQ-030"),
    (r"\bcod\b|bayar\s+di\s+tempat", "FAQ-027"),
    (r"voucher|gratis\s+ongkir|kode\s+promo|promo(nya)?\s+(tidak|gagal)", "FAQ-028"),
    (r"instant|same\s*day|sameday|gosend|grabexpress", "FAQ-011"),
    (r"ongkir|ongkos\s+kirim|biaya\s+kirim|tarif\s+kirim", "FAQ-009"),
    (r"sampai\s+kapan|kapan\s+sampai|berapa\s+lama\s+sampai|estimasi\s+(tiba|sampai)|lama\s+pengiriman", "FAQ-010"),
    (r"dikirim\s+dari|kirim\s+dari\s+mana|lokasi\s+(toko|gudang)|alamat\s+toko|toko(nya)?\s+di\s+mana", "FAQ-008"),
    (r"(cs|admin|kak)\s+(online|buka|aktif)|jam\s+(buka|operasional|kerja|online)|online\s+jam|balas\s+jam", "FAQ-007"),
    (r"\bbatal", "FAQ-022"),
    (r"packing(nya)?\s+aman|dikemas\s+aman", "FAQ-019"),
    (r"beli\s+banyak.*diskon|diskon\s+grosir", "FAQ-029"),
]
CUTOFF_QUESTION = r"hari\s+ini|besok|jam\s+berapa|batas|terakhir|cut\s*-?\s*off|keburu|masih\s+bisa\s+(dikirim|kirim)"
SHIPPING_WORDS = r"kirim|pengiriman|ongkir|kurir|sampai|pickup|hari\s+ini|besok|\bminggu\b|resi"
WEEKDAY_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]


@dataclass
class ChatResult:
    message_class: str = "GENERAL_QUESTION"
    intent: str = "lainnya"
    intents: list[str] = field(default_factory=list)
    decision: str = DECISION_LIMITED
    severity: str = "rendah"
    complaint: bool = False
    injection: bool = False
    confidence: float = 0.0
    provider: str = "rule-based"
    provider_status: str = "disabled"
    provider_meta: dict[str, Any] = field(default_factory=dict)
    sku: str | None = None
    product_name: str | None = None
    draft: str = ""
    evidence: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    complaint_ticket: str | None = None
    analysis_id: int | None = None
    normalized: str = ""
    reason: str = ""
    latency_ms: int | None = None
    alternatives: list[str] = field(default_factory=list)
    order_ref: str | None = None


def _fmt_dt(value: datetime | date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M WIB")
    return value.strftime("%Y-%m-%d")


def _evidence(
    source: str,
    ref: str,
    label: str,
    status: str,
    updated_at: datetime | date | None = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "ref": ref,
        "label": label,
        "status": status,
        "updated_at": _fmt_dt(updated_at),
    }


def _severity_rank(value: str) -> int:
    return {"rendah": 0, "sedang": 1, "tinggi": 2, "kritis": 3}.get(value, 0)


def _strictest(*values: str) -> str:
    return max(values, key=_severity_rank) if values else "rendah"


def complaint_category(message: str) -> str:
    text = normalize_message(message)
    if re.search(r"rusak|pecah|hancur|penyok|bocor|meleleh|basi|berjamur", text):
        return "Barang rusak"
    if re.search(r"kurang\s+(satu|dua|\d+|barang|item|jumlah|isi)|isinya\s+kurang|tidak\s+lengkap|beli\s+\d+\b.*\b(datang|sampai|diterima|dapat|cuma|hanya)\s+\d+", text):
        return "Kurang jumlah"
    if re.search(r"salah\s+(kirim|varian|ukuran|berat|barang|produk|item|rasa|isi)|ukuran\s+salah|berat\s+kurang|kok\s+yang\s+datang|tertukar", text):
        return "Salah varian/berat"
    if re.search(r"telat|lambat|belum\s+(saya\s+)?(diterima|terima|sampai|dikirim|datang|bergerak)|tidak\s+(bergerak|sampai)|resi|nyangkut|macet", text):
        return "Terlambat/pengiriman"
    if re.search(r"refund|retur|pengembalian|uang\s+kembali", text):
        return "Refund/retur"
    if re.search(r"kualitas|listing|tidak\s+sesuai\s+deskripsi", text):
        return "Kualitas/listing"
    return "Lainnya"


def _next_ticket_no(db: Session) -> str:
    prefix = f"CMP-{datetime.now():%Y%m%d}-"
    count = db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.ticket_no.like(prefix + "%"))
    ) or 0
    return f"{prefix}{count + 1:03d}"


def _product_evidence_items(
    db: Session, product: Product, risk_types: list[str], as_of: date
) -> tuple[list[dict[str, Any]], list[str]]:
    items: list[dict[str, Any]] = []
    missing: list[str] = []
    for risk in risk_types:
        rows = evidence_for(db, product.id, risk)
        valid = [row for row in rows if evidence_is_valid(row, as_of)]
        if valid:
            for row in valid:
                items.append(
                    _evidence(
                        "Product Brain > ProductEvidence",
                        f"evidence:{row.id}",
                        f"{RISK_LABEL.get(risk, risk)} — {row.document_no}",
                        "VALID",
                        row.valid_to,
                    )
                )
        else:
            missing.append(RISK_LABEL.get(risk, risk))
            if rows:
                for row in rows:
                    items.append(
                        _evidence(
                            "Product Brain > ProductEvidence",
                            f"evidence:{row.id}",
                            f"{RISK_LABEL.get(risk, risk)} — {row.document_no}",
                            row.status if row.status != "VALID" else "STALE",
                            row.valid_to,
                        )
                    )
            else:
                items.append(
                    _evidence(
                        "Product Brain > ProductEvidence",
                        f"evidence:{product.sku}:{risk}",
                        f"{RISK_LABEL.get(risk, risk)} — belum tersedia",
                        "MISSING",
                        None,
                    )
                )
    return items, missing


def _catalog_evidence(product: Product) -> dict[str, Any]:
    return _evidence(
        "Product Brain > Produk",
        f"product:{product.sku}",
        f"Harga katalog {format_idr(product.price)}",
        "VERIFIED" if product.price is not None else "MISSING",
        # Product rows are stored in UTC; drafts and evidence speak WIB (OPS-003).
        product.updated_at + timedelta(hours=7) if product.updated_at else None,
    )


def _stock_evidence(product: Product, snapshot, as_of: datetime) -> tuple[dict[str, Any], str]:
    if snapshot is None:
        return (
            _evidence(
                "Product Brain > StockSnapshot",
                f"stock:{product.sku}",
                "Stok belum tersedia",
                "MISSING",
                None,
            ),
            "MISSING",
        )
    state = stock_state(snapshot, as_of)
    status = "VERIFIED" if state == "FRESH" else "STALE"
    label = f"Stok snapshot {snapshot.stock} ({state.lower()})"
    return (
        _evidence(
            "Product Brain > StockSnapshot",
            f"stock:{snapshot.id}",
            label,
            status,
            snapshot.captured_at,
        ),
        state,
    )


def _generic_faq_draft(faq) -> str:
    answer = faq.answer.strip()
    return f"Kak, {answer[0].lower() + answer[1:] if answer else ''}"


def _risk_draft(product: Product, risk_types: list[str], missing: list[str]) -> str:
    missing_text = ", ".join(missing)
    return (
        f"Kak, untuk {product.name} saya belum bisa memastikan {missing_text} karena "
        "dokumen pendukung yang valid belum tersedia di data kami. Saya teruskan ke "
        "staf untuk diperiksa ya. Mohon jangan dijadikan dasar klaim sebelum ada bukti."
    )


def _complaint_draft(product: Product | None) -> str:
    item = f" untuk {product.name}" if product else ""
    return (
        f"Mohon maaf atas kendala{product and ' pada ' + product.name or ''}. "
        "Saya bantu catat dan teruskan ke staf. Mohon kirim nomor pesanan serta foto "
        "paket/label dan produk (video unboxing bila ada) melalui chat resmi. "
        "Pengajuan refund/retur mengikuti fitur dan pemeriksaan marketplace; "
        "hasilnya belum bisa dijanjikan sebelum diperiksa."
    )


def _faq_result(db, faq, intent, product, provider, provider_status, jev_result, warnings, normalized, risky_payment) -> ChatResult:
    rules = ops_rules_by_refs(db, faq.ops_refs)
    evidence = [
        _evidence("OperationalRule", rule.code, f"{rule.parameter}: {rule.rule_text}", "VERIFIED", None)
        for rule in rules
    ] + [_evidence("FAQ", faq.code, f"Referensi FAQ: {faq.question}", "VERIFIED", None)]
    extra = list(warnings)
    draft = f"Kak, {faq.answer[0].lower()}{faq.answer[1:]}" if faq.answer else ""
    if risky_payment or faq.code == "FAQ-030":
        extra.append(
            "Penanda risiko: permintaan pembayaran/data di luar marketplace. Jangan berikan "
            "rekening pribadi, OTP, PIN, atau kata sandi (OPS-030, OPS-032)."
        )
        draft = (
            "Kak, demi keamanan pembayaran mohon tetap checkout dan bayar melalui marketplace "
            "ya. Kami tidak menerima transfer langsung ke rekening pribadi dan tidak pernah "
            "meminta OTP, PIN, atau kata sandi."
        )
    return ChatResult(
        intent=intent if intent != "lainnya" else (faq.category or "lainnya").lower(),
        decision=DECISION_DIRECT,
        severity="sedang" if risky_payment else "rendah",
        complaint=False,
        injection=False,
        confidence=0.9,
        provider=provider,
        provider_status=provider_status,
        provider_meta=jev_result.meta,
        sku=product.sku if product else None,
        product_name=product.name if product else None,
        draft=draft,
        evidence=evidence,
        warnings=extra,
        normalized=normalized,
        reason=f"Jawaban baku dari {faq.code} dan aturan terkait.",
    )


def _next_shipping_day(day: date) -> date:
    from datetime import timedelta

    nxt = day + timedelta(days=1)
    while nxt.weekday() == 6:  # no shipping on Sunday (OPS-008)
        nxt += timedelta(days=1)
    return nxt


def analyze(
    db: Session,
    message: str,
    platform: str = "Shopee",
    sku_context: str | None = None,
    conversation_id: str | None = None,
    as_of: datetime | None = None,
    persist: bool = True,
    create_complaint: bool = True,
    actor: str | None = None,
    use_ai: bool = True,
) -> ChatResult:
    started = datetime.now()
    as_of = as_of or now_wib()
    normalized = normalize_message(message)
    warnings: list[str] = []
    evidence: list[dict[str, Any]] = []

    injection, injection_pattern = detect_injection(message)
    local_intent = classify_intent(message)
    local_complaint = is_complaint(message)
    high_risk = detect_high_risk(message)
    severity = severity_for(message)
    qty = extract_qty(message)

    resolved: ResolvedProduct = resolve_product(db, message, sku_context)
    product = resolved.product
    if resolved.unknown_sku:
        warnings.append(f"SKU tidak dikenal: {resolved.unknown_sku}.")
    if resolved.ambiguous:
        warnings.append(
            "Lebih dari satu produk cocok: " + ", ".join(p.name for p in resolved.candidates) + "."
        )

    # --- Jev second opinion (proposal §4.2) --------------------------------
    # Only consulted when the rule engine has NOT already reached the most
    # cautious outcome; Jev may raise caution, never lower it.
    already_cautious = injection or bool(high_risk) or local_complaint
    if use_ai and not already_cautious:
        jev_result = jev.classify(message, platform)
    else:
        jev_result = jev.JevResult(
            ok=False,
            status="skipped" if use_ai and settings.jev_ready else "disabled",
            meta=jev.provider_info(),
        )
    provider = "rule-based+jev" if jev_result.ok else "rule-based"
    provider_status = jev_result.status

    intent = local_intent
    complaint = local_complaint
    jev_escalate_reason: str | None = None
    if jev_result.says_complaint:
        complaint = True
        intent = "keluhan"
        warnings.append("Jev menilai pesan ini keluhan; prioritas dinaikkan.")
    elif jev_result.says_uncertain:
        jev_escalate_reason = "Jev menilai pesan ini perlu diperiksa staf; draf tidak boleh langsung dikirim."
    if jev_result.ok and jev_result.severity:
        severity = _strictest(severity, jev_result.severity)

    # --- Hard gate 1: prompt injection is data, never instruction. ---
    if injection:
        result = ChatResult(
            intent="lainnya",
            decision=DECISION_ESCALATE,
            severity=_strictest(severity, "tinggi"),
            complaint=False,
            injection=True,
            confidence=0.9,
            provider=provider,
            provider_status=provider_status,
            provider_meta={
                **jev_result.meta,
                "injection_pattern": injection_pattern,
                "guard": "prompt_injection",
            },
            sku=sku_context,
            product_name=None,
            draft=(
                "Terima kasih, pesan Anda sudah kami terima. Untuk bantuan pesanan, "
                "mohon kirim nomor pesanan melalui chat resmi. Tim CS akan memeriksa."
            ),
            evidence=[],
            warnings=[
                "Pesan berisi instruksi yang tidak boleh mengubah kebijakan sistem. "
                "Tidak ada fakta produk yang dipakai dari pesan ini."
            ],
            normalized=normalized,
            reason="Prompt injection terdeteksi; pesan diperlakukan sebagai data tidak tepercaya.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Hard gate 2: high-risk claims require valid, linked evidence. ---
    if high_risk:
        if product is None:
            if resolved.ambiguous:
                draft = (
                    "Kak, ada beberapa produk yang cocok dengan pesan ini. Mohon sebutkan "
                    "SKU atau varian yang dimaksud agar saya tidak salah menyebut dokumen."
                )
                decision = DECISION_ESCALATE
                severity = _strictest(severity, "tinggi")
            else:
                draft = (
                    "Kak, mohon sebutkan produk/varian yang diminta agar saya bisa memeriksa "
                    "dokumen halal/izin edar/kedaluwarsa yang tepat. Saya tidak bisa memastikan "
                    "klaim tanpa dokumen yang terkait."
                )
                decision = DECISION_ESCALATE
                severity = _strictest(severity, "tinggi")
            result = ChatResult(
                intent="klaim_berisiko",
                decision=decision,
                severity=severity,
                complaint=complaint,
                injection=False,
                confidence=0.8,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                draft=draft,
                evidence=[],
                warnings=warnings
                + ["Produk belum teridentifikasi; tidak ada klaim berisiko yang dijawab."],
                normalized=normalized,
                reason="Klaim berisiko tanpa produk yang jelas.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        items, missing = _product_evidence_items(db, product, high_risk, as_of.date())
        evidence.extend(items)
        evidence.append(_catalog_evidence(product))
        if missing:
            result = ChatResult(
                intent="klaim_berisiko",
                decision=DECISION_ESCALATE,
                severity=_strictest(severity, "tinggi"),
                complaint=complaint,
                injection=False,
                confidence=0.9,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                sku=product.sku,
                product_name=product.name,
                draft=_risk_draft(product, high_risk, missing),
                evidence=evidence,
                warnings=warnings
                + [f"Bukti tidak valid/tidak tersedia: {', '.join(missing)}. Sistem abstain."],
                normalized=normalized,
                reason="Klaim berisiko tinggi tanpa bukti valid yang terkait SKU.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        if complaint:
            result = ChatResult(
                intent="keluhan",
                decision=DECISION_ESCALATE,
                severity=_strictest(severity, "tinggi"),
                complaint=True,
                injection=False,
                confidence=0.85,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                sku=product.sku,
                product_name=product.name,
                draft=_complaint_draft(product),
                evidence=evidence,
                warnings=warnings,
                normalized=normalized,
                reason="Keluhan dengan klaim berisiko; dokumen valid tetapi keluhan tetap dieskalasi.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        labels = ", ".join(RISK_LABEL.get(risk, risk) for risk in high_risk)
        result = ChatResult(
            intent="klaim_berisiko",
            decision=DECISION_ESCALATE,
            severity=_strictest(severity, "sedang"),
            complaint=False,
            injection=False,
            confidence=0.85,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku,
            product_name=product.name,
            draft=(
                f"Kak, untuk informasi {labels} {product.name} kami cek dulu ke label "
                "kemasan di gudang agar jawabannya akurat. Mohon ditunggu sebentar ya."
            ),
            evidence=evidence,
            warnings=warnings
            + [
                "Belum pasti: jangan menyimpulkan halal, alergen, atau kedaluwarsa dari nama "
                "produk (OPS-024, OPS-025). Checklist: minta foto label ke gudang, cocokkan "
                "dokumen tercatat, baru jawab."
            ],
            normalized=normalized,
            reason="Klaim berisiko: wajib cek label/dokumen oleh staf sebelum menjawab.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Hard gate 3: complaints always escalate regardless of classifier hints. ---
    if complaint:
        if product:
            evidence.append(_catalog_evidence(product))
            snapshot = latest_stock(db, product.id)
            stock_item, _ = _stock_evidence(product, snapshot, as_of)
            evidence.append(stock_item)
        order_ref = extract_order_ref(message)
        complaint_text = _complaint_draft(product)
        if re.search(r"belum\s+(di)?kirim|kapan\s+(di)?kirim|kenapa\s+belum", normalized):
            complaint_text += (
                " Sebagai info, pembayaran setelah batas jam (Senin–Jumat 14.00, Sabtu 12.00 WIB) "
                "dan hari Minggu masuk antrean hari kirim berikutnya (OPS-011)."
            )
            evidence.append(_evidence("OperationalRule", "OPS-011", "Lewat batas waktu: antrean hari kirim berikutnya", "VERIFIED", None))
        evidence.append(_evidence("OperationalRule", "OPS-019", "Catat nomor pesanan, ringkasan, dan bukti; teruskan ke admin", "VERIFIED", None))
        if not order_ref:
            warnings.append("Nomor pesanan belum ada di pesan; minta ke pembeli (OPS-019).")
        ticket_no = None
        if create_complaint:
            ticket_no = _create_complaint(
                db,
                message=message,
                platform=platform,
                conversation_id=conversation_id,
                product=product,
                severity=_strictest(severity, "tinggi"),
                category=complaint_category(message),
                order_ref=order_ref,
            )
        result = ChatResult(
            intent="keluhan",
            decision=DECISION_ESCALATE,
            severity=_strictest(severity, "tinggi"),
            complaint=True,
            injection=False,
            confidence=0.9,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku if product else None,
            product_name=product.name if product else None,
            draft=complaint_text,
            evidence=evidence,
            warnings=warnings,
            complaint_ticket=ticket_no,
            order_ref=order_ref,
            normalized=normalized,
            reason="Keluhan terdeteksi; wajib ditangani manusia, bukan jawaban generik.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Gate 4: requests that need a staff check ("belum pasti"). ---
    check = staff_check(message, qty)
    if check:
        ev = [_evidence("OperationalRule", check["ops"], check["reason"], "VERIFIED", None)] if check["ops"] else []
        if product:
            ev.append(_catalog_evidence(product))
            snapshot = latest_stock(db, product.id)
            stock_item, _ = _stock_evidence(product, snapshot, as_of)
            ev.append(stock_item)
            if qty and snapshot and snapshot.stock < qty:
                warnings.append(f"Permintaan {qty} melebihi stok snapshot {snapshot.stock}.")
        result = ChatResult(
            intent=intent if intent != "lainnya" else "pesanan",
            decision=DECISION_ESCALATE,
            severity=_strictest(severity, "sedang"),
            complaint=False,
            injection=False,
            confidence=0.8,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku if product else None,
            product_name=product.name if product else None,
            draft=(
                "Baik Kak, permintaan ini perlu kami cek dulu ke admin/gudang supaya "
                "informasinya tepat. Kami kabari secepatnya ya."
            ),
            evidence=ev,
            warnings=warnings + [f"Belum pasti: {check['reason']}"],
            normalized=normalized,
            reason="Perlu pemeriksaan staf sebelum dijawab.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Fixed-answer FAQ (Jalur A topics), unless it is a cut-off question. ---
    risky_payment = is_risky_payment(message)
    has_shipping = bool(re.search(SHIPPING_WORDS, normalized))
    asks_stock = intent == "stok" or any(re.search(p, normalized) for p in STOCK_PATTERNS)
    asks_price = intent == "harga" or (
        bool(re.search(r"\bharga(nya)?\b|\brp\s*\d|\btotal\b|\bberapa\b", normalized))
        and not has_shipping
    )
    fixed_code = next((code for pattern, code in FIXED_FAQ if re.search(pattern, normalized)), None)
    product_question = product is not None and (asks_stock or asks_price)
    if fixed_code and not product_question and not (
        fixed_code not in {"FAQ-030", "FAQ-027", "FAQ-028"}
        and has_shipping
        and re.search(CUTOFF_QUESTION, normalized)
    ):
        faq = db.scalar(select(Faq).where(Faq.code == fixed_code))
        if faq is not None:
            return _finish(
                db,
                _faq_result(db, faq, intent, product, provider, provider_status, jev_result, warnings, normalized, risky_payment),
                message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason,
            )

    # --- Product-dependent answers. ---
    if product is None and not resolved.ambiguous and has_shipping and (asks_stock or asks_price):
        intent = "pengiriman"  # e.g. "Ready kirim hari ini kak?" without a product
        asks_stock = asks_price = False

    if intent in {"stok", "harga"} or (asks_stock or asks_price):
        if resolved.ambiguous:
            names = "; ".join(f"{p.name} ({p.sku})" for p in resolved.candidates[:5])
            result = ChatResult(
                intent="stok" if asks_stock else "harga",
                decision=DECISION_ESCALATE,
                severity=_strictest(severity, "sedang"),
                complaint=False,
                injection=False,
                confidence=0.6,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                draft=(
                    "Kak, ada beberapa produk/varian yang cocok dengan pesan ini: "
                    f"{names}. Mohon pilih SKU/varian yang dimaksud agar stok dan harga "
                    "tidak tertukar."
                ),
                evidence=[],
                warnings=warnings + ["Multi-kandidat produk; sistem tidak memilih diam-diam."],
                normalized=normalized,
                reason="Produk ambigu; perlu klarifikasi.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        if product is None:
            result = ChatResult(
                intent="stok" if asks_stock else "harga",
                decision=DECISION_LIMITED,
                severity="rendah",
                complaint=False,
                injection=False,
                confidence=0.55,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                draft=(
                    "Kak, mohon sebutkan nama produk/varian atau SKU yang dimaksud. "
                    "Saya perlu memastikan produknya agar tidak menjawab stok/harga "
                    "untuk varian yang salah."
                ),
                evidence=[],
                warnings=warnings + ["Produk tidak teridentifikasi dari pesan."],
                normalized=normalized,
                reason="Produk belum jelas; jawaban dibatasi.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        snapshot = latest_stock(db, product.id)
        stock_item, state = _stock_evidence(product, snapshot, as_of)
        evidence.append(_catalog_evidence(product))
        evidence.append(stock_item)

        if asks_stock and state == "MISSING":
            result = ChatResult(
                intent="stok",
                decision=DECISION_LIMITED,
                severity="rendah",
                complaint=False,
                injection=False,
                confidence=0.8,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                sku=product.sku,
                product_name=product.name,
                draft=(
                    f"Kak, data stok {product.name} belum tersedia di sistem kami. "
                    "Saya tidak bisa menyatakan ready. Staf akan memeriksa stok fisik "
                    "terlebih dahulu ya."
                ),
                evidence=evidence,
                warnings=warnings + ["Stok tidak tersedia; jangan menyimpulkan ready."],
                normalized=normalized,
                reason="Snapshot stok tidak tersedia (bukan nol).",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        if asks_stock and state == "STALE":
            age = stock_age_hours(snapshot, as_of) if snapshot else None
            result = ChatResult(
                intent="stok",
                decision=DECISION_LIMITED,
                severity="rendah",
                complaint=False,
                injection=False,
                confidence=0.75,
                provider=provider,
                provider_status=provider_status,
                provider_meta=jev_result.meta,
                sku=product.sku,
                product_name=product.name,
                draft=(
                    f"Kak, snapshot stok {product.name} terakhir diperbarui "
                    f"{age:.0f} jam lalu dan sudah melewati batas kesegaran "
                    f"{settings.stock_freshness_hours} jam. Saya perlu konfirmasi staf "
                    "sebelum menyatakan ready."
                ),
                evidence=evidence,
                warnings=warnings + ["Stok stale; jangan menyatakan ready."],
                normalized=normalized,
                reason="Stok melewati batas kesegaran.",
            )
            return _finish(
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
            )

        parts: list[str] = []
        if asks_stock:
            if snapshot and snapshot.stock == 0:
                parts.append(
                    f"Stok {product.name} pada snapshot terakhir 0, jadi belum tersedia, Kak. "
                    "Tanggal restock belum ditetapkan dan kami tidak menerima pre-order."
                )
            else:
                parts.append(
                    f"{product.name} tersedia {snapshot.stock} {product.unit} pada snapshot "
                    f"{_fmt_dt(snapshot.captured_at)}."
                )
        if asks_price and product.price is not None:
            if qty and qty > 1:
                total = product.price * Decimal(qty)
                parts.append(
                    f"Harga satuan {format_idr(product.price)}; total {qty} unit "
                    f"{format_idr(total)} sebelum promo dan ongkir."
                )
            else:
                parts.append(f"Harga satuannya {format_idr(product.price)}.")
        elif asks_price and product.price is None:
            parts.append("Harga produk ini belum tersedia di data kami.")
            warnings.append("Harga tidak tersedia; jangan menebak nominal.")

        if has_shipping:
            if re.search(r"ongkir|ongkos|biaya\s+kirim", normalized):
                parts.append(
                    "Untuk ongkir, nominalnya mengikuti alamat, berat, dan kurir yang tampil saat "
                    "checkout (OPS-027)."
                )
            else:
                ctx_two = shipping_context(db, as_of)
                if ctx_two["is_sunday"]:
                    parts.append("Hari Minggu tidak ada pengiriman; pesanan masuk antrean Senin (OPS-008).")
                elif ctx_two["before_cutoff"]:
                    parts.append(
                        f"Bayar terverifikasi sebelum {ctx_two['cutoff_text']} WIB bisa masuk antrean "
                        "kirim hari ini, tidak dijamin (OPS-012)."
                    )
                else:
                    parts.append(
                        f"Batas bayar hari ini ({ctx_two['cutoff_text']} WIB) sudah lewat; masuk antrean "
                        "hari kirim berikutnya (OPS-011)."
                    )
        if snapshot and snapshot.stock == 0 and asks_price and not asks_stock:
            parts.append(
                "Meski harga tersedia, stok snapshot terakhir 0 sehingga belum bisa dipesan."
            )

        result = ChatResult(
            intent="stok" if asks_stock else "harga",
            decision=DECISION_DIRECT if product.price is not None or not asks_price else DECISION_LIMITED,
            severity="rendah",
            complaint=False,
            injection=False,
            confidence=0.95,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku,
            product_name=product.name,
            draft=" ".join(parts),
            evidence=evidence,
            warnings=warnings,
            normalized=normalized,
            reason="Fakta katalog dan snapshot stok segar tersedia.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Shipping / cut-off answers. ---
    if intent == "pengiriman":
        ctx = shipping_context(db, as_of)
        rule = ctx["rule"]
        capacity = ctx["capacity"]
        evidence.append(
            _evidence(
                "Product Brain > ShippingRule",
                "shipping:default",
                f"Cut-off {ctx['cutoff_text'] or 'belum tersedia'} WIB",
                "VERIFIED" if rule else "MISSING",
                rule.effective_from if rule else None,
            )
        )
        if capacity:
            remaining = capacity_remaining(capacity)
            evidence.append(
                _evidence(
                    "Product Brain > CapacityDay",
                    f"capacity:{capacity.day}",
                    f"Kapasitas {capacity.used}/{capacity.capacity}, sisa {remaining}",
                    "VERIFIED" if not capacity.is_closed else "STALE",
                    capacity.day,
                )
            )
        else:
            evidence.append(
                _evidence(
                    "Product Brain > CapacityDay",
                    f"capacity:{ctx['day']}",
                    "Backlog belum diinput; acuan kapasitas 700/hari (OPS-016)",
                    "UNVERIFIED",
                    None,
                )
            )

        if product:
            evidence.append(_catalog_evidence(product))
            snapshot = latest_stock(db, product.id)
            stock_item, state = _stock_evidence(product, snapshot, as_of)
            evidence.append(stock_item)
            if state != "FRESH" or (snapshot and snapshot.stock == 0):
                warnings.append("Stok produk belum dapat dipastikan/tersedia untuk pengiriman hari ini.")

        next_day = _next_shipping_day(as_of.date())
        next_name = WEEKDAY_ID[next_day.weekday()]
        if ctx["is_sunday"] or (capacity and capacity.is_closed):
            draft = (
                "Hari ini (Minggu/libur) tidak ada pengiriman dan CS tidak aktif. Pesanan yang "
                f"dibayar hari ini masuk antrean {next_name}, {next_day.strftime('%d/%m')}, jika "
                "pembayaran terverifikasi dan kapasitas tersedia. Tanggal tiba mengikuti kurir di checkout."
            )
        elif ctx["before_cutoff"]:
            minutes_left = None
            if ctx.get("cutoff_time") is not None:
                minutes_left = int((ctx["cutoff_time"] - as_of).total_seconds() // 60)
            urgency = (
                f" Batas tinggal sekitar {minutes_left} menit lagi."
                if minutes_left is not None and minutes_left <= 60
                else ""
            )
            draft = (
                f"Pembayaran terverifikasi paling lambat {ctx['cutoff_text']} WIB hari ini dapat masuk "
                f"antrean kirim hari ini.{urgency} Syaratnya stok tersedia, kapasitas packing cukup, dan "
                "pickup kurir berhasil, jadi kirim hari yang sama tidak dijamin (OPS-012)."
            )
        else:
            draft = (
                f"Batas pembayaran untuk kirim hari ini ({ctx['cutoff_text']} WIB) sudah lewat, Kak. "
                f"Pesanan masuk antrean {next_name}, {next_day.strftime('%d/%m')}, dengan syarat "
                "pembayaran terverifikasi dan kapasitas tersedia (OPS-011)."
            )
        if capacity is None:
            warnings.append(
                "Backlog packing hari ini belum diinput; kapasitas memakai acuan 700/hari (OPS-016)."
            )

        decision = DECISION_DIRECT
        result = ChatResult(
            intent="pengiriman",
            decision=decision,
            severity="rendah" if decision == DECISION_DIRECT else "sedang",
            complaint=False,
            injection=False,
            confidence=0.7 if decision == DECISION_LIMITED else 0.85,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku if product else None,
            product_name=product.name if product else None,
            draft=draft,
            evidence=evidence,
            warnings=warnings,
            normalized=normalized,
            reason="Jawaban pengiriman memakai cut-off, jadwal, dan kapasitas yang tersedia.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- Specific order requests need human lookup. ---
    if intent == "pesanan" and re.search(
        r"pesanan\s+saya|status\s+pesanan|cek\s+pesanan",
        normalized,
    ):
        result = ChatResult(
            intent="pesanan",
            decision=DECISION_ESCALATE,
            severity=_strictest(severity, "sedang"),
            complaint=False,
            injection=False,
            confidence=0.75,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            draft=(
                "Kak, untuk permintaan terkait pesanan tertentu saya perlu nomor pesanan "
                "agar staf dapat memeriksa status dan opsi yang tersedia. Perubahan atau "
                "pembatalan tidak otomatis disetujui dan mengikuti ketentuan marketplace."
            ),
            evidence=[
                _evidence(
                    "OperationalRule",
                    "OPS-028",
                    "Perubahan/pembatalan perlu pemeriksaan tahap packing",
                    "VERIFIED",
                    None,
                )
            ],
            warnings=warnings,
            normalized=normalized,
            reason="Permintaan spesifik pesanan membutuhkan pencarian oleh staf.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    # --- FAQ retrieval for remaining general questions. ---
    faqs = faq_matches(db, message, limit=2)
    if faqs:
        faq = faqs[0]
        rules = ops_rules_by_refs(db, faq.ops_refs)
        for rule in rules:
            evidence.append(
                _evidence(
                    "OperationalRule",
                    rule.code,
                    f"{rule.parameter}: {rule.rule_text}",
                    "VERIFIED",
                    None,
                )
            )
        result = ChatResult(
            intent=intent,
            decision=DECISION_LIMITED if rules else DECISION_LIMITED,
            severity="rendah",
            complaint=False,
            injection=False,
            confidence=0.6,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku if product else None,
            product_name=product.name if product else None,
            draft=_generic_faq_draft(faq),
            evidence=evidence
            + [
                _evidence(
                    "FAQ",
                    faq.code,
                    f"Referensi FAQ: {faq.question}",
                    "VERIFIED" if rules else "UNVERIFIED",
                    None,
                )
            ],
            warnings=warnings
            + ["Jawaban umum dari FAQ; periksa konteks pesanan sebelum dikirim."],
            normalized=normalized,
            reason="FAQ dan aturan operasional cocok; jawaban tetap dibatasi.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
        )

    result = ChatResult(
        intent=intent,
        decision=DECISION_LIMITED,
        severity=_strictest(severity, "sedang"),
        complaint=False,
        injection=False,
        confidence=0.45,
        provider=provider,
        provider_status=provider_status,
        provider_meta=jev_result.meta,
        sku=product.sku if product else None,
        product_name=product.name if product else None,
        draft=(
            "Kak, pesan ini belum bisa saya jawab dari data yang tersedia. Saya teruskan "
            "ke staf CS untuk diperiksa agar tidak memberi informasi yang keliru."
        ),
        evidence=[],
        warnings=warnings + ["Tidak ada sumber yang cukup; jawaban tidak dibuat."],
        normalized=normalized,
        reason="Tidak ada fakta/FAQ yang cukup; jawaban dibatasi.",
    )
    return _finish(
        db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started, jev_escalate_reason
    )


def _create_complaint(
    db: Session,
    message: str,
    platform: str,
    conversation_id: str | None,
    product: Product | None,
    severity: str,
    category: str,
    order_ref: str | None = None,
) -> str:
    ticket_no = _next_ticket_no(db)
    complaint = Complaint(
        ticket_no=ticket_no,
        conversation_id=conversation_id,
        customer_id=None,
        platform=platform,
        sku=product.sku if product else None,
        category=category,
        severity=severity,
        status="BARU",
        summary=mask_pii(message.strip())[:500],
        estimated_cost=product.price if product and product.price is not None else None,
        confirmed_cost=None,
        source="chat",
        notes=(
            "Dibuat otomatis dari analisis chat. Estimasi bukan biaya aktual."
            + (f" No. pesanan/resi: {order_ref}." if order_ref else " No. pesanan belum ada.")
        ),
    )
    db.add(complaint)
    db.flush()
    db.add(
        AuditLog(
            actor="system",
            action="complaint.create",
            entity="complaint",
            entity_id=ticket_no,
            detail_json={"category": category, "severity": severity, "source": "chat"},
        )
    )
    return ticket_no


HOLDING_REPLY = (
    "Terima kasih Kak, pesannya sudah kami terima. Kami cek dulu ke tim terkait "
    "dan kabari secepatnya ya."
)
ORDER_NO_REPLY = (
    "Mohon maaf atas kendalanya, Kak. Boleh dibantu kirim nomor pesanan serta foto/"
    "video kondisi paket saat dibuka? Data ini kami teruskan ke admin untuk dicek."
)


def _alternative_drafts(result: ChatResult) -> list[str]:
    """Three drafts for Mode Antrean shortcuts 1-3. Draft 1 is always the main one."""
    options = [result.draft]
    if result.complaint:
        options.append(ORDER_NO_REPLY)
    options.append(HOLDING_REPLY)
    if not result.complaint and result.decision != DECISION_DIRECT:
        options.append(
            "Baik Kak, untuk memastikan informasinya akurat kami cek dulu ke staf ya. "
            "Mohon ditunggu sebentar."
        )
    seen: list[str] = []
    for text in options:
        if text and text not in seen:
            seen.append(text)
    return seen[:3]


def _derive_message_class(result: ChatResult) -> str:
    if result.complaint:
        return "COMPLAINT"
    if result.injection:
        return "UNCERTAIN_INFORMATION"
    if result.decision == DECISION_ESCALATE:
        return "UNCERTAIN_INFORMATION"
    if result.decision == DECISION_LIMITED:
        if not result.evidence:
            return "UNCERTAIN_INFORMATION"
        if any(item.get("status") in {"MISSING", "STALE", "INVALID"} for item in result.evidence):
            return "UNCERTAIN_INFORMATION"
    return "GENERAL_QUESTION"


def _apply_jev_raise(result: ChatResult, reason: str | None) -> None:
    """Upgrade (never downgrade) a rule result when Jev asks for a human."""
    if not reason or result.decision == DECISION_ESCALATE:
        return
    result.decision = DECISION_ESCALATE
    result.severity = _strictest(result.severity, "sedang")
    result.warnings = list(result.warnings) + [reason]
    result.reason = f"{result.reason} {reason}".strip()


def _finish(
    db: Session,
    result: ChatResult,
    original: str,
    platform: str,
    sku_context: str | None,
    conversation_id: str | None,
    persist: bool,
    create_complaint: bool,
    actor: str | None,
    started: datetime,
    jev_escalate_reason: str | None = None,
) -> ChatResult:
    _apply_jev_raise(result, jev_escalate_reason)
    result.alternatives = _alternative_drafts(result)
    result.latency_ms = int((datetime.now() - started).total_seconds() * 1000)
    result.message_class = _derive_message_class(result)
    result.intents = detect_intents(original)
    if result.intent not in result.intents:
        result.intents.insert(0, result.intent)
    if not persist:
        return result
    analysis = ChatAnalysis(
        conversation_id=conversation_id,
        platform=platform,
        message=mask_pii(original),
        normalized=mask_pii(result.normalized),
        sku=result.sku or sku_context,
        message_class=result.message_class,
        intent=result.intent,
        intents_json=result.intents,
        decision=result.decision,
        severity=result.severity,
        complaint_flag=result.complaint,
        injection_flag=result.injection,
        confidence=Decimal(str(result.confidence)).quantize(Decimal("0.0001")),
        provider=result.provider,
        provider_meta_json={**result.provider_meta, "provider_status": result.provider_status},
        draft=result.draft,
        evidence_json=result.evidence,
        raw_json={
            "reason": result.reason,
            "warnings": result.warnings,
            "latency_ms": result.latency_ms,
            "adapter_verified": result.provider_meta.get("adapter_verified", False),
        },
        created_by=actor,
    )
    db.add(analysis)
    db.flush()
    result.analysis_id = analysis.id
    db.add(
        AuditLog(
            actor=actor or "system",
            action="chat.analyze",
            entity="chat_analysis",
            entity_id=str(analysis.id),
            detail_json={
                "message_class": result.message_class,
                "intent": result.intent,
                "decision": result.decision,
                "severity": result.severity,
                "injection": result.injection,
                "provider": result.provider,
            },
        )
    )
    db.commit()
    return result
