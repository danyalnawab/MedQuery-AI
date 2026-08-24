# MedQuery-AI Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Streamlit UI (`JARDVIS.py`) with a Next.js chat frontend backed by a FastAPI service that wraps the existing RAG logic, with real conversational memory and token-by-token streaming.

**Architecture:** Monorepo with new `backend/` (FastAPI) and `frontend/` (Next.js) directories alongside the existing `create_database.py`/`chroma/`/`data/`. The backend exposes one `POST /chat` SSE endpoint; the frontend is a single chat page that streams responses and shows sources.

**Tech Stack:** FastAPI, LangChain (`langchain-openai`, `langchain-community`), ChromaDB (existing store, unchanged), pytest, Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui.

## Global Constraints

- `OPENAI_API_KEY` must live only in `backend/.env`; the frontend must never read or receive it.
- Relevance threshold for "no matching results" is `0.7` on the top result's score, `k=3` retrieved chunks — matches existing `query_data.py` behavior exactly.
- Chat history is client-side React state only — no database, resets on page refresh.
- CORS must allow only `http://localhost:3000` for now (local dev).
- Do not modify `create_database.py`, `data/`, or the existing `chroma/` store.
- `JARDVIS.py` is removed only in the final task, after manual end-to-end verification passes.

---

### Task 1: Feature branch and backend scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env`
- Create: `backend/__init__.py` (empty, makes `backend` importable for tests run from repo root)

**Interfaces:**
- Produces: a `backend/` directory with dependencies installed into the existing project `venv/`, and `backend/.env` holding `OPENAI_API_KEY` for later tasks to read via `python-dotenv`.

- [ ] **Step 1: Create and check out the feature branch**

```bash
git checkout main
git pull
git checkout -b feature/web-frontend
```

- [ ] **Step 2: Create the backend directory and requirements file**

Create `backend/requirements.txt`:

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
langchain==0.3.27
langchain-community==0.3.30
langchain-openai==0.3.35
chromadb==1.1.1
python-dotenv==1.1.1
pytest==8.3.4
httpx==0.28.1
```

- [ ] **Step 3: Create `backend/__init__.py`**

Empty file — makes `backend` a package so tests can `from backend.rag import ...` when run from the repo root.

- [ ] **Step 4: Create `backend/.env` with the API key**

```bash
grep OPENAI_API_KEY .env > backend/.env
```

- [ ] **Step 5: Verify `backend/.env` is git-ignored**

```bash
git check-ignore -v backend/.env
```

Expected: prints a line showing `.gitignore:5:.env	backend/.env` (or similar) — confirming it's ignored. If nothing prints, STOP and add `backend/.env` to `.gitignore` before continuing — do not proceed with a real API key at risk of being committed.

- [ ] **Step 6: Install backend dependencies into the existing venv**

```bash
source venv/bin/activate
pip install -r backend/requirements.txt
```

- [ ] **Step 7: Commit scaffold**

```bash
git add backend/requirements.txt backend/__init__.py
git status
```

Confirm `backend/.env` does NOT appear in the output before committing.

```bash
git commit -m "Scaffold backend directory and dependencies"
```

---

### Task 2: `rag.py` — pure helper functions (relevance threshold, history formatting)

**Files:**
- Create: `backend/rag.py`
- Test: `backend/tests/test_rag.py`
- Create: `backend/tests/__init__.py` (empty)

**Interfaces:**
- Produces: `is_below_relevance_threshold(results: list[tuple]) -> bool`, `format_history_for_prompt(history: list[dict]) -> str`, `RELEVANCE_THRESHOLD: float` constant — used by Tasks 4 and 5.

- [ ] **Step 1: Create test directory and write failing tests**

Create `backend/tests/__init__.py` (empty).

Create `backend/tests/test_rag.py`:

```python
from backend.rag import is_below_relevance_threshold, format_history_for_prompt


def test_is_below_relevance_threshold_empty_results():
    assert is_below_relevance_threshold([]) is True


