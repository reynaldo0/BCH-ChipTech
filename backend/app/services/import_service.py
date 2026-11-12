"""CSV/XLSX import: preview, mapping, validation, confirmation."""
from __future__ import annotations

import csv
import io
import re
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AuditLog, ImportBatch, ImportIssue, Product, Transaction
from ..policy import parse_decimal
from .profit_engine import run_calculation

SUPPORTED_MARKETPLACES = {"Shopee": "Shopee", "TikTok Shop": "TikTok Shop", "Lazada": "Lazada"}
MARKETPLACE_ALIASES = {
    "shopee": "Shopee",
    "tiktok": "TikTok Shop",
    "tiktok shop": "TikTok Shop",
    "tiktokshop": "TikTok Shop",
    "lazada": "Lazada",
}

STANDARD_FIELDS = [
    "transaction_id",
    "order_id",
    "transaction_date",
    "marketplace",
    "sku",
    "quantity",
    "gross_sales",
    "seller_discount",
    "refund_amount",
    "cogs",
    "marketplace_commission",
    "fixed_fee",
    "seller_shipping_cost",
    "packing_cost",
    "return_logistics_cost",
    "other_cost",
]
REQUIRED_FIELDS = ["transaction_id", "transaction_date", "sku", "quantity", "gross_sales"]
MONEY_FIELDS = [
    "gross_sales",
    "seller_discount",
    "refund_amount",
    "cogs",
    "marketplace_commission",
    "fixed_fee",
    "seller_shipping_cost",
    "packing_cost",
    "return_logistics_cost",
    "other_cost",
]
FIELD_LABELS = {
    "transaction_id": "ID transaksi",
    "order_id": "ID pesanan",
    "transaction_date": "Tanggal transaksi",
    "marketplace": "Marketplace",
    "sku": "SKU",
    "quantity": "Kuantitas",
    "gross_sales": "Penjualan bruto",
    "seller_discount": "Diskon penjual",
    "refund_amount": "Refund",
    "cogs": "Modal/HPP",
    "marketplace_commission": "Komisi marketplace",
    "fixed_fee": "Biaya tetap",
    "seller_shipping_cost": "Ongkir penjual",
    "packing_cost": "Biaya packing",
    "return_logistics_cost": "Logistik retur",
    "other_cost": "Biaya lain",
}
SYNONYMS = {
    "transaction_id": ["transaction id", "id transaksi", "order id", "no pesanan", "nomor pesanan", "kode pesanan", "invoice", "invoice id"],
    "order_id": ["order reference", "no order", "nomor order", "id pesanan", "order group", "parent order"],
    "transaction_date": ["order date", "tanggal pesanan", "tanggal transaksi", "tanggal", "date", "waktu pesanan", "created at", "created time"],
    "marketplace": ["marketplace", "channel", "platform", "kanal", "sumber"],
    "sku": ["sku", "seller sku", "kode produk", "product code", "variasi", "nama variasi", "sku produk"],
    "quantity": ["qty", "quantity", "jumlah", "kuantitas", "jumlah barang", "item count"],
    "gross_sales": ["gross sales", "subtotal", "harga produk", "total harga", "penjualan", "omzet", "subtotal produk"],
    "seller_discount": ["seller discount", "voucher penjual", "diskon penjual", "voucher seller", "diskon toko"],
    "refund_amount": ["refund", "refund amount", "pengembalian dana", "dana kembali", "return amount"],
    "cogs": ["cogs", "hpp", "modal", "modal produk", "cost of goods", "harga pokok"],
    "marketplace_commission": ["commission", "komisi", "biaya layanan", "service fee", "marketplace fee", "biaya marketplace"],
    "fixed_fee": ["fixed fee", "biaya tetap", "biaya administrasi", "admin fee", "biaya admin", "fee tetap"],
    "seller_shipping_cost": ["seller shipping", "ongkir penjual", "ongkir ditanggung", "shipping cost", "biaya kirim penjual"],
    "packing_cost": ["packing cost", "biaya packing", "packing", "biaya kemas"],
    "return_logistics_cost": ["return logistics", "logistik retur", "biaya retur", "return shipping", "ongkir retur"],
    "other_cost": ["other cost", "biaya lain", "biaya lainnya", "other fee"],
}


