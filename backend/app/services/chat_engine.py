"""Deterministic Chat Copilot orchestrator with a hard policy gate."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AuditLog, ChatAnalysis, Complaint, Product
from ..policy import (
    classify_intent,
    detect_high_risk,
    detect_injection,
    detect_intents,
    extract_qty,
    format_idr,
    is_complaint,
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
}


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
    if re.search(r"rusak|pecah|hancur|penyok|bocor|meleleh", text):
        return "Barang rusak"
    if re.search(r"kurang\s+(satu|barang|item|jumlah)|tidak\s+lengkap", text):
        return "Kurang jumlah"
    if re.search(r"salah\s+(kirim|varian|ukuran|berat)|ukuran\s+salah|berat\s+kurang", text):
        return "Salah varian/berat"
    if re.search(r"telat|lambat|belum\s+diterima|belum\s+sampai|resi", text):
        return "Terlambat"
    if re.search(r"refund|retur|pengembalian|batal", text):
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
        product.updated_at,
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
) -> ChatResult:
    started = datetime.now()
    as_of = as_of or datetime.now()
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

    jev_result = jev.classify(message, platform)
    provider = "rule-based"
    provider_status = jev_result.status
    if jev_result.ok:
        provider = "rule-based+jev"

    intent = local_intent
    complaint = local_complaint
    if jev_result.ok and not injection and not high_risk and not local_complaint:
        if jev_result.intent:
            intent = jev_result.intent
        if jev_result.complaint:
            complaint = True
            intent = "keluhan"
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
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
            )

        labels = ", ".join(RISK_LABEL.get(risk, risk) for risk in high_risk)
        valid_until = ", ".join(
            item["updated_at"] for item in items if item["status"] == "VALID" and item["updated_at"]
        )
        result = ChatResult(
            intent="klaim_berisiko",
            decision=DECISION_LIMITED,
            severity=_strictest(severity, "sedang"),
            complaint=False,
            injection=False,
            confidence=0.8,
            provider=provider,
            provider_status=provider_status,
            provider_meta=jev_result.meta,
            sku=product.sku,
            product_name=product.name,
            draft=(
                f"Kak, untuk {product.name} kami memiliki dokumen demo {labels}"
                + (f" yang tercatat valid sampai {valid_until}" if valid_until else "")
                + ". Dokumen ini adalah data simulasi. Mohon periksa label fisik sebelum "
                "menyampaikan klaim final."
            ),
            evidence=evidence,
            warnings=warnings
            + ["Dokumen demo bersifat simulasi; jangan diklaim sebagai sertifikat nyata."],
            normalized=normalized,
            reason="Dokumen demo valid tersedia; jawaban dibatasi dan wajib diperiksa staf.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
        )

    # --- Hard gate 3: complaints always escalate regardless of classifier hints. ---
    if complaint:
        if product:
            evidence.append(_catalog_evidence(product))
            snapshot = latest_stock(db, product.id)
            stock_item, _ = _stock_evidence(product, snapshot, as_of)
            evidence.append(stock_item)
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
            draft=_complaint_draft(product),
            evidence=evidence,
            warnings=warnings,
            complaint_ticket=ticket_no,
            normalized=normalized,
            reason="Keluhan terdeteksi; wajib ditangani manusia, bukan jawaban generik.",
        )
        return _finish(
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
        )

    # --- Product-dependent answers. ---
    asks_price = intent == "harga" or bool(
        re.search(r"\bharga\b|\brp\s*\d|\bberapa\b", normalized)
    )
    asks_stock = intent == "stok" or bool(
        re.search(r"\b(ready|tersedia|stok|kosong|restock)\b|masih\s+ada", normalized)
    )

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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
                    "Data kapasitas belum tersedia",
                    "MISSING",
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

        if ctx["is_sunday"] or (capacity and capacity.is_closed):
            draft = (
                "Hari ini tidak ada pengiriman/CS aktif sesuai jadwal toko. Pesanan akan "
                "masuk antrean hari pengiriman berikutnya, dengan syarat pembayaran "
                "terverifikasi dan kapasitas tersedia. Tanggal tiba tetap mengikuti kurir "
                "di checkout."
            )
        elif capacity is None:
            draft = (
                "Data kapasitas packing hari ini belum tersedia, jadi saya belum bisa "
                "memastikan pengiriman hari ini. Saya perlu konfirmasi staf. Cut-off "
                f"pembayaran {ctx['cutoff_text'] or 'mengikuti aturan toko'} WIB."
            )
        elif ctx["before_cutoff"]:
            draft = (
                f"Pembayaran terverifikasi paling lambat {ctx['cutoff_text']} WIB dapat masuk "
                "antrean kirim hari ini, dengan syarat stok tersedia, antrean dan kapasitas "
                "cukup, serta pickup kurir berhasil. Kirim hari yang sama tidak dijamin."
            )
        else:
            draft = (
                f"Batas pembayaran untuk antrean hari ini ({ctx['cutoff_text']} WIB) sudah "
                "lewat. Pesanan masuk antrean hari pengiriman berikutnya, dengan syarat "
                "pembayaran terverifikasi dan kapasitas tersedia."
            )

        decision = DECISION_LIMITED if capacity is None else DECISION_DIRECT
        if capacity and capacity.is_closed:
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
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
        )

    # --- Specific order requests need human lookup. ---
    if intent == "pesanan" and re.search(
        r"invoice|faktur|pesanan\s+saya|ganti\s+alamat|ubah\s+alamat|batal|refund|retur",
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
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
            db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
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
        db, result, message, platform, sku_context, conversation_id, persist, create_complaint, actor, started
    )


def _create_complaint(
    db: Session,
    message: str,
    platform: str,
    conversation_id: str | None,
    product: Product | None,
    severity: str,
    category: str,
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
        summary=message.strip()[:500],
        estimated_cost=product.price if product and product.price is not None else None,
        confirmed_cost=None,
        source="chat",
        notes="Dibuat otomatis dari analisis chat. Estimasi bukan biaya aktual.",
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
) -> ChatResult:
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
        message=original,
        normalized=result.normalized,
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