def test_is_below_relevance_threshold_low_score():
    assert is_below_relevance_threshold([(object(), 0.5)]) is True


def test_is_below_relevance_threshold_high_score():
    assert is_below_relevance_threshold([(object(), 0.8)]) is False


def test_format_history_for_prompt_empty():
    assert format_history_for_prompt([]) == ""


def test_format_history_for_prompt_multiple_turns():
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes, generally."},
    ]
    assert format_history_for_prompt(history) == "User: Is X safe?\nAssistant: Yes, generally."
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source venv/bin/activate
pytest backend/tests/test_rag.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'backend.rag'`

- [ ] **Step 3: Create `backend/rag.py` with the minimal implementation**

```python
RELEVANCE_THRESHOLD = 0.7


def is_below_relevance_threshold(results: list[tuple]) -> bool:
    """results: list of (Document, score) tuples from a Chroma similarity search."""
    return len(results) == 0 or results[0][1] < RELEVANCE_THRESHOLD


def format_history_for_prompt(history: list[dict]) -> str:
    """history: list of {"role": "user"|"assistant", "content": str}."""
    if not history:
        return ""
    lines = [f"{turn['role'].capitalize()}: {turn['content']}" for turn in history]
    return "\n".join(lines)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/rag.py backend/tests/
git commit -m "Add relevance threshold and history formatting helpers"
```

---

### Task 3: `rag.py` — `condense_question`

**Files:**
- Modify: `backend/rag.py`
- Modify: `backend/tests/test_rag.py`

**Interfaces:**
- Consumes: `format_history_for_prompt(history)` from Task 2.
- Produces: `condense_question(message: str, history: list[dict], llm) -> str` — used by Task 5's `stream_answer`. `llm` must expose `.invoke(prompt: str) -> object` where the returned object has a `.content` string attribute (matches `langchain_openai.ChatOpenAI`'s interface).

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_rag.py`:

```python
from backend.rag import condense_question


class FakeLLMResponse:
    def __init__(self, content):
        self.content = content


class FakeLLM:
    def __init__(self, response_content):
        self.response_content = response_content
        self.last_prompt = None

    def invoke(self, prompt):
        self.last_prompt = prompt
        return FakeLLMResponse(self.response_content)


def test_condense_question_returns_message_unchanged_when_no_history():
    llm = FakeLLM("should not be used")
    result = condense_question("What about kids?", [], llm)
    assert result == "What about kids?"


def test_condense_question_calls_llm_when_history_present():
    llm = FakeLLM("Is X safe for children?")
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes, generally."},
    ]
    result = condense_question("What about kids?", history, llm)
    assert result == "Is X safe for children?"
    assert "What about kids?" in llm.last_prompt
    assert "Is X safe?" in llm.last_prompt
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: FAIL with `ImportError: cannot import name 'condense_question'`

- [ ] **Step 3: Implement `condense_question`**

Add to `backend/rag.py` (below the existing helpers):

```python
from langchain.prompts import ChatPromptTemplate

CONDENSE_PROMPT = ChatPromptTemplate.from_template(
    """Given the conversation history and a follow-up question, rephrase the \
follow-up question to be a standalone question that includes any necessary \
context from the history.

Conversation history:
{history}

Follow-up question: {question}

Standalone question:"""
)


def condense_question(message: str, history: list[dict], llm) -> str:
    if not history:
        return message
    prompt = CONDENSE_PROMPT.format(
        history=format_history_for_prompt(history), question=message
    )
    response = llm.invoke(prompt)
    return response.content.strip()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add backend/rag.py backend/tests/test_rag.py
git commit -m "Add condense_question for conversational query rewriting"
```

---

### Task 4: `rag.py` — `retrieve`

**Files:**
- Modify: `backend/rag.py`
- Modify: `backend/tests/test_rag.py`

**Interfaces:**
- Consumes: `is_below_relevance_threshold(results)` from Task 2.
- Produces: `retrieve(query: str, db, k: int = 3) -> tuple[str, list[str]]` returning `(context_text, sources)` — used by Task 5. `db` must expose `.similarity_search_with_relevance_scores(query, k=k) -> list[tuple[Document, float]]` where `Document` has `.page_content: str` and `.metadata: dict` (matches `langchain_community.vectorstores.Chroma`'s interface).

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_rag.py`:

