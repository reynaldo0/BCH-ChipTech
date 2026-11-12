from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

INTENTS = ("stok", "harga", "pengiriman", "keluhan", "klaim_berisiko", "promo", "pesanan", "lainnya")
DECISIONS = ("JAWAB_LANGSUNG", "JAWAB_TERBATAS", "ESKALASI")
SEVERITIES = ("rendah", "sedang", "tinggi", "kritis")

_SLANG = {
    "gak": "tidak",
    "ga": "tidak",
    "nggak": "tidak",
    "enggak": "tidak",
    "tdk": "tidak",
    "udah": "sudah",
    "dah": "sudah",
    "blm": "belum",
    "brp": "berapa",
    "brapa": "berapa",
    "hrg": "harga",
    "sy": "saya",
    "utk": "untuk",
    "dgn": "dengan",
    "bgt": "banget",
    "min": "kak",
    "admin": "kak",
    "ready": "tersedia",
    "exp": "kedaluwarsa",
    "expired": "kedaluwarsa",
    "kadaluarsa": "kedaluwarsa",
}

_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"abaikan\s+(semua|seluruh\s+)?(instruksi|perintah|aturan)",
    r"jangan\s+(ikuti|patuhi)\s+(aturan|instruksi)",
    r"system\s*prompt",
    r"prompt\s*sistem",
    r"developer\s*message",
    r"you\s+are\s+now",
    r"(kamu|anda)\s+sekarang\s+adalah",
    r"jailbreak",
    r"bypass\s+(aturan|policy|kebijakan)",
    r"(tampilkan|berikan|kirim)\s+(api\s*key|secret|password|token)",
    r"drop\s+table",
    r"<\s*script",
]

_HIGH_RISK = {
    "halal": [r"\bhalal\b", r"sertifikat\s+halal", r"label\s+halal"],
    "bpom": [r"\bbpom\b", r"izin\s+edar", r"nomor\s+izin"],
    "expiry": [r"kedaluwarsa", r"kadaluarsa", r"tanggal\s+exp", r"masa\s+berlaku", r"expired"],
    "composition": [r"komposisi", r"bahan\s+produk", r"kandungan"],
}

_COMPLAINT = [
    r"rusak", r"pecah", r"hancur", r"penyok", r"bocor", r"meleleh",
    r"kurang\s+(satu|barang|item)", r"salah\s+kirim", r"tidak\s+lengkap",
    r"belum\s+(diterima|dikirim|sampai|terkirim)", r"tidak\s+(dikirim|sampai)",
    r"telat", r"lambat", r"kecewa", r"komplain", r"keluhan",
    r"refund", r"retur", r"pengembalian", r"batal", r"tipu", r"penipuan",
]

_REFUND = [r"refund", r"retur", r"pengembalian", r"batal", r"batalkan"]


def normalize_message(message: str) -> str:
    text = message.replace("\u200b", "").replace("\ufeff", "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    # Normalise attached units and common size spellings without changing amounts.
    text = re.sub(r"\b(\d+)\s*(gr|gram|g)\b", r"\1 g", text)
    text = re.sub(r"\b(\d+)\s*(kg|kilogram|kilo)\b", r"\1 kg", text)
    text = re.sub(r"\b(\d+)\s*(btg|batang)\b", r"\1 batang", text)
    for slang, replacement in _SLANG.items():
        text = re.sub(rf"\b{re.escape(slang)}\b", replacement, text)
    return text


def detect_injection(message: str) -> tuple[bool, str | None]:
    normalized = normalize_message(message)
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, normalized, flags=re.IGNORECASE):
            return True, pattern
    return False, None


def detect_high_risk(message: str) -> list[str]:
    normalized = normalize_message(message)
    found: list[str] = []
    for evidence_type, patterns in _HIGH_RISK.items():
        if any(re.search(p, normalized, flags=re.IGNORECASE) for p in patterns):
            found.append(evidence_type)
    return found


def is_complaint(message: str) -> bool:
    normalized = normalize_message(message)
    return any(re.search(p, normalized, flags=re.IGNORECASE) for p in _COMPLAINT)


def is_refund(message: str) -> bool:
    normalized = normalize_message(message)
    return any(re.search(p, normalized, flags=re.IGNORECASE) for p in _REFUND)


def classify_intent(message: str) -> str:
    normalized = normalize_message(message)
    if detect_high_risk(message):
        return "klaim_berisiko"
    if is_complaint(message):
        return "keluhan"
    if any(re.search(p, normalized) for p in [r"\b(ready|tersedia|stok|kosong|restock)\b", r"masih\s+ada"]):
        return "stok"
    if any(
        re.search(p, normalized)
        for p in [
            r"\bharga\b",
            r"\bharganya\b",
            r"\brp\s*\d",
            r"\bberapa\s+(harga|rp|rupiah)",
            r"\btotal\b",
            r"beli\s+\d+",
        ]
    ):
        return "harga"
    if any(re.search(p, normalized) for p in [r"\bkirim\b", r"pengiriman", r"ongkir", r"kurir", r"sampai", r"pickup", r"hari\s+ini", r"besok"]):
        return "pengiriman"
    if any(re.search(p, normalized) for p in [r"voucher", r"promo", r"diskon", r"gratis\s+ongkir", r"\bcod\b", r"cicilan"]):
        return "promo"
    if any(re.search(p, normalized) for p in [r"pesanan", r"invoice", r"faktur", r"pesan\s+saya", r"order"]):
        return "pesanan"
    return "lainnya"


