import subprocess
import sys
import time
import urllib.request
import json

python_exe = sys.executable
proc = subprocess.Popen(
    [python_exe, "-m", "uvicorn", "backend.app.main:app", "--port", "8000", "--host", "127.0.0.1"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

try:
    time.sleep(3)
    # Check /healthz
    with urllib.request.urlopen("http://127.0.0.1:8000/healthz", timeout=5) as resp:
        data = json.loads(resp.read().decode())
        print("HEALTHZ:", data)

    # Check /api/products
    with urllib.request.urlopen("http://127.0.0.1:8000/api/products", timeout=5) as resp:
        products_data = json.loads(resp.read().decode())
        print("TOTAL PRODUCTS:", products_data.get("total"))

    # Check /api/profit/summary
    with urllib.request.urlopen("http://127.0.0.1:8000/api/profit/summary", timeout=5) as resp:
        profit_data = json.loads(resp.read().decode())
        print("PROFIT KPI STATUS:", profit_data.get("kpi", {}).get("overall_status"))
        print("TRANSACTIONS COUNT:", profit_data.get("kpi", {}).get("transaction_count"))

finally:
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