```python
from backend.rag import retrieve


class FakeDocument:
    def __init__(self, page_content, metadata):
        self.page_content = page_content
        self.metadata = metadata


class FakeDB:
    def __init__(self, results):
        self.results = results

    def similarity_search_with_relevance_scores(self, query, k=3):
        return self.results


def test_retrieve_returns_context_and_sources_above_threshold():
    docs = [
        (FakeDocument("chunk one", {"source": "a.md"}), 0.9),
        (FakeDocument("chunk two", {"source": "b.md"}), 0.8),
    ]
    context, sources = retrieve("query", FakeDB(docs))
    assert "chunk one" in context and "chunk two" in context
    assert sources == ["a.md", "b.md"]


def test_retrieve_returns_empty_below_threshold():
    db = FakeDB([(FakeDocument("chunk", {"source": "a.md"}), 0.3)])
    context, sources = retrieve("query", db)
    assert context == ""
    assert sources == []


def test_retrieve_returns_empty_for_no_results():
    context, sources = retrieve("query", FakeDB([]))
    assert context == ""
    assert sources == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: FAIL with `ImportError: cannot import name 'retrieve'`

- [ ] **Step 3: Implement `retrieve`**

Add to `backend/rag.py`:

```python
def retrieve(query: str, db, k: int = 3) -> tuple[str, list[str]]:
    results = db.similarity_search_with_relevance_scores(query, k=k)
    if is_below_relevance_threshold(results):
        return "", []
    context = "\n\n---\n\n".join(doc.page_content for doc, _ in results)
    sources = [doc.metadata.get("source") for doc, _ in results]
    return context, sources
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add backend/rag.py backend/tests/test_rag.py
git commit -m "Add retrieve for Chroma similarity search with relevance threshold"
```

---

### Task 5: `rag.py` — `stream_answer` orchestration

**Files:**
- Modify: `backend/rag.py`
- Modify: `backend/tests/test_rag.py`

**Interfaces:**
- Consumes: `condense_question` (Task 3), `retrieve` (Task 4), `format_history_for_prompt` (Task 2).
- Produces: `stream_answer(message: str, history: list[dict], db, llm) -> Generator[dict, None, None]` yielding `{"token": str}` events, then either `{"done": True, "sources": list[str]}` or (when nothing relevant is found) a single `{"no_match": True}` — this exact event shape is consumed by Task 6's FastAPI endpoint and by the frontend's SSE parser (Task 9). `llm` must additionally expose `.stream(prompt: str) -> Iterable[object]` where each object has `.content: str` (matches `ChatOpenAI`'s interface).

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_rag.py`:

```python
from backend.rag import stream_answer


class FakeStreamChunk:
    def __init__(self, content):
        self.content = content


class FakeStreamingLLM(FakeLLM):
    def __init__(self, response_content, stream_chunks):
        super().__init__(response_content)
        self.stream_chunks = stream_chunks

    def stream(self, prompt):
        return iter(FakeStreamChunk(c) for c in self.stream_chunks)


def test_stream_answer_yields_no_match_when_below_threshold():
    db = FakeDB([])
    llm = FakeStreamingLLM("standalone", [])
    events = list(stream_answer("question", [], db, llm))
    assert events == [{"no_match": True}]


def test_stream_answer_yields_tokens_then_done_with_sources():
    docs = [(FakeDocument("chunk", {"source": "a.md"}), 0.9)]
    db = FakeDB(docs)
    llm = FakeStreamingLLM("standalone question", ["Hel", "lo"])
    events = list(stream_answer("question", [], db, llm))
    assert events == [
        {"token": "Hel"},
        {"token": "lo"},
        {"done": True, "sources": ["a.md"]},
    ]


def test_stream_answer_condenses_question_when_history_present():
    docs = [(FakeDocument("chunk", {"source": "a.md"}), 0.9)]
    db = FakeDB(docs)
    llm = FakeStreamingLLM("condensed standalone question", ["ok"])
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes."},
    ]
    events = list(stream_answer("What about kids?", history, db, llm))
    assert events[-1] == {"done": True, "sources": ["a.md"]}
    assert llm.last_prompt is not None
    assert "What about kids?" in llm.last_prompt
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: FAIL with `ImportError: cannot import name 'stream_answer'`

- [ ] **Step 3: Implement `stream_answer`**

Add to `backend/rag.py`:

```python
ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """Answer the question based only on the following context:

{context}

---

Conversation history:
{history}

Answer the question based on the above context: {question}"""
)