class ImportErrorDetail(Exception):
    def __init__(self, code: str, message: str, detail: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.detail = detail or {}


@dataclass
class ParsedFile:
    headers: list[str]
    rows: list[list[str]]
    delimiter: str | None = None
    sheet_name: str | None = None
    sheet_names: list[str] = field(default_factory=list)


@dataclass
class PreviewResult:
    batch: ImportBatch
    detected_columns: list[str]
    suggested_mapping: dict[str, str]
    preview_rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]
    sheet_names: list[str]


def _normalise_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").strip().lower()).strip()


def _clean_headers(headers: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: dict[str, int] = {}
    for index, header in enumerate(headers):
        value = (header or "").replace("\ufeff", "").strip()
        if not value:
            value = f"kolom_{index + 1}"
        key = value
        if key in seen:
            seen[key] += 1
            value = f"{value}_{seen[key]}"
        else:
            seen[key] = 1
        cleaned.append(value)
    return cleaned


def _decode(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ImportErrorDetail("ENCODING", "Encoding file tidak dikenali.")


def _detect_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;|\t")
        return dialect.delimiter
    except csv.Error:
        pass
    counts = {delimiter: sample.count(delimiter) for delimiter in [",", ";", "|", "\t"]}
    return max(counts, key=counts.get) if max(counts.values()) > 0 else ","


def parse_file(filename: str, content: bytes, sheet_name: str | None = None) -> ParsedFile:
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv", ".xlsx"}:
        raise ImportErrorDetail(
            "EXTENSION", "Format file harus CSV atau XLSX.", {"filename": filename}
        )
    if len(content) > settings.import_max_file_mb * 1024 * 1024:
        raise ImportErrorDetail(
            "FILE_TOO_LARGE",
            f"Ukuran file melebihi batas {settings.import_max_file_mb} MB.",
        )
    if not content:
        raise ImportErrorDetail("EMPTY_FILE", "File kosong.")

    if suffix == ".csv":
        text = _decode(content)
        if not text.strip():
            raise ImportErrorDetail("EMPTY_FILE", "File CSV tidak berisi data.")
        delimiter = _detect_delimiter(text[:8192])
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        rows = [row for row in reader if any(cell.strip() for cell in row)]
        if len(rows) < 2:
            raise ImportErrorDetail("NO_DATA", "File harus memiliki header dan minimal satu baris data.")
        headers = _clean_headers(rows[0])
        data_rows = rows[1:]
        if len(headers) > settings.import_max_columns:
            raise ImportErrorDetail(
                "TOO_MANY_COLUMNS",
                f"Jumlah kolom melebihi batas {settings.import_max_columns}.",
            )
        if len(data_rows) > settings.import_max_rows:
            raise ImportErrorDetail(
                "TOO_MANY_ROWS",
                f"Jumlah baris melebihi batas {settings.import_max_rows}.",
            )
        normalised = []
        for row in data_rows:
            if len(row) > len(headers):
                row = row[: len(headers)]
            normalised.append(row + [""] * (len(headers) - len(row)))
        return ParsedFile(headers=headers, rows=normalised, delimiter=delimiter)

    # XLSX: server-side parser, read-only, no macro execution.
    try:
        from openpyxl import load_workbook
    except ImportError as exc:  # pragma: no cover - dependency installed in requirements
        raise ImportErrorDetail("XLSX_UNAVAILABLE", "Parser XLSX belum tersedia.") from exc

    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise ImportErrorDetail("XLSX_INVALID", "File XLSX tidak dapat dibaca.") from exc
    sheet_names = list(workbook.sheetnames)
    if sheet_name:
        if sheet_name not in sheet_names:
            raise ImportErrorDetail(
                "SHEET_NOT_FOUND", "Sheet tidak ditemukan.", {"sheets": sheet_names}
            )
        selected = sheet_name
    else:
        selected = sheet_names[0] if sheet_names else None
    if selected is None:
        raise ImportErrorDetail("EMPTY_FILE", "Workbook tidak memiliki sheet.")
    sheet = workbook[selected]
    raw_rows = []
    for row in sheet.iter_rows(values_only=True):
        if row is None:
            continue
        values = ["" if cell is None else str(cell) for cell in row]
        if any(value.strip() for value in values):
            raw_rows.append(values)
    if len(raw_rows) < 2:
        raise ImportErrorDetail("NO_DATA", "Sheet harus memiliki header dan minimal satu baris data.", {"sheets": sheet_names})
    headers = _clean_headers(raw_rows[0])
    if len(headers) > settings.import_max_columns:
        raise ImportErrorDetail("TOO_MANY_COLUMNS", f"Jumlah kolom melebihi batas {settings.import_max_columns}.")
    data_rows = raw_rows[1:]
    if len(data_rows) > settings.import_max_rows:
        raise ImportErrorDetail("TOO_MANY_ROWS", f"Jumlah baris melebihi batas {settings.import_max_rows}.")
    norm_rows = []
    for row in data_rows:
        row = list(row)
        if len(row) > len(headers):
            row = row[: len(headers)]
        norm_rows.append(row + [""] * (len(headers) - len(row)))
    return ParsedFile(headers=headers, rows=norm_rows, sheet_name=selected, sheet_names=sheet_names)


def suggest_mapping(headers: list[str]) -> dict[str, str]:
    normalised = {header: _normalise_header(header) for header in headers}
    mapping: dict[str, str] = {}
    used: set[str] = set()
    for target in STANDARD_FIELDS:
        # Exact target match first.
        for header, normal in normalised.items():
            if header in used:
                continue
            if normal == _normalise_header(target):
                mapping[header] = target
                used.add(header)
                break
        if any(value == target for value in mapping.values()):
            continue
        for synonym in SYNONYMS.get(target, []):
            synonym_norm = _normalise_header(synonym)
            for header, normal in normalised.items():
                if header in used:
                    continue
                if normal == synonym_norm:
                    mapping[header] = target
                    used.add(header)
                    break
            if any(value == target for value in mapping.values()):
                break
    return mapping


def _parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    text = text.replace("T", " ")
    for fmt in (
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%Y %H:%M",
        "%Y/%m/%d",
        "%d %b %Y",
        "%d %B %Y",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _normalise_marketplace(value: Any, default: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        text = (default or "").strip()
    if not text:
        return None
    return MARKETPLACE_ALIASES.get(text.lower(), SUPPORTED_MARKETPLACES.get(text))


def _row_dict(headers: list[str], row: list[str], mapping: dict[str, str]) -> dict[str, str]:
    index = {header: position for position, header in enumerate(headers)}
    result: dict[str, str] = {}
    for header, target in mapping.items():
        position = index.get(header)
        result[target] = (row[position] if position is not None and position < len(row) else "").strip()
    return result


def _validate_row(
    row: dict[str, str],
    marketplace_default: str | None,
    known_skus: set[str],
    row_number: int,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    issues: list[dict[str, Any]] = []
    for field in REQUIRED_FIELDS:
        if field == "marketplace":
            continue
        if not row.get(field, "").strip():
            issues.append(
                {
                    "row_number": row_number,
                    "field": field,
                    "value": "",
                    "reason": f"{FIELD_LABELS[field]} wajib diisi.",
                    "severity": "ERROR",
                }
            )
    if issues:
        return None, issues

    tx_date = _parse_date(row.get("transaction_date"))
    if tx_date is None:
        return None, [
            {
                "row_number": row_number,
                "field": "transaction_date",
                "value": row.get("transaction_date"),
                "reason": "Tanggal tidak valid. Gunakan YYYY-MM-DD atau DD/MM/YYYY.",
                "severity": "ERROR",
            }
        ]

    try:
        quantity = int(str(row.get("quantity", "")).strip())
    except (TypeError, ValueError):
        quantity = 0
    if quantity <= 0:
        return None, [
            {
                "row_number": row_number,
                "field": "quantity",
                "value": row.get("quantity"),
                "reason": "Kuantitas harus bilangan bulat positif.",
                "severity": "ERROR",
            }
        ]

    gross = parse_decimal(row.get("gross_sales"))
    if gross is None:
        return None, [
            {
                "row_number": row_number,
                "field": "gross_sales",
                "value": row.get("gross_sales"),
                "reason": "Nominal penjualan bruto tidak valid.",
                "severity": "ERROR",
            }
        ]
    if gross < 0:
        return None, [
            {
                "row_number": row_number,
                "field": "gross_sales",
                "value": row.get("gross_sales"),
                "reason": "Penjualan bruto tidak boleh negatif.",
                "severity": "ERROR",
            }
        ]

    market = _normalise_marketplace(row.get("marketplace"), marketplace_default)
    if market is None:
        return None, [
            {
                "row_number": row_number,
                "field": "marketplace",
                "value": row.get("marketplace") or marketplace_default or "",
                "reason": "Marketplace harus Shopee, TikTok Shop, atau Lazada.",
                "severity": "ERROR",
            }
        ]

    money_values: dict[str, Decimal | None] = {}
    for field in MONEY_FIELDS:
        raw = row.get(field, "").strip()
        if not raw:
            money_values[field] = None
            continue
        if re.search(r"[A-Za-z]{2,}", raw) and not re.search(r"rp", raw, re.IGNORECASE):
            return None, [
                {
                    "row_number": row_number,
                    "field": field,
                    "value": raw,
                    "reason": "Nominal mengandung teks/mata uang yang tidak didukung.",
                    "severity": "ERROR",
                }
            ]
        value = parse_decimal(raw)
        if value is None:
            return None, [
                {
                    "row_number": row_number,
                    "field": field,
                    "value": raw,
                    "reason": "Nominal bukan angka yang valid.",
                    "severity": "ERROR",
                }
            ]
        if value < 0 and field not in {"refund_amount", "seller_discount", "other_cost"}:
            return None, [
                {
                    "row_number": row_number,
                    "field": field,
                    "value": raw,
                    "reason": "Nilai negatif tidak diizinkan untuk komponen ini.",
                    "severity": "ERROR",
                }
            ]
        money_values[field] = value

    sku = row.get("sku", "").strip().upper()
    known = sku in known_skus
    if not known:
        issues.append(
            {
                "row_number": row_number,
                "field": "sku",
                "value": sku,
                "reason": "SKU tidak cocok dengan Product Brain; transaksi tetap diimpor sebagai unmatched.",
                "severity": "WARNING",
            }
        )

    return (
        {
            "transaction_id": row.get("transaction_id", "").strip(),
            "order_id": row.get("order_id", "").strip() or row.get("transaction_id", "").strip(),
            "transaction_date": tx_date,
            "marketplace": market,
            "sku": sku,
            "quantity": quantity,
            "gross_sales": gross,
            "seller_discount": money_values["seller_discount"],
            "refund_amount": money_values["refund_amount"],
            "cogs": money_values["cogs"],
            "marketplace_commission": money_values["marketplace_commission"],
            "fixed_fee": money_values["fixed_fee"],
            "seller_shipping_cost": money_values["seller_shipping_cost"],
            "packing_cost": money_values["packing_cost"],
            "return_logistics_cost": money_values["return_logistics_cost"],
            "other_costs": money_values["other_cost"],
            "unmatched": not known,
        },
        issues,
    )


def create_preview(
    db: Session,
    filename: str,
    content: bytes,
    marketplace: str | None,
    actor: str | None,
    sheet_name: str | None = None,
) -> PreviewResult:
    parsed = parse_file(filename, content, sheet_name)
    mapping = suggest_mapping(parsed.headers)
    known = {product.sku for product in db.scalars(select(Product))}
    issues: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    existing_ids = {
        tx_id for tx_id, in db.execute(select(Transaction.transaction_id)).all()
    }
    preview_rows: list[dict[str, Any]] = []
    valid_rows = 0
    invalid_rows = 0
    duplicate_rows = 0
    unmatched = 0

    for offset, raw_row in enumerate(parsed.rows, start=2):
        row = _row_dict(parsed.headers, raw_row, mapping)
        tx_id = row.get("transaction_id", "").strip()
        if tx_id and (tx_id in seen_ids or tx_id in existing_ids):
            duplicate_rows += 1
            issues.append(
                {
                    "row_number": offset,
                    "field": "transaction_id",
                    "value": tx_id,
                    "reason": "Duplikat ID transaksi (file atau database). Baris akan dilewati saat commit.",
                    "severity": "ERROR",
                }
            )
            invalid_rows += 1
            continue
        if tx_id:
            seen_ids.add(tx_id)
        normalised, row_issues = _validate_row(row, marketplace, known, offset)
        issues.extend(row_issues)
        if normalised is None:
            invalid_rows += 1
            continue
        valid_rows += 1
        if normalised["unmatched"]:
            unmatched += 1
        if len(preview_rows) < 10:
            preview_rows.append(
                {
                    "row_number": offset,
                    "transaction_id": normalised["transaction_id"],
                    "transaction_date": normalised["transaction_date"].isoformat(),
                    "marketplace": normalised["marketplace"],
                    "sku": normalised["sku"],
                    "quantity": normalised["quantity"],
                    "gross_sales": str(normalised["gross_sales"]),
                    "unmatched": normalised["unmatched"],
                }
            )

    upload_dir = settings.data_dir / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_suffix = Path(filename).suffix.lower()
    stored = upload_dir / f"{uuid.uuid4().hex}{safe_suffix}"
    stored.write_bytes(content)

    batch = ImportBatch(
        filename=filename,
        marketplace=marketplace,
        status="PREVIEW",
        total_rows=len(parsed.rows),
        valid_rows=valid_rows,
        invalid_rows=invalid_rows,
        duplicate_rows=duplicate_rows,
        unmatched_sku=unmatched,
        mapping_json={
            "mapping": mapping,
            "headers": parsed.headers,
            "sheet": parsed.sheet_name,
            "sheets": parsed.sheet_names,
            "delimiter": parsed.delimiter,
        },
        stored_path=str(stored),
        created_by=actor,
    )
    db.add(batch)
    db.flush()
    for issue in issues:
        db.add(
            ImportIssue(
                batch_id=batch.id,
                row_number=issue["row_number"],
                field=issue["field"],
                value=str(issue.get("value") or "")[:255],
                reason=issue["reason"],
                severity=issue["severity"],
            )
        )
    db.add(
        AuditLog(
            actor=actor or "system",
            action="import.preview",
            entity="import_batch",
            entity_id=str(batch.id),
            detail_json={
                "filename": filename,
                "rows": len(parsed.rows),
                "valid": valid_rows,
                "invalid": invalid_rows,
                "duplicate": duplicate_rows,
                "unmatched": unmatched,
            },
        )
    )
    db.commit()
    db.refresh(batch)
    return PreviewResult(
        batch=batch,
        detected_columns=parsed.headers,
        suggested_mapping=mapping,
        preview_rows=preview_rows,
        issues=issues[:200],
        sheet_names=parsed.sheet_names,
    )


def _validate_mapping(mapping: dict[str, str]) -> None:
    if not mapping:
        raise ImportErrorDetail("MAPPING_EMPTY", "Mapping kolom wajib diisi.")
    targets = list(mapping.values())
    if len(targets) != len(set(targets)):
        raise ImportErrorDetail("MAPPING_DUPLICATE", "Satu field tujuan dipetakan lebih dari sekali.")
    missing = [field for field in REQUIRED_FIELDS if field not in targets and field != "marketplace"]
    if missing:
        labels = ", ".join(FIELD_LABELS.get(field, field) for field in missing)
        raise ImportErrorDetail("MAPPING_REQUIRED", f"Field wajib belum dipetakan: {labels}.")
    unknown = [field for field in targets if field not in STANDARD_FIELDS]
    if unknown:
        raise ImportErrorDetail("MAPPING_UNKNOWN", f"Field tujuan tidak dikenal: {', '.join(unknown)}.")


def confirm_import(
    db: Session, batch_id: int, mapping: dict[str, str], actor: str | None
) -> dict[str, Any]:
    batch = db.get(ImportBatch, batch_id)
    if batch is None:
        raise ImportErrorDetail("BATCH_NOT_FOUND", "Batch impor tidak ditemukan.")
    if batch.status == "COMMITTED":
        raise ImportErrorDetail("BATCH_COMMITTED", "Batch ini sudah di-commit.")
    if not batch.stored_path or not Path(batch.stored_path).exists():
        raise ImportErrorDetail("FILE_MISSING", "File upload tidak ditemukan; unggah ulang.")

    _validate_mapping(mapping)
    content = Path(batch.stored_path).read_bytes()
    meta = batch.mapping_json or {}
    parsed = parse_file(batch.filename, content, meta.get("sheet"))
    header_set = set(parsed.headers)
    for source in mapping:
        if source not in header_set:
            raise ImportErrorDetail(
                "MAPPING_SOURCE", f"Kolom sumber tidak ditemukan: {source}."
            )

    db.execute(delete(ImportIssue).where(ImportIssue.batch_id == batch.id))
    known_products = {product.sku: product for product in db.scalars(select(Product))}
    existing_ids = {tx_id for tx_id, in db.execute(select(Transaction.transaction_id)).all()}

    issues: list[dict[str, Any]] = []
    to_insert: list[Transaction] = []
    seen_ids: set[str] = set()
    duplicate_rows = 0
    invalid_rows = 0
    unmatched = 0
    valid_rows = 0

    for offset, raw_row in enumerate(parsed.rows, start=2):
        row = _row_dict(parsed.headers, raw_row, mapping)
        tx_id = row.get("transaction_id", "").strip()
        if not tx_id or tx_id in seen_ids or tx_id in existing_ids:
            duplicate_rows += 1
            issues.append(
                {
                    "row_number": offset,
                    "field": "transaction_id",
                    "value": tx_id,
                    "reason": "ID transaksi kosong atau duplikat; baris dilewati.",
                    "severity": "ERROR",
                }
            )
            invalid_rows += 1
            continue
        normalised, row_issues = _validate_row(
            row, batch.marketplace, set(known_products), offset
        )
        issues.extend(row_issues)
        if normalised is None:
            invalid_rows += 1
            continue
        seen_ids.add(tx_id)
        product = known_products.get(normalised["sku"])
        if normalised["unmatched"]:
            unmatched += 1
        to_insert.append(
            Transaction(
                transaction_id=normalised["transaction_id"],
                order_id=normalised["order_id"],
                marketplace=normalised["marketplace"],
                transaction_date=normalised["transaction_date"],
                sku=normalised["sku"],
                product_id=product.id if product else None,
                qty=normalised["quantity"],
                gross_sales=normalised["gross_sales"],
                seller_discount=normalised["seller_discount"],
                refund_amount=normalised["refund_amount"],
                cogs=normalised["cogs"],
                marketplace_commission=normalised["marketplace_commission"],
                fixed_fee=normalised["fixed_fee"],
                seller_shipping_cost=normalised["seller_shipping_cost"],
                packing_cost=normalised["packing_cost"],
                return_logistics_cost=normalised["return_logistics_cost"],
                other_costs=normalised["other_costs"],
                status="completed",
                import_batch_id=batch.id,
                is_demo=True,
            )
        )
        valid_rows += 1

    db.add_all(to_insert)
    db.flush()
    for issue in issues:
        db.add(
            ImportIssue(
                batch_id=batch.id,
                row_number=issue["row_number"],
                field=issue["field"],
                value=str(issue.get("value") or "")[:255],
                reason=issue["reason"],
                severity=issue["severity"],
            )
        )
    batch.status = "COMMITTED"
    batch.total_rows = len(parsed.rows)
    batch.valid_rows = valid_rows
    batch.invalid_rows = invalid_rows
    batch.duplicate_rows = duplicate_rows
    batch.unmatched_sku = unmatched
    batch.mapping_json = {
        **(batch.mapping_json or {}),
        "mapping": mapping,
        "confirmed_mapping": mapping,
    }
    batch.confirmed_at = datetime.now()
    db.flush()

    run = run_calculation(db, actor=actor, scope=f"import:{batch.id}")
    db.add(
        AuditLog(
            actor=actor or "system",
            action="import.commit",
            entity="import_batch",
            entity_id=str(batch.id),
            detail_json={
                "valid": valid_rows,
                "invalid": invalid_rows,
                "duplicate": duplicate_rows,
                "unmatched": unmatched,
                "calculation_run_id": run.id,
            },
        )
    )
    db.commit()

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total_rows": batch.total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "duplicate_rows": duplicate_rows,
        "unmatched_sku": unmatched,
        "issues": issues[:200],
        "calculation_run_id": run.id,
    }


def template_csv(marketplace: str) -> str:
    headers = [
        "Order ID",
        "Order Date",
        "SKU",
        "Qty",
        "Gross Sales",
        "Seller Discount",
        "Refund",
        "COGS",
        "Commission",
        "Fixed Fee",
        "Seller Shipping",
        "Packing Cost",
        "Return Logistics",
        "Other Cost",
    ]
    sample = {
        "Shopee": ["DEMO-SHP-0001", "2026-11-02", "KRM-AJW-250", "2", "90000", "0", "0", "64000", "7200", "1250", "0", "1500", "0", "0"],
        "TikTok Shop": ["DEMO-TTS-0001", "2026-11-02", "KRM-AJW-250", "2", "90000", "0", "0", "64000", "5850", "1000", "0", "1500", "0", "0"],
        "Lazada": ["DEMO-LZD-0001", "2026-11-02", "KRM-AJW-250", "2", "90000", "0", "0", "64000", "6750", "1500", "0", "1500", "0", "0"],
    }
    selected = sample.get(marketplace, sample["Shopee"])
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(headers)
    writer.writerow(selected)
    return output.getvalue()
