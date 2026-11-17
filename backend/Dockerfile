FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN groupadd --system kompas && useradd --system --gid kompas --home-dir /app kompas \
    && mkdir -p /app/var /app/data/uploads \
    && chown -R kompas:kompas /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY csv /app/csv
COPY data/demo /app/data/demo

RUN chown -R kompas:kompas /app
USER kompas

EXPOSE 8005

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8005/healthz', timeout=3)"

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8005", "--proxy-headers"]
