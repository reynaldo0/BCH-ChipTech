"""Product Brain helpers: product resolution, stock freshness, evidence, rules."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    CapacityDay,
    Faq,
    FeeRule,
    OperationalRule,
    Product,
    ProductEvidence,
    ShippingRule,
    StockSnapshot,
)
from ..policy import normalize_message

CATEGORY_PREFIX = {
    "KRM": "Kurma",
    "KCG": "Kacang",
    "SWK": "Siwak",
    "CKL": "Cokelat",
    "KMS": "Kismis",
    "TIN": "Buah Tin",
}

UNIT_WORDS = ("kemasan", "paket", "batang", "box", "dus")

STOPWORDS = {
    "yang", "untuk", "saya", "kak", "min", "admin", "ready", "stok",
    "harga", "berapa", "ada", "masih", "tersedia", "dengan", "atau",
    "dan", "ini", "itu", "bisa", "mau", "ambil", "pesan", "beli",
}


def derive_category(sku: str, name: str) -> str:
    prefix = sku.split("-", 1)[0].upper()
    return CATEGORY_PREFIX.get(prefix, "Lainnya")


def derive_variant(name: str) -> str | None:
    match = re.search(r"(\d+\s*(?:g|kg|gram|kilogram|batang))", name, flags=re.IGNORECASE)
    return match.group(1).replace(" ", " ") if match else None


def derive_unit(name: str) -> str:
    lower = name.lower()
    for unit in UNIT_WORDS:
        if unit in lower:
            return unit
    return "kemasan"


@dataclass
class ResolvedProduct:
    product: Product | None
    candidates: list[Product]
    unknown_sku: str | None = None

    @property
    def ambiguous(self) -> bool:
        return len(self.candidates) > 1


def get_product(db: Session, sku: str | None) -> Product | None:
    if not sku:
        return None
    return db.scalar(select(Product).where(Product.sku == sku))


def list_products(db: Session, active_only: bool = False) -> list[Product]:
    stmt = select(Product).order_by(Product.name)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    return list(db.scalars(stmt))


def _name_tokens(name: str) -> list[str]:
    text = normalize_message(name)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = [t for t in text.split() if t and t not in STOPWORDS]
    sizes = re.findall(r"\b\d+\b|\bkg\b|\bg\b|\bbatang\b", text)
    return list(dict.fromkeys(tokens + sizes))


def _token_weight(token: str) -> int:
    """Size numbers are the strongest disambiguator between product variants."""
    if token.isdigit():
        return 4
    if token in {"kg", "g", "batang"}:
        return 2
    return 1


def resolve_product(
    db: Session,
    message: str,
    sku_context: str | None = None,
    known_skus: Iterable[str] | None = None,
) -> ResolvedProduct:
    """Resolve a product without silently guessing when multiple candidates match."""
    from ..policy import extract_sku_token

    if sku_context:
        product = get_product(db, sku_context)
        if product:
            return ResolvedProduct(product=product, candidates=[product])
        return ResolvedProduct(product=None, candidates=[], unknown_sku=sku_context)

    skus = list(known_skus) if known_skus is not None else [p.sku for p in list_products(db)]
    token = extract_sku_token(message, skus)
    if token:
        product = get_product(db, token)
        if product:
            return ResolvedProduct(product=product, candidates=[product])

    normalized = normalize_message(message)
    scored: list[tuple[int, int, Product]] = []
    for product in list_products(db, active_only=True):
        tokens = _name_tokens(product.name)
        if not tokens:
            continue
        hits = 0
        score = 0
        for token in tokens:
            if re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", normalized):
                hits += 1
                score += _token_weight(token)
        if hits == 0:
            continue
        # A matching size/number token is decisive; otherwise require most of the name.
        has_size_token = any(token.isdigit() or token in {"kg", "g", "batang"} for token in tokens)
        size_matched = any(
            (token.isdigit() or token in {"kg", "g", "batang"})
            and re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", normalized)
            for token in tokens
        )
        if has_size_token and not size_matched:
            # Avoid matching "Kurma Ajwa 250" when the customer explicitly asked for 500.
            if re.search(r"\b\d+\b", normalized):
                continue
        if hits >= max(2, len(tokens) - 1) or (hits >= 2 and size_matched):
            scored.append((score, hits, product))

    if not scored:
        return ResolvedProduct(product=None, candidates=[])

    scored.sort(key=lambda item: (-item[0], -item[1], item[2].name))
    best_score = scored[0][0]
    candidates = [p for score, _hits, p in scored if score == best_score]
    if len(candidates) == 1:
        return ResolvedProduct(product=candidates[0], candidates=candidates)
    return ResolvedProduct(product=None, candidates=candidates)


def latest_stock(db: Session, product_id: int) -> StockSnapshot | None:
    return db.scalar(
        select(StockSnapshot)
        .where(StockSnapshot.product_id == product_id)
        .order_by(StockSnapshot.captured_at.desc(), StockSnapshot.id.desc())
    )


def stock_age_hours(snapshot: StockSnapshot, as_of: datetime | None = None) -> float:
    reference = as_of or datetime.now()
    delta = reference - snapshot.captured_at
    return max(0.0, delta.total_seconds() / 3600.0)


def stock_state(snapshot: StockSnapshot | None, as_of: datetime | None = None) -> str:
    if snapshot is None:
        return "MISSING"
    if stock_age_hours(snapshot, as_of) > settings.stock_freshness_hours:
        return "STALE"
    return "FRESH"


def evidence_is_valid(evidence: ProductEvidence, as_of: date | None = None) -> bool:
    today = as_of or date.today()
    if evidence.status != "VALID":
        return False
    if evidence.valid_from and evidence.valid_from > today:
        return False
    if evidence.valid_to and evidence.valid_to < today:
        return False
    return True


def valid_evidence_for(
    db: Session, product_id: int, evidence_type: str, as_of: date | None = None
) -> list[ProductEvidence]:
    rows = db.scalars(
        select(ProductEvidence)
        .where(
            ProductEvidence.product_id == product_id,
            ProductEvidence.evidence_type == evidence_type,
        )
        .order_by(ProductEvidence.valid_to.desc().nullslast())
    )
    return [row for row in rows if evidence_is_valid(row, as_of)]


def evidence_for(db: Session, product_id: int, evidence_type: str) -> list[ProductEvidence]:
    return list(
        db.scalars(
            select(ProductEvidence).where(
                ProductEvidence.product_id == product_id,
                ProductEvidence.evidence_type == evidence_type,
            )
        )
    )


def get_shipping_rule(db: Session) -> ShippingRule | None:
    return db.scalar(select(ShippingRule).order_by(ShippingRule.id.desc()))


def get_capacity_day(db: Session, day: date) -> CapacityDay | None:
    return db.scalar(select(CapacityDay).where(CapacityDay.day == day))


def get_fee_rule(db: Session, marketplace: str, on_date: date, category: str = "ALL") -> FeeRule | None:
    stmt = (
        select(FeeRule)
        .where(
            FeeRule.marketplace == marketplace,
            FeeRule.effective_from <= on_date,
        )
        .where((FeeRule.effective_to.is_(None)) | (FeeRule.effective_to >= on_date))
        .order_by(
            (FeeRule.category == category).desc(),
            FeeRule.effective_from.desc(),
        )
    )
    return db.scalar(stmt)


def faq_matches(db: Session, message: str, limit: int = 3) -> list[Faq]:
    normalized = normalize_message(message)
    scored: list[tuple[int, Faq]] = []
    for faq in db.scalars(select(Faq)):
        keywords = [
            token
            for token in re.findall(r"[a-z]{4,}", normalize_message(faq.question))
            if token not in STOPWORDS
        ]
        score = sum(1 for token in set(keywords) if token in normalized)
        if score:
            scored.append((score, faq))
    scored.sort(key=lambda item: (-item[0], item[1].code))
    return [faq for _, faq in scored[:limit]]


def ops_rules_by_refs(db: Session, refs: str | None) -> list[OperationalRule]:
    if not refs:
        return []
    codes = [part.strip() for part in re.split(r"[,;]", refs) if part.strip()]
    if not codes:
        return []
    return list(db.scalars(select(OperationalRule).where(OperationalRule.code.in_(codes))))


def shipping_context(db: Session, as_of: datetime) -> dict:
    rule = get_shipping_rule(db)
    day = as_of.date()
    capacity = get_capacity_day(db, day)
    weekday = day.weekday()  # Monday=0
    is_sunday = weekday == 6
    cutoff_text = None
    if rule:
        cutoff_text = rule.cutoff_saturday if weekday == 5 else rule.cutoff_weekday
    cutoff_time = None
    if cutoff_text:
        hour, minute = [int(part) for part in cutoff_text.split(":")]
        cutoff_time = as_of.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return {
        "rule": rule,
        "day": day,
        "capacity": capacity,
        "is_sunday": is_sunday,
        "cutoff_text": cutoff_text,
        "cutoff_time": cutoff_time,
        "before_cutoff": bool(cutoff_time and as_of <= cutoff_time and not is_sunday),
        "capacity_available": bool(capacity and not capacity.is_closed),
    }


def capacity_remaining(capacity: CapacityDay | None) -> int | None:
    if capacity is None:
        return None
    return max(0, capacity.capacity - capacity.used)


def daterange(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current = current + timedelta(days=1)
