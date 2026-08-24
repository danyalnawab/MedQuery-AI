# MedQuery-AI Web Frontend — Design

## Context

MedQuery-AI (formerly JARDVIS) is a RAG chatbot over a personal collection of Integrative Medicine journal notes, currently served through a single-page Streamlit app (`JARDVIS.py`) that calls LangChain + ChromaDB + OpenAI directly in-process.

The goal of this project is to replace that Streamlit UI with a proper full-stack web app: a Next.js frontend talking to a FastAPI backend that wraps the existing RAG logic. This is being built partly as a portfolio piece — the user has access to an ATS system that scans the GitHub repo itself, so repo structure and code quality matter, not just functionality.

Docker containerization and the README are explicitly deferred to follow-up work; this spec covers the frontend + backend build only.

## Goals

- Replace the Streamlit UI with a modern chat-style web app.
- Real conversational memory: follow-up questions should work using prior turns in the same session.
- Token-by-token streaming responses, like ChatGPT/Claude.
- Keep the existing Chroma vector store and document corpus unchanged — only the serving layer changes.
- Improve the security posture: the OpenAI API key should live only in the backend, never reach the browser.
- End state: `JARDVIS.py` is removed once the new frontend is verified working.

## Non-goals

- Docker/containerization (next spec).
- README (deferred).
- Auth, multi-user support, or persisted chat history across sessions/devices.
- Rebuilding or changing the ingestion pipeline (`create_database.py`) or the document corpus.

## Architecture

Single repo (monorepo), two new top-level directories alongside the existing ingestion code:

```
MedQuery-AI/
├── backend/            FastAPI service
│   ├── main.py          API app, CORS, /chat endpoint
│   ├── rag.py            refactored RAG logic (retrieval + conversational chain)
│   └── requirements.txt
├── frontend/            Next.js app
│   ├── app/               pages/routes
│   ├── components/        chat UI (Tailwind + shadcn/ui)
│   └── ...
├── data/                (existing, unchanged)
├── chroma/              (existing, unchanged)
├── create_database.py   (existing, unchanged)
└── devlog.md
```

**Why monorepo over separate frontend/backend repos:** the ATS system scans this GitHub repo directly. Splitting services into separate repos would dilute what gets scanned and read as two smaller, disconnected projects rather than one complete full-stack build. A monorepo also sets up cleanly for the Docker step later (one `docker-compose.yml` running both services).

## Backend (FastAPI)

- One endpoint: `POST /chat`, accepting `{ message: string, history: [{role, content}, ...] }`.
- Response is a streamed SSE (Server-Sent Events) response: token chunks as the LLM generates, followed by a final event carrying `sources` (the retrieved document file paths).
- `rag.py` builds a LangChain conversational chain: takes the incoming `history` + new `message`, retrieves relevant chunks from the existing Chroma DB (same `CHROMA_PATH`, same embedding function as today), and streams the LLM's response back through the endpoint.
- Low-relevance / no-match handling mirrors the existing threshold logic in `query_data.py` (relevance score < 0.7 on the top result → return a "no matching results" message instead of streaming).
- `OPENAI_API_KEY` is read from a backend-only `.env` (`python-dotenv`, consistent with the existing scripts) — never sent to or read by the frontend.
- CORS configured to allow the Next.js dev server origin (`localhost:3000` in development).
- SSE was chosen over WebSockets: the data flow is one-directional (client asks, server streams back), so SSE is simpler to implement and sufficient — no need for bidirectional communication.

## Frontend (Next.js + Tailwind + shadcn/ui)

- Single chat page: scrolling message list (user/assistant bubbles) + input box, built with shadcn/ui's chat-style primitives on top of Tailwind CSS.
- Consumes the backend's SSE stream and renders assistant tokens incrementally as they arrive.
- Each assistant message shows an expandable "Sources" section once the response finishes streaming, listing the source document paths returned by the backend (equivalent to the current Streamlit `st.expander("Sources")`).
- Chat history lives in React component state only — resets on page refresh. No client- or server-side persistence; the full history array is sent to the backend on each request so the conversational chain has context.
- Network/API failure surfaces as an inline error message in the chat thread rather than crashing the page.

## Data flow

1. User types a message and submits.
2. Frontend appends the user message to local state, sends `POST /chat` with `{ message, history }` (history = all prior turns in this session).
3. Backend condenses `message` + `history` into a standalone search query (a small LLM call, the standard conversational-RAG pattern), runs retrieval against Chroma using that condensed query, then streams the answer LLM's response over SSE using the retrieved chunks + full history as context.
4. Frontend renders tokens as they arrive into a new assistant message bubble.
5. On stream completion, backend sends a final `sources` event; frontend attaches it to that message for the expandable sources section.
6. If retrieval finds nothing above the relevance threshold, backend skips streaming and sends a single "no matching results" message instead.

## Testing approach

- Backend: lightweight tests around `rag.py` — does retrieval return expected chunks for a known query, does the history-formatting logic produce the expected chain input. Not an exhaustive suite, given this is a solo portfolio project.
- Frontend: manual verification by running both services locally (via the `run` skill/workflow) and exercising the chat in a browser — multi-turn conversation, streaming behavior, sources display, and the no-match case. No automated UI test suite for this pass.

## Rollout

- Built on a new feature branch off `main`.
- `JARDVIS.py` (and its now-unneeded Streamlit-specific dependencies, if any turn out to be Streamlit-only) is deleted as the last step, only after the new frontend has been manually verified end-to-end.
- PR opened and merged per the existing repo workflow (see `devlog.md` history) once complete.