def stream_answer(message: str, history: list[dict], db, llm):
    standalone_query = condense_question(message, history, llm)
    context, sources = retrieve(standalone_query, db)
    if not sources:
        yield {"no_match": True}
        return
    prompt = ANSWER_PROMPT.format(
        context=context, history=format_history_for_prompt(history), question=message
    )
    for chunk in llm.stream(prompt):
        if chunk.content:
            yield {"token": chunk.content}
    yield {"done": True, "sources": sources}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest backend/tests/test_rag.py -v
```

Expected: 14 passed

- [ ] **Step 5: Commit**

```bash
git add backend/rag.py backend/tests/test_rag.py
git commit -m "Add stream_answer orchestration for conversational RAG streaming"
```

---

### Task 6: `main.py` — FastAPI `/chat` SSE endpoint

**Files:**
- Create: `backend/main.py`
- Create: `backend/tests/test_main.py`

**Interfaces:**
- Consumes: `stream_answer` from Task 5 (imported as `backend.rag.stream_answer`, called via module attribute so tests can monkeypatch it).
- Produces: `POST /chat` endpoint accepting `{"message": str, "history": [{"role": str, "content": str}]}`, returning `text/event-stream` with lines formatted `data: <json>\n\n` — this exact wire format is consumed by the frontend's SSE parser (Task 9).

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_main.py`:

```python
from fastapi.testclient import TestClient

from backend import main


def test_chat_endpoint_streams_sse_events(monkeypatch):
    def fake_stream_answer(message, history, db, llm):
        yield {"token": "Hel"}
        yield {"token": "lo"}
        yield {"done": True, "sources": ["a.md"]}

    monkeypatch.setattr(main, "stream_answer", fake_stream_answer)

    client = TestClient(main.app)
    response = client.post("/chat", json={"message": "hi", "history": []})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    body = response.text
    assert 'data: {"token": "Hel"}' in body
    assert 'data: {"token": "lo"}' in body
    assert '"done": true' in body
    assert '"sources": ["a.md"]' in body


def test_chat_endpoint_passes_history_through(monkeypatch):
    captured = {}

    def fake_stream_answer(message, history, db, llm):
        captured["message"] = message
        captured["history"] = history
        yield {"no_match": True}

    monkeypatch.setattr(main, "stream_answer", fake_stream_answer)

    client = TestClient(main.app)
    client.post(
        "/chat",
        json={
            "message": "What about kids?",
            "history": [{"role": "user", "content": "Is X safe?"}],
        },
    )

    assert captured["message"] == "What about kids?"
    assert captured["history"] == [{"role": "user", "content": "Is X safe?"}]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest backend/tests/test_main.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'backend.main'`

- [ ] **Step 3: Implement `backend/main.py`**

```python
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel

from backend.rag import stream_answer

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

embedding_function = OpenAIEmbeddings()
db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)
llm = ChatOpenAI()


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.post("/chat")
def chat(request: ChatRequest):
    history = [turn.model_dump() for turn in request.history]

    def event_stream():
        for event in stream_answer(request.message, history, db, llm):
            yield format_sse(event)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest backend/tests/test_main.py -v
```

Expected: 2 passed

- [ ] **Step 5: Run the full backend test suite**

```bash
pytest backend/ -v
```

