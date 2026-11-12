from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, utcnow

MONEY = Numeric(18, 2)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(32), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(64), default="Lainnya", index=True)
    variant: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), default="kemasan")
    modal: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    price: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    source_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    stock_snapshots: Mapped[list["StockSnapshot"]] = relationship(back_populates="product")
    evidence: Mapped[list["ProductEvidence"]] = relationship(back_populates="product")


class StockSnapshot(Base):
    __tablename__ = "stock_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    stock: Mapped[int] = mapped_column(Integer)
    captured_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    source: Mapped[str] = mapped_column(String(128), default="seed")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    product: Mapped[Product] = relationship(back_populates="stock_snapshots")


class ProductEvidence(Base):
    __tablename__ = "product_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    evidence_type: Mapped[str] = mapped_column(String(32), index=True)  # halal, bpom, expiry, composition
    issuer: Mapped[str] = mapped_column(String(255))
    document_no: Mapped[str] = mapped_column(String(128))
    valid_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valid_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="VALID")  # VALID, EXPIRED, MISSING, INVALID
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    file_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    product: Mapped[Product] = relationship(back_populates="evidence")


class OperationalRule(Base):
    __tablename__ = "operational_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    parameter: Mapped[str] = mapped_column(String(128))
    rule_text: Mapped[str] = mapped_column(Text)
    scope: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)


class Faq(Base):
    __tablename__ = "faqs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    ops_refs: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class ShippingRule(Base):
    __tablename__ = "shipping_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Jakarta")
    cutoff_weekday: Mapped[str] = mapped_column(String(8), default="14:00")
    cutoff_saturday: Mapped[str] = mapped_column(String(8), default="12:00")
    packing_capacity_per_day: Mapped[int] = mapped_column(Integer, default=700)
    cs_schedule: Mapped[str] = mapped_column(String(128), default="Senin-Sabtu 08:00-17:00 WIB")
    effective_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CapacityDay(Base):
    __tablename__ = "capacity_days"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day: Mapped[date] = mapped_column(Date, unique=True, index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=700)
    used: Mapped[int] = mapped_column(Integer, default=0)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class FeeRule(Base):
    __tablename__ = "fee_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    marketplace: Mapped[str] = mapped_column(String(32), index=True)
    category: Mapped[str] = mapped_column(String(64), default="ALL", index=True)
    version: Mapped[str] = mapped_column(String(32), index=True)
    effective_from: Mapped[date] = mapped_column(Date, index=True)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    commission_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=Decimal("0"))
    fixed_fee: Mapped[Decimal] = mapped_column(MONEY, default=Decimal("0"))
    admin_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=Decimal("0"))
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    marketplace: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PREVIEW", index=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0)
    unmatched_sku: Mapped[int] = mapped_column(Integer, default=0)
    mapping_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    stored_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ImportIssue(Base):
    __tablename__ = "import_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id"), index=True)
    row_number: Mapped[int] = mapped_column(Integer)
    field: Mapped[str] = mapped_column(String(64))
    value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16), default="ERROR")  # ERROR, WARNING


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String(64), index=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    marketplace: Mapped[str] = mapped_column(String(32), index=True)
    transaction_date: Mapped[date] = mapped_column(Date, index=True)
    sku: Mapped[str] = mapped_column(String(64), index=True)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)
    qty: Mapped[int] = mapped_column(Integer)
    gross_sales: Mapped[Decimal] = mapped_column(MONEY)
    seller_discount: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    refund_amount: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    cogs: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    marketplace_commission: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    fixed_fee: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    seller_shipping_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    packing_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    return_logistics_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    other_costs: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    fee_rule_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    import_batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("import_batches.id"), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    product: Mapped[Optional[Product]] = relationship()
    calculations: Mapped[list["TransactionCalculation"]] = relationship(back_populates="transaction")


class CalculationRun(Base):
    __tablename__ = "calculation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    formula_version: Mapped[str] = mapped_column(String(32), default="profit-v1")
    margin_base: Mapped[str] = mapped_column(String(32), default="NET_REVENUE")
    scope: Mapped[str] = mapped_column(String(64), default="all")
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TransactionCalculation(Base):
    __tablename__ = "transaction_calculations"
    __table_args__ = (UniqueConstraint("run_id", "transaction_pk", name="uq_run_transaction"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("calculation_runs.id"), index=True)
    transaction_pk: Mapped[int] = mapped_column(ForeignKey("transactions.id"), index=True)
    net_revenue: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    total_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    profit: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    margin_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)  # COMPLETE, PARTIAL, RECONCILIATION_REQUIRED, NOT_CALCULABLE
    warnings_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    trace_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    transaction: Mapped[Transaction] = relationship(back_populates="calculations")
    run: Mapped[CalculationRun] = relationship()


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    sent_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    sender: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    sku_context: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("conversation_id", "seq", name="uq_chat_conv_seq"),)


class ChatAnalysis(Base):
    __tablename__ = "chat_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    platform: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    normalized: Mapped[str] = mapped_column(Text)
    sku: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    message_class: Mapped[str] = mapped_column(String(32), default="GENERAL_QUESTION", index=True)
    intent: Mapped[str] = mapped_column(String(32), index=True)
    intents_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    decision: Mapped[str] = mapped_column(String(32), index=True)
    severity: Mapped[str] = mapped_column(String(16), default="rendah")
    complaint_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    injection_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    provider: Mapped[str] = mapped_column(String(64), default="rule-based")
    provider_meta_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    draft: Mapped[str] = mapped_column(Text)
    evidence_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_no: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    platform: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    sku: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    category: Mapped[str] = mapped_column(String(64), default="Lainnya", index=True)
    severity: Mapped[str] = mapped_column(String(16), default="sedang", index=True)
    status: Mapped[str] = mapped_column(String(32), default="BARU", index=True)
    summary: Mapped[str] = mapped_column(Text)
    estimated_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    confirmed_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="chat")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class GoldenChatCase(Base):
    __tablename__ = "golden_chat_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(String(32), default="Shopee")
    sku_context: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    as_of: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expected_intent: Mapped[str] = mapped_column(String(32))
    expected_message_class: Mapped[str] = mapped_column(String(32), default="GENERAL_QUESTION")
    expected_decision: Mapped[str] = mapped_column(String(32))
    expected_complaint: Mapped[bool] = mapped_column(Boolean, default=False)
    expected_severity: Mapped[str] = mapped_column(String(16), default="rendah")
    expected_abstain: Mapped[bool] = mapped_column(Boolean, default=False)
    injection: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dataset_version: Mapped[str] = mapped_column(String(32), default="demo-v1")


class GoldenProfitCase(Base):
    __tablename__ = "golden_profit_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    input_json: Mapped[dict] = mapped_column(JSON)
    expected_net_revenue: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    expected_total_cost: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    expected_profit: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    expected_margin_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    expected_status: Mapped[str] = mapped_column(String(32))
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dataset_version: Mapped[str] = mapped_column(String(32), default="demo-v1")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_version: Mapped[str] = mapped_column(String(32), default="demo-v1")
    provider: Mapped[str] = mapped_column(String(64), default="rule-based")
    status: Mapped[str] = mapped_column(String(32), default="COMPLETED")
    metrics_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    results_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    entity: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    detail_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


Index("ix_transactions_market_date", Transaction.marketplace, Transaction.transaction_date)
Index("ix_calc_status", TransactionCalculation.status)
