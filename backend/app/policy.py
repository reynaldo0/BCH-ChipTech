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
    "redy": "tersedia",
    "gk": "tidak",
    "ngga": "tidak",
    "ngak": "tidak",
    "tak": "tidak",
    "skrg": "sekarang",
    "kalo": "kalau",
    "klo": "kalau",
    "coklat": "cokelat",
    "turkey": "turki",
    "batalin": "batalkan",
    "gimana": "bagaimana",
    "gmn": "bagaimana",
    "dtg": "datang",
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
    "allergen": [r"alergi", r"alergen", r"ada\s+susu", r"mengandung", r"gluten", r"susu\s+atau\s+kacang"],
    "storage": [r"\bsimpan\b", r"penyimpanan", r"kulkas", r"suhu\s+ruang", r"tahan\s+berapa\s+lama", r"\bawet\b"],
}

_COMPLAINT = [
    r"rusak", r"pecah", r"hancur", r"penyok", r"bocor", r"meleleh", r"basi", r"berjamur",
    r"kurang\s+(satu|dua|\d+|barang|item|isi)", r"isinya\s+kurang", r"tidak\s+lengkap",
    r"beli\s+\d+\b.*\b(datang|sampai|diterima|dapat|cuma|hanya)\s+\d+",
    r"kok\s+yang\s+datang", r"yang\s+datang\s+(malah|justru|beda|lain)",
    r"salah\s+(kirim|barang|varian|ukuran|produk|item|rasa|isi)", r"tertukar",
    r"belum\s+(saya\s+)?(diterima|terima|dikirim|sampai|terkirim|datang|bergerak)",
    r"tidak\s+(saya\s+)?(dikirim|sampai|terima|bergerak|datang)",
    r"nyangkut", r"macet", r"paket\s+hilang", r"barang\s+hilang",
    r"telat", r"kecewa", r"komplain", r"keluhan",
    r"refund", r"retur", r"pengembalian\s+dana", r"uang\s+kembali", r"tipu", r"penipuan",
]

# Messages that need a staff check before any answer (kategori "belum pasti").
_STAFF_CHECK = [
    ("grosir", r"grosir|harga\s+(khusus|partai|reseller)|beli\s+banyak|reseller|partai\s+besar", "OPS-031",
     "Permintaan grosir/pembelian banyak diajukan ke admin untuk cek stok dan penawaran."),
    ("packing_tambahan", r"bubble\s*wrap|packing\s+(tambahan|tebal|ekstra|extra|aman\s+banget)|double\s+packing|tambah\s+(box|dus|kardus)|pakai\s+(box|kardus|dus)", "OPS-026",
     "Permintaan packing tambahan dicatat dan diperiksa gudang; ketersediaan dan biaya belum ditetapkan."),
    ("ubah_pesanan", r"(ganti|ubah|salah|tukar|update)\s+(alamat|varian|ukuran)|alamat(nya)?\s+.*(diganti|diubah|ganti|ubah)", "OPS-028",
     "Perubahan pesanan perlu pemeriksaan tahap packing dan opsi marketplace."),
    ("ambil_gudang", r"ambil\s+(sendiri|langsung|di\s+gudang|ke\s+gudang|di\s+toko)|pickup\s+sendiri|datang\s+ke\s+(gudang|toko)", None,
     "Pengambilan langsung di gudang tidak ada di FAQ/OPS; perlu keputusan admin."),
    ("invoice", r"invoice|faktur|kwitansi|\bnota\b|tagihan\s+resmi", None,
     "Permintaan invoice/faktur tidak ada di FAQ/OPS; perlu dicek admin."),
]

_RISKY_PAYMENT = r"transfer\s+(langsung|ke\s+rekening|ke\s+penjual|di\s+luar|manual)|rekening\s+pribadi|\botp\b|kode\s+(verifikasi|otp)|\bpin\b|kata\s+sandi|password"

_REFUND = [r"refund", r"retur", r"pengembalian", r"batal", r"batalkan"]


_PHONE_RE = re.compile(r"(?<!\d)(?:\+?62|0)[\s.-]?8\d(?:[\s.-]?\d){6,11}(?!\d)")
_ACCOUNT_RE = re.compile(
    r"(?i)\b(rek(?:ening)?|no\.?\s*rek|norek|bca|bri|bni|mandiri|bsi|cimb|dana|ovo|gopay)"
    r"(\s*[:.-]?\s*(?:a\.?n\.?\s*)?)((?:\d[\s.-]?){8,18}\d)"
)