Expected: 16 passed

- [ ] **Step 6: Commit**

```bash
git add backend/main.py backend/tests/test_main.py
git commit -m "Add FastAPI /chat SSE endpoint"
```

---

### Task 7: Manually verify the backend serves real streamed answers

**Files:** none (verification only)

**Interfaces:**
- Consumes: the running `backend/main.py` app from Task 6, hitting the real OpenAI API and the real Chroma store.

- [ ] **Step 1: Start the backend**

```bash
source venv/bin/activate
cd backend && uvicorn main:app --reload --port 8000
```

- [ ] **Step 2: Send a real request in a second terminal**

```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What helps with insomnia?", "history": []}'
```

Expected: a stream of `data: {"token": "..."}` lines followed by `data: {"done": true, "sources": [...]}` where sources are `.md` file paths from `data/Integrative Medicine/SECTION 1 AFFECTIVE DISORDERS/`.

- [ ] **Step 3: Send a follow-up request to confirm conversational memory works**

```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What about for children?", "history": [{"role": "user", "content": "What helps with insomnia?"}, {"role": "assistant", "content": "Several approaches may help, such as..."}]}'
```

Expected: a relevant streamed answer that addresses insomnia in children specifically (confirms the condensed standalone question carried context forward).

- [ ] **Step 4: Send an irrelevant query to confirm the no-match path**

```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the capital of France?", "history": []}'
```

Expected: `data: {"no_match": true}` and nothing else.

- [ ] **Step 5: Stop the backend**

Leave it running for Task 9's end-to-end check, or stop with Ctrl+C if pausing here.

---

### Task 8: Frontend scaffold — Next.js, Tailwind, shadcn/ui

**Files:**
- Create: `frontend/` (via `create-next-app`)

**Interfaces:**
- Produces: a running Next.js app at `frontend/` with Tailwind and shadcn/ui configured, ready for Task 9 to add chat components into `frontend/components/` and `frontend/app/page.tsx`.

- [ ] **Step 1: Scaffold the Next.js app**

From the repo root:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

If prompted about anything not covered by the flags (e.g. Turbopack), accept the default by pressing Enter.

- [ ] **Step 2: Verify it builds and runs**

```bash
cd frontend
npm run dev
```

Expected: dev server starts on `http://localhost:3000`; open it in a browser and confirm the default Next.js welcome page loads. Stop with Ctrl+C.

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Expected: creates `components.json` and updates `app/globals.css` with shadcn's CSS variables.

- [ ] **Step 4: Add the components needed for the chat UI**

```bash
npx shadcn@latest add button input scroll-area card avatar
```

Expected: creates files under `frontend/components/ui/`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "Scaffold Next.js frontend with Tailwind and shadcn/ui"
```

---

### Task 9: Frontend — chat UI, SSE streaming, and sources display

**Files:**
- Create: `frontend/lib/chat-stream.ts`
- Create: `frontend/components/chat/chat-message.tsx`
- Create: `frontend/components/chat/chat-window.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: the backend's `POST /chat` SSE wire format from Task 6 (`data: {"token": "..."}`, `data: {"done": true, "sources": [...]}`, `data: {"no_match": true}`).
- Produces: `streamChat(message: string, history: ChatTurn[], onEvent: (event) => void): Promise<void>` in `chat-stream.ts`, consumed by `chat-window.tsx`.

- [ ] **Step 1: Create the SSE streaming client**

Create `frontend/lib/chat-stream.ts`:

```typescript
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatEvent =
  | { token: string }
  | { done: true; sources: string[] }
  | { no_match: true };

export async function streamChat(
  message: string,
  history: ChatTurn[],
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const response = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!response.body) {
    throw new Error("No response body from /chat");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice("data: ".length)) as ChatEvent;
      onEvent(event);
    }
  }
}
```

- [ ] **Step 2: Create the chat message component**

