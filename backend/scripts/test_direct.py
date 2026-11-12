import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import init_db
from backend.app.db import SessionLocal
from backend.app.routers.products import list_all_products, get_product_detail
from backend.app.routers.chat import analyze_chat, ChatRequestWithProvider
from backend.app.routers.complaints import list_complaints
from backend.app.routers.profit import get_profit_summary, list_transactions
from backend.app.routers.evaluation import run_chat_evaluation_endpoint, run_profit_evaluation_endpoint
from backend.app.schemas import EvaluationRequest

init_db()
db = SessionLocal()
print("--- 1. Testing Products ---")
products_res = list_all_products(db=db)
print("Products count:", products_res["total"])
assert products_res["total"] == 30

print("--- 2. Testing Chat Copilot ---")
chat_req = ChatRequestWithProvider(
    message="Ready Kurma Ajwa 250 g kak?",
    platform="Shopee",
    sku_context="KRM-AJW-250",
    prefer_provider="rule-based",
)
chat_res = analyze_chat(payload=chat_req, db=db, current_user=None)
print("Chat decision:", chat_res["decision"])
print("Chat intent:", chat_res["intent"])
print("Chat draft:", chat_res["draft"][:80], "...")

print("--- 3. Testing Profit Engine Summary ---")
summary_res = get_profit_summary(db=db)
print("KPI Gross Sales:", summary_res["kpi"]["gross_sales"])
print("KPI Net Revenue:", summary_res["kpi"]["net_revenue_complete"])
print("KPI Profit:", summary_res["kpi"]["profit_complete"])
print("Transaction count:", summary_res["kpi"]["transaction_count"])

print("--- 4. Testing Complaints ---")
complaints_res = list_complaints(db=db)
print("Complaints count:", complaints_res["total"])

print("--- 5. Testing Golden Profit Evaluation ---")
profit_eval = run_profit_evaluation_endpoint(db=db)
print("Golden Profit Evaluation:", profit_eval["metrics"])
assert profit_eval["metrics"]["passed"] >= 17
assert profit_eval["metrics"]["total"] == 18

print("--- 6. Testing Golden Chat Evaluation ---")
chat_eval = run_chat_evaluation_endpoint(payload=EvaluationRequest(provider="rule-based"), db=db, current_user=None)
print("Golden Chat Evaluation:", chat_eval["metrics"])
assert chat_eval["metrics"]["decision_correct"] >= 24
assert chat_eval["metrics"]["intent_correct"] >= 25

db.close()
print("\nALL BACKEND SERVICES & ROUTERS SMOKE-TESTED SUCCESSFULLY!")