def detect_intents(message: str) -> list[str]:
    """Topic-level multi-intent detection. Complaint/high-risk always win priority."""
    normalized = normalize_message(message)
    topics: list[str] = []
    if detect_high_risk(message):
        topics.append("klaim_berisiko")
    if is_complaint(message):
        topics.append("keluhan")
    if any(re.search(p, normalized) for p in [r"\b(ready|tersedia|stok|kosong|restock)\b", r"masih\s+ada"]):
        topics.append("stok")
    if any(
        re.search(p, normalized)
        for p in [
            r"\bharga\b",
            r"\bharganya\b",
            r"\brp\s*\d",
            r"\bberapa\s+(harga|rp|rupiah)",
            r"\btotal\b",
            r"beli\s+\d+",
        ]
    ):
        topics.append("harga")
    if any(re.search(p, normalized) for p in [r"\bkirim\b", r"pengiriman", r"ongkir", r"kurir", r"sampai", r"pickup", r"hari\s+ini", r"besok"]):
        topics.append("pengiriman")
    if any(re.search(p, normalized) for p in [r"voucher", r"promo", r"diskon", r"gratis\s+ongkir", r"\bcod\b", r"cicilan"]):
        topics.append("promo")
    if any(re.search(p, normalized) for p in [r"pesanan", r"invoice", r"faktur", r"pesan\s+saya", r"\border\b"]):
        topics.append("pesanan")
    if not topics:
        topics.append("lainnya")
    return list(dict.fromkeys(topics))


def severity_for(message: str) -> str:
    normalized = normalize_message(message)
    critical = [r"keracunan", r"bahaya", r"bpom", r"halal", r"polisi", r"somasi", r"viralkan", r"konsumen", r"hukum"]
    high = [
        r"rusak", r"pecah", r"hancur", r"penyok", r"bocor", r"meleleh",
        r"refund", r"retur", r"salah\s+kirim", r"tidak\s+lengkap",
        r"belum\s+(diterima|dikirim|sampai|terkirim)", r"tidak\s+(dikirim|sampai)",
        r"tipu",
    ]
    medium = [r"telat", r"lambat", r"kecewa", r"komplain", r"voucher", r"gagal", r"kurang", r"\d+\s+hari"]
    if any(re.search(p, normalized) for p in critical):
        return "kritis"
    if any(re.search(p, normalized) for p in high):
        return "tinggi"
    if any(re.search(p, normalized) for p in medium):
        return "sedang"
    return "rendah"


def extract_qty(message: str) -> int | None:
    normalized = normalize_message(message)
    patterns = [
        r"(?:beli|order|pesan|ambil|butuh)\s+(\d+)",
        r"(\d+)\s*(?:pcs|buah|paket|kemasan|batang|box|dus)",
        r"(\d+)\s*x\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            value = int(match.group(1))
            if 1 <= value <= 10000:
                return value
    return None


def extract_sku_token(message: str, known_skus: list[str]) -> str | None:
    upper = message.upper()
    for sku in sorted(known_skus, key=len, reverse=True):
        if re.search(rf"(?<![A-Z0-9-]){re.escape(sku.upper())}(?![A-Z0-9-])", upper):
            return sku
    return None


def parse_decimal(value) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip()
    if text == "":
        return None
    text = text.replace("Rp", "").replace("rp", "").replace(" ", "")
    negative = text.startswith("-")
    text = text.lstrip("+-")
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    elif text.count(".") > 1:
        text = text.replace(".", "")
    elif text.count(".") == 1:
        left, right = text.split(".")
        if right.isdigit() and len(right) == 3 and left.isdigit():
            text = left + right
    try:
        result = Decimal(text)
    except (InvalidOperation, ValueError):
        return None
    return -result if negative else result


def money(value: Decimal | None, places: int = 0) -> Decimal | None:
    if value is None:
        return None
    quant = Decimal("1") if places == 0 else Decimal("1." + "0" * places)
    return value.quantize(quant, rounding=ROUND_HALF_UP)


def format_idr(value: Decimal | int | float | None) -> str:
    if value is None:
        return "—"
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    rounded = money(value, 0)
    sign = "-" if rounded < 0 else ""
    absolute = abs(rounded)
    return f"{sign}Rp{int(absolute):,}".replace(",", ".")


def format_number(value: Decimal | int | float | None, places: int = 2) -> str:
    if value is None:
        return "—"
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    rounded = money(value, places)
    text = f"{rounded:,.{places}f}"
    return text.replace(",", "X").replace(".", ",").replace("X", ".")
