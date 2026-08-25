# Landing Page & Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a landing page at `/`, move the chat interface to `/chat`, give both pages' empty states clickable example questions, and replace the default black/white shadcn theme with a calming teal/green palette.

**Architecture:** Two Next.js App Router routes (`/` and `/chat`) sharing a new `EXAMPLE_QUESTIONS` list and `ExampleQuestionCard` component. Landing-page example clicks navigate to `/chat?q=<question>`, which `ChatWindow` auto-sends once on mount. Visual restyling is entirely through shared CSS custom properties in `globals.css`, so existing chat components (`Card`, `Button`, chat bubbles) pick up the new look with no component-level style changes.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui (existing `button`, `input`, `scroll-area`, `card` components — no new shadcn components needed).

## Global Constraints

- No backend changes — this is frontend-only.
- No new chat behavior — streaming, sources, conversational memory, and error handling from the existing `ChatWindow`/`chat-stream.ts` must be preserved exactly, only relocated/restructured.
- No automated frontend test suite (existing project decision) — verification is manual via the `run` skill.
- This continues on the existing `feature/web-frontend` branch and updates the already-open PR #2 — do not create a new branch or PR.
- `useSearchParams()` in the App Router must be wrapped in a `<Suspense>` boundary or `npm run build` will fail/warn.

---

### Task 1: Shared example-questions list and card component

**Files:**
- Create: `frontend/lib/example-questions.ts`
- Create: `frontend/components/landing/example-question-card.tsx`

**Interfaces:**
- Produces: `EXAMPLE_QUESTIONS: string[]` (from `example-questions.ts`) and `ExampleQuestionCard({ question, onSelect }: { question: string; onSelect: (question: string) => void })` (from `example-question-card.tsx`) — both consumed by Task 2 (chat empty state) and Task 3 (landing page).

- [ ] **Step 1: Create the example questions list**

Create `frontend/lib/example-questions.ts`:

```typescript
export const EXAMPLE_QUESTIONS: string[] = [
  "What helps with insomnia?",
  "What integrative approaches help with anxiety?",
  "What are natural approaches to managing hypertension?",
  "How can I support gut health with IBS?",
];
```

- [ ] **Step 2: Create the example question card component**

Create `frontend/components/landing/example-question-card.tsx`:

```typescript
"use client";

import { Card } from "@/components/ui/card";

export function ExampleQuestionCard({
  question,
  onSelect,
}: {
  question: string;
  onSelect: (question: string) => void;
}) {
  return (
    <button type="button" onClick={() => onSelect(question)} className="text-left">
      <Card className="p-3 text-sm transition-colors hover:bg-accent">
        {question}
      </Card>
    </button>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors. (These files aren't imported anywhere yet, so this just confirms they're syntactically and structurally valid — the build will still show the old single-page app.)

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/example-questions.ts frontend/components/landing/example-question-card.tsx
git commit -m "Add shared example-questions list and card component"
```

---

### Task 2: Move chat to /chat, add query-param auto-send and empty-state cards

**Files:**
- Create: `frontend/app/chat/page.tsx`
- Modify: `frontend/components/chat/chat-window.tsx`

**Interfaces:**
- Consumes: `EXAMPLE_QUESTIONS` and `ExampleQuestionCard` from Task 1.
- Produces: the `/chat` route, which Task 3's landing page links to (plain `/chat` for "Start Chatting", `/chat?q=<encoded question>` for example-question clicks — this exact query param name and encoding is a contract Task 3 depends on).

- [ ] **Step 1: Create the /chat route with a Suspense boundary**

Create `frontend/app/chat/page.tsx`:

```typescript
import { Suspense } from "react";
import { ChatWindow } from "@/components/chat/chat-window";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatWindow />
    </Suspense>
  );
}
```

- [ ] **Step 2: Rewrite chat-window.tsx**

