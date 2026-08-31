# syntax=docker/dockerfile:1
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so the layer is cached until requirements change.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Application code and the prebuilt Chroma vector store.
# `chroma/` is committed to the repo, so a fresh clone has everything the
# backend needs to answer queries without re-running create_database.py.
COPY backend/ ./backend/
COPY chroma/ ./chroma/

RUN useradd --system --uid 1001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Production-style command: no --reload, bound to all interfaces.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