def mask_pii(text: str) -> str:
    """Mask phone and bank/e-wallet account numbers (proposal S-07)."""
    if not text:
        return text
    masked = _ACCOUNT_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}[rekening disamarkan]", text)
    return _PHONE_RE.sub("[nomor HP disamarkan]", masked)


def normalize_message(message: str) -> str:
    text = message.replace("\u200b", "").replace("\ufeff", "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    # Normalise attached units and common size spellings without changing amounts.
    text = re.sub(r"\b(\d+)\s*(gr|gram|g)\b", r"\1 g", text)
    text = re.sub(r"\b(\d+)\s*(kg|kilogram|kilo)\b", r"\1 kg", text)
    text = re.sub(r"\b(\d+)\s*(btg|batang)\b", r"\1 batang", text)
    for slang, replacement in _SLANG.items():
        text = re.sub(rf"\b{re.escape(slang)}\b", replacement, text)
    # "g" means "tidak" only when it is NOT a unit after a number (units are locked above).
    text = re.sub(r"(?<!\d)(?<!\d\s)\bg\b", "tidak", text)
    # Greetings and particles do not change intent (Lampiran 4).
    text = re.sub(r"\b(kk|gan|sis|dong|deh|sih|nih|kah)\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


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


def staff_check(message: str, qty: int | None = None) -> dict | None:
    """Return the staff-check rule hit by this message, if any (Lampiran 4)."""
    normalized = normalize_message(message)
    if qty is not None and qty >= 20:
        return {"code": "grosir", "ops": "OPS-031",
                "reason": f"Permintaan {qty} kemasan (>=20) diajukan ke admin untuk cek stok dan penawaran."}
    for code, pattern, ops, reason in _STAFF_CHECK:
        if re.search(pattern, normalized):
            return {"code": code, "ops": ops, "reason": reason}
    return None


def is_risky_payment(message: str) -> bool:
    return bool(re.search(_RISKY_PAYMENT, normalize_message(message)))


def is_refund(message: str) -> bool:
    normalized = normalize_message(message)
    return any(re.search(p, normalized, flags=re.IGNORECASE) for p in _REFUND)


STOCK_PATTERNS = [
    r"\b(ready|tersedia|stok|stock|kosong|restock|habis)\b",
    r"masih\s+ada",
    r"\bada\s+(kan|tidak|ya|nggak|ga|gak)\b",
    r"pre\s*-?\s*order|preorder|\bpo\b",
    r"kapan\s+(tersedia|ada|restock)",
]


def classify_intent(message: str) -> str:
    normalized = normalize_message(message)
    if detect_high_risk(message):
        return "klaim_berisiko"
    if is_complaint(message):
        return "keluhan"
    if any(re.search(p, normalized) for p in STOCK_PATTERNS):
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
    if any(re.search(p, normalized) for p in STOCK_PATTERNS):
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
    critical = [r"keracunan", r"bahaya", r"bpom", r"halal", r"kedaluwarsa", r"polisi", r"somasi", r"viralkan", r"konsumen", r"hukum"]
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
        r"(\d+)\s*(?:pcs|buah|kemasan|box|dus|bungkus|bks|pack|toples|kotak|biji)\b",
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
    text = text.replace("Rp", "").replace("rp", "").replace("RP", "").replace(" ", "").replace("\u00a0", "")
    if text in {"-", "\u2013", "\u2014"}:
        return Decimal("0")
    if text.startswith("(") and text.endswith(")"):
        text = "-" + text[1:-1]
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


_ORDER_REF = [
    r"(?:no\.?\s*(?:pesanan|order|resi)|nomor\s+(?:pesanan|order|resi)|pesanan|order|resi|invoice)\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9-]{5,})",
    r"\b(\d{6}[A-Z0-9]{4,})\b",
]


def extract_order_ref(message: str) -> str | None:
    """Pick up an order/receipt number for the complaint ticket (test T4)."""
    for pattern in _ORDER_REF:
        match = re.search(pattern, message, flags=re.IGNORECASE)
        if match and re.search(r"\d", match.group(1)):
            return match.group(1).upper()
    return None