Replace the full contents of `frontend/components/chat/chat-window.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { streamChat, type ChatTurn } from "@/lib/chat-stream";
import { ExampleQuestionCard } from "@/components/landing/example-question-card";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoSubmitted = useRef(false);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
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
          } else if ("error" in event) {
            next[next.length - 1] = { ...last, error: event.error };
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    sendMessage(text);
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      router.replace("/chat");
      sendMessage(q);
    }
    // sendMessage intentionally omitted: on first mount `messages` is always
    // empty, so the closure's history is correct for the auto-sent message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b bg-muted p-4">
        <Link href="/" className="text-lg font-semibold hover:underline">
          MedQuery-AI
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          ⚠️ Not a substitute for professional medical advice.
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        {showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">
              Ask a question about integrative medicine to get started, or try one of these:
            </p>
            <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <ExampleQuestionCard key={q} question={q} onSelect={sendMessage} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))}
          </div>
        )}
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

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors, and no "useSearchParams() should be wrapped in a suspense boundary" warning for the `/chat` route (the `Suspense` wrapper in Step 1 prevents this).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/chat/page.tsx frontend/components/chat/chat-window.tsx
git commit -m "Move chat to /chat route; add query-param auto-send and empty-state example cards"
```

---

### Task 3: Rewrite the landing page

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `EXAMPLE_QUESTIONS` and `ExampleQuestionCard` from Task 1; links to the `/chat` and `/chat?q=<encoded question>` routes from Task 2.

- [ ] **Step 1: Replace the contents of app/page.tsx**

```typescript
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExampleQuestionCard } from "@/components/landing/example-question-card";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";

const CORPUS_TOPICS = [
  "Affective Disorders",
  "Neurology",
  "Infectious Disease",
  "Cardiovascular Disease",
  "Allergy",
  "Metabolic & Endocrine Disorders",
  "Nephrology",
  "Gastrointestinal Disorders",
  "Autoimmune Disease",
  "Gynecology",
  "Urology",
  "Musculoskeletal",
  "Dermatology",
  "Cancer",
  "Substance Abuse",
  "Ophthalmology",
];

export default function Home() {
  const router = useRouter();

  function askExample(question: string) {
    router.push(`/chat?q=${encodeURIComponent(question)}`);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">MedQuery-AI</h1>
        <p className="max-w-xl text-muted-foreground">
          An AI assistant for exploring integrative medicine literature —
          ask a question and get answers grounded in a curated document
          corpus, with sources cited.
        </p>
        <Link href="/chat">
          <Button size="lg">Start Chatting</Button>
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-lg font-semibold">Try asking:</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <ExampleQuestionCard key={q} question={q} onSelect={askExample} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How it works</h2>
        <p className="text-muted-foreground">
          Answers are grounded in a specific collection of Integrative
          Medicine documents — not general web knowledge. When a question
          matches the corpus, the assistant cites its sources; when it
          doesn&apos;t, it says so instead of guessing. The corpus covers:
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3">
          {CORPUS_TOPICS.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        ⚠️ Disclaimer: This tool is not intended to diagnose, treat, or
        replace professional medical advice. Always consult a qualified
        healthcare provider regarding any medical condition.
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "Rewrite landing page with hero, example questions, how-it-works, and disclaimer"
```

---

### Task 4: Teal/green color palette and softer radius

**Files:**
- Modify: `frontend/app/globals.css`

**Interfaces:** none — pure CSS custom-property values consumed automatically by every existing component through the `@theme inline` mapping already in the file (`--color-primary: var(--primary)`, etc.). No component code changes.

- [ ] **Step 1: Replace the `:root` and `.dark` blocks**

In `frontend/app/globals.css`, replace the existing `:root { ... }` block (lines 51-84) with:

