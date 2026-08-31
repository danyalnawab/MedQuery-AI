# MedQuery-AI

Conversational RAG assistant over a curated corpus of integrative-medicine
reference material. Ask a question in natural language and get a streamed answer
grounded **only** in the source documents, with citations — or an explicit "no
matching results" when the corpus doesn't cover the topic.

**Live demo:** http://18.226.223.246

> Educational tool only. Not medical advice, diagnosis, or treatment. Always
> consult a qualified clinician.

## How it works

```
Browser ──▶ Next.js frontend ──▶ /api/chat proxy ──▶ FastAPI /chat (SSE)
                                                          │
                                    condense follow-up question (LLM)
                                                          │
                                    Chroma similarity search (threshold 0.7)
                                                          │
                                    stream answer tokens + sources (OpenAI)
```

- **Conversational** — follow-up questions are rewritten into standalone queries
  using the chat history before retrieval ([`backend/rag.py`](backend/rag.py)).
- **Grounded** — if the top match scores below the relevance threshold, the
  backend returns `no_match` instead of guessing.
- **Streamed** — answers arrive token-by-token over Server-Sent Events, proxied
  same-origin so no backend hostname is ever shipped to the browser
  ([`frontend/app/api/chat/route.ts`](frontend/app/api/chat/route.ts)).

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, Uvicorn, LangChain |
| Retrieval | Chroma vector store (committed to the repo) |
| Models | OpenAI embeddings + chat completions |

## Run with Docker (recommended)

Requires Docker with Compose v2 and an OpenAI API key.

```bash
cp .env.example .env          # then set OPENAI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (`/docs` for the API, `/health` for probes)

Full details, commands, and environment variables are in [`DOCKER.md`](DOCKER.md).

## Run locally without Docker

**Backend** (from the repo root, so `backend` imports resolve):

```bash
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
export OPENAI_API_KEY=sk-...
uvicorn backend.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev            # proxies /api/chat to http://localhost:8000
```

## Tests

```bash
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
pytest
```

## Rebuilding the vector store

The Chroma store under [`chroma/`](chroma/) is committed and baked into the
backend image, so a fresh clone works with no setup. To regenerate it from the
Markdown sources in `data/Integrative Medicine/`:

```bash
python create_database.py
```

## Project layout

```
backend/       FastAPI app, RAG orchestration, tests
frontend/      Next.js app (landing page + /chat interface)
chroma/        Prebuilt Chroma vector store
data/          Source Markdown documents
docs/          Design specs and implementation plans
compose.yml    Full-stack Docker Compose definition
```
