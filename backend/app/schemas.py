from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(ORMModel):
    id: int
    username: str
    display_name: str
    role: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    expires_in_hours: int


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str = "Lainnya"
    variant: str | None = None
    unit: str = "kemasan"
    modal: Decimal | None = None
    price: Decimal | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    variant: str | None = None
    unit: str | None = None
    modal: Decimal | None = None
    price: Decimal | None = None
    is_active: bool | None = None


class ProductOut(ORMModel):
    id: int
    sku: str
    name: str
    category: str
    variant: str | None
    unit: str
    modal: Decimal | None
    price: Decimal | None
    is_active: bool
    source_file: str | None = None
    source_row: int | None = None
    is_demo: bool = True


class StockSnapshotIn(BaseModel):
    stock: int = Field(ge=0)
    captured_at: datetime | None = None
    source: str = "manual"


class StockSnapshotOut(ORMModel):
    id: int
    product_id: int
    stock: int
    captured_at: datetime
    source: str
    is_demo: bool


class EvidenceIn(BaseModel):
    evidence_type: Literal["halal", "bpom", "expiry", "composition", "lainnya"]
    issuer: str
    document_no: str
    valid_from: date | None = None
    valid_to: date | None = None
    status: str = "VALID"
    file_ref: str | None = None
    notes: str | None = None


class EvidenceOut(ORMModel):
    id: int
    product_id: int
    evidence_type: str
    issuer: str
    document_no: str
    valid_from: date | None
    valid_to: date | None
    status: str
    is_demo: bool
    file_ref: str | None
    notes: str | None


class FeeRuleOut(ORMModel):
    id: int
    marketplace: str
    category: str
    version: str
    effective_from: date
    effective_to: date | None
    commission_pct: Decimal
    fixed_fee: Decimal
    admin_pct: Decimal
    notes: str | None


class OperationalRuleOut(ORMModel):
    id: int
    code: str
    category: str
    parameter: str
    rule_text: str
    scope: str | None


class FaqOut(ORMModel):
    id: int
    code: str
    category: str
    question: str
    answer: str
    ops_refs: str | None


class ChatAnalyzeRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    platform: str = "Shopee"
    sku_context: str | None = None
    conversation_id: str | None = None
    as_of: datetime | None = None
    persist: bool = True
    create_complaint: bool = True


class EvidenceItem(BaseModel):
    source: str
    ref: str
    label: str
    status: str
    updated_at: str | None = None


class ChatAnalyzeResponse(BaseModel):
    message_class: str
    intent: str
    intents: list[str] = []
    decision: str
    severity: str
    complaint: bool
    injection: bool
    confidence: float
    provider: str
    provider_status: str
    provider_meta: dict[str, Any] = {}
    sku: str | None
    product_name: str | None
    draft: str
    evidence: list[EvidenceItem]
    warnings: list[str] = []
    complaint_ticket: str | None = None
    analysis_id: int | None = None


class ComplaintOut(ORMModel):
    id: int
    ticket_no: str
    conversation_id: str | None
    customer_id: str | None
    platform: str | None
    sku: str | None
    category: str
    severity: str
    status: str
    summary: str
    estimated_cost: Decimal | None
    confirmed_cost: Decimal | None
    source: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ComplaintUpdate(BaseModel):
    status: Literal["BARU", "PERLU_PERHATIAN", "MENUNGGU", "SELESAI", "DITOLAK"] | None = None
    severity: Literal["rendah", "sedang", "tinggi", "kritis"] | None = None
    notes: str | None = None
    confirmed_cost: Decimal | None = None


class TransactionOut(ORMModel):
    id: int
    transaction_id: str
    order_id: str | None
    marketplace: str
    transaction_date: date
    sku: str
    qty: int
    gross_sales: Decimal
    seller_discount: Decimal | None
    refund_amount: Decimal | None
    cogs: Decimal | None
    marketplace_commission: Decimal | None
    fixed_fee: Decimal | None
    seller_shipping_cost: Decimal | None
    packing_cost: Decimal | None
    return_logistics_cost: Decimal | None
    other_costs: Decimal | None
    status: str
    notes: str | None


class CalculationOut(ORMModel):
    id: int
    transaction_pk: int
    net_revenue: Decimal | None
    total_cost: Decimal | None
    profit: Decimal | None
    margin_pct: Decimal | None
    status: str
    warnings_json: list | None
    trace_json: dict | None


class TransactionDetail(BaseModel):
    transaction: TransactionOut
    calculation: CalculationOut | None


class ProfitSummary(BaseModel):
    period: dict[str, str | None]
    kpi: dict[str, Any]
    status_counts: dict[str, int]
    by_marketplace: list[dict[str, Any]]
    by_day: list[dict[str, Any]]
    top_products: list[dict[str, Any]]
    formula_version: str
    margin_base: str
    is_demo: bool = True


class ImportIssueOut(ORMModel):
    id: int
    row_number: int
    field: str
    value: str | None
    reason: str
    severity: str


class ImportPreview(BaseModel):
    batch_id: int
    filename: str
    total_rows: int
    detected_columns: list[str]
    suggested_mapping: dict[str, str]
    preview_rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]
    limits: dict[str, int]


class ImportConfirmRequest(BaseModel):
    mapping: dict[str, str]


class ImportResult(BaseModel):
    batch_id: int
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    unmatched_sku: int
    issues: list[dict[str, Any]]
    calculation_run_id: int | None = None


class EvaluationRequest(BaseModel):
    provider: Literal["rule-based", "jev"] = "rule-based"
    dataset_version: str = "demo-v1"


class DashboardOverview(BaseModel):
    period: dict[str, str | None]
    kpi: dict[str, Any]
    by_day: list[dict[str, Any]]
    by_marketplace: list[dict[str, Any]]
    attention: list[dict[str, Any]]
    top_products: list[dict[str, Any]]
    complaints: dict[str, Any]
    brief: list[dict[str, Any]]
    freshness: dict[str, Any]
    is_demo: bool = True


class UserRoleUpdate(BaseModel):
    role: Literal["owner", "manager", "cs", "packing", "judge"]