Create `frontend/components/chat/chat-message.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  noMatch?: boolean;
};

export function ChatMessage({ message }: { message: Message }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card
        className={`max-w-[80%] p-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        <p className="whitespace-pre-wrap">
          {message.noMatch ? "Unable to find matching results." : message.content}
        </p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-sm">
            <button
              className="underline opacity-70"
              onClick={() => setSourcesOpen((open) => !open)}
            >
              {sourcesOpen ? "Hide sources" : "Show sources"}
            </button>
            {sourcesOpen && (
              <ul className="mt-1 list-disc pl-4 opacity-70">
                {message.sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create the chat window component**

Create `frontend/components/chat/chat-window.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { streamChat, type ChatTurn } from "@/lib/chat-stream";

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input };
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      await streamChat(userMessage.content, history, (event) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if ("token" in event) {
            next[next.length - 1] = { ...last, content: last.content + event.token };
          } else if ("done" in event) {
            next[next.length - 1] = { ...last, sources: event.sources };
          } else if ("no_match" in event) {
            next[next.length - 1] = { ...last, noMatch: true };
          }
          return next;
        });
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "Something went wrong reaching the server. Please try again.",
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} />
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about integrative medicine topics..."
          disabled={isStreaming}
        />
        <Button type="submit" disabled={isStreaming}>
          Send
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Wire the chat window into the page**

Replace the contents of `frontend/app/page.tsx`:

```typescript
import { ChatWindow } from "@/components/chat/chat-window";

export default function Home() {
  return <ChatWindow />;
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "Build chat UI with SSE streaming and sources display"
```

---

### Task 10: End-to-end manual verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: the full stack from Tasks 1–9.

- [ ] **Step 1: Start the backend**

```bash
source venv/bin/activate
cd backend && uvicorn main:app --reload --port 8000
```

- [ ] **Step 2: Start the frontend in a second terminal**

```bash
cd frontend
npm run dev
```

- [ ] **Step 3: Open `http://localhost:3000` in a browser and verify:**

- Typing a question (e.g. "What helps with insomnia?") and submitting shows the user message, then an assistant message that fills in token-by-token.
- A "Show sources" toggle appears on the assistant message and lists `.md` source paths when clicked.
- Asking a follow-up (e.g. "What about for children?") produces an answer that reflects the earlier context, not a generic/unrelated one.
- Asking something unrelated to the corpus (e.g. "What is the capital of France?") shows "Unable to find matching results." instead of a streamed answer.
- Refreshing the page clears the conversation (confirming no unintended persistence).

- [ ] **Step 4: Fix any issues found before proceeding**

If any check above fails, fix the relevant file (`backend/rag.py`, `backend/main.py`, or the `frontend/components/chat/*` files) and re-verify. Do not proceed to Task 11 until all checks pass.

---

### Task 11: Remove the Streamlit app and finalize

**Files:**
- Delete: `JARDVIS.py`
- Modify: `requirements.txt` (remove `streamlit` if no longer used by any remaining script)

**Interfaces:** none — this is cleanup only, no other task depends on `JARDVIS.py`.

- [ ] **Step 1: Confirm nothing else references JARDVIS.py**

```bash
grep -rl "JARDVIS" --include="*.py" --include="*.md" --include="*.txt" . --exclude-dir={venv,node_modules,.git,frontend/node_modules}
```

Expected: only `JARDVIS.py` itself and possibly `devlog.md` (a historical note, fine to leave).

- [ ] **Step 2: Delete the Streamlit app**

```bash
git rm JARDVIS.py
```

- [ ] **Step 3: Check whether `streamlit` is still needed in the root `requirements.txt`**

```bash
grep -rl "streamlit" --include="*.py" . --exclude-dir={venv,node_modules,.git,frontend/node_modules,backend}
```

If nothing prints (no remaining Python file imports `streamlit`), remove the `streamlit` line and any lines that were only pulled in for it from `requirements.txt`. If unsure whether a dependency is Streamlit-only, leave it — do not guess.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "Remove Streamlit app now that the Next.js frontend replaces it"
```

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feature/web-frontend
```

Do not open or merge the PR without the user's go-ahead — confirm with them first.