```css
:root {
  --background: oklch(0.98 0.01 165);
  --foreground: oklch(0.25 0.02 165);
  --card: oklch(0.99 0.005 165);
  --card-foreground: oklch(0.25 0.02 165);
  --popover: oklch(0.99 0.005 165);
  --popover-foreground: oklch(0.25 0.02 165);
  --primary: oklch(0.55 0.12 175);
  --primary-foreground: oklch(0.98 0.01 165);
  --secondary: oklch(0.94 0.02 175);
  --secondary-foreground: oklch(0.25 0.02 165);
  --muted: oklch(0.95 0.015 170);
  --muted-foreground: oklch(0.45 0.02 170);
  --accent: oklch(0.9 0.03 175);
  --accent-foreground: oklch(0.25 0.02 165);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.88 0.02 170);
  --input: oklch(0.88 0.02 170);
  --ring: oklch(0.55 0.12 175);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 1rem;
  --sidebar: oklch(0.96 0.015 170);
  --sidebar-foreground: oklch(0.25 0.02 165);
  --sidebar-primary: oklch(0.55 0.12 175);
  --sidebar-primary-foreground: oklch(0.98 0.01 165);
  --sidebar-accent: oklch(0.9 0.03 175);
  --sidebar-accent-foreground: oklch(0.25 0.02 165);
  --sidebar-border: oklch(0.88 0.02 170);
  --sidebar-ring: oklch(0.55 0.12 175);
}
```

And replace the existing `.dark { ... }` block with:

```css
.dark {
  --background: oklch(0.18 0.02 175);
  --foreground: oklch(0.95 0.01 165);
  --card: oklch(0.22 0.02 175);
  --card-foreground: oklch(0.95 0.01 165);
  --popover: oklch(0.22 0.02 175);
  --popover-foreground: oklch(0.95 0.01 165);
  --primary: oklch(0.65 0.13 175);
  --primary-foreground: oklch(0.15 0.02 175);
  --secondary: oklch(0.28 0.02 175);
  --secondary-foreground: oklch(0.95 0.01 165);
  --muted: oklch(0.25 0.02 175);
  --muted-foreground: oklch(0.7 0.02 170);
  --accent: oklch(0.3 0.03 175);
  --accent-foreground: oklch(0.95 0.01 165);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.65 0.13 175);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.2 0.02 175);
  --sidebar-foreground: oklch(0.95 0.01 165);
  --sidebar-primary: oklch(0.65 0.13 175);
  --sidebar-primary-foreground: oklch(0.15 0.02 175);
  --sidebar-accent: oklch(0.3 0.03 175);
  --sidebar-accent-foreground: oklch(0.95 0.01 165);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.65 0.13 175);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "Replace default shadcn palette with a teal/green health-wellness theme"
```

---

### Task 5: Manual end-to-end verification and push

**Files:** none (verification only, plus any fixes discovered)

**Interfaces:**
- Consumes: the full redesign from Tasks 1-4, plus the backend from the already-completed web-frontend work (`backend/main.py`, running on port 8000).

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1, from repo root
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Verify in a real browser (use the `run` skill / Playwright) — Landing page (`/`)**

- All four sections render: hero with title/tagline/"Start Chatting" button, example question cards, "How it works" with the topic list, disclaimer footer.
- Clicking an example-question card navigates to `/chat` and that question is auto-sent (streams in, shows sources).
- Clicking "Start Chatting" navigates to `/chat` with an empty conversation.
- Colors read as teal/green, not the old black/white — take a screenshot and visually confirm.

- [ ] **Step 3: Verify `/chat` directly**

- Visiting `/chat` directly (no query param) shows the empty-state example cards, not a blank scroll area.
- Clicking a card in the empty state sends that question.
- The compact header (logo link back to `/`, short disclaimer line) is visible.
- After a few messages, existing behavior is unchanged: streaming, "Show sources" toggle, a follow-up question uses conversational memory, an off-topic question shows "Unable to find matching results."

- [ ] **Step 4: Dark mode spot-check**

- Toggle the OS/browser to dark mode (or use Playwright's `colorScheme: 'dark'` context option), reload both `/` and `/chat`, take screenshots, and confirm text stays readable against backgrounds (no low-contrast combinations from the new dark palette).

- [ ] **Step 5: Fix any issues found**

If any check above fails or looks wrong (e.g. a color reads as too low-contrast, the auto-send double-fires, the Suspense fallback flashes oddly), fix the relevant file from Tasks 1-4 and re-verify. Do not proceed to Step 6 until everything above passes.

- [ ] **Step 6: Push the updated branch**

```bash
git push
```

PR #2 updates automatically since it tracks `feature/web-frontend`. Do not merge without the user's go-ahead.
