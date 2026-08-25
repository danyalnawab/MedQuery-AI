# Chat Interface & Design System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/chat` interface (avatars, elevation, thinking indicator, auto-scroll, redesigned sources display, copy button, auto-resizing composer) and extend the shared design system (a `Badge` component, a shared `Logo` component, `Card` elevation) so both routes read as one cohesive, icon-driven product instead of a polished landing page leading into a bare chat screen.

**Architecture:** Two new small `ui/` primitives (`Badge`, and a `shadow-sm` addition to `Card`) plus a new `layout/Logo` component form the shared foundation. `chat-message.tsx` and a new `chat-composer.tsx` are rebuilt on top of that foundation; `chat-window.tsx` wires them together with new auto-scroll behavior. The landing page gets two small consumer-side swaps (`Logo` in the hero, `Badge` for corpus topics) with no structural changes. `lucide-react` (already an installed dependency) supplies all icons.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, `@base-ui/react` primitives, `class-variance-authority`, `lucide-react` (already installed, previously unused).

## Global Constraints

- No backend changes — this is frontend-only.
- No new chat behavior — streaming, sources, conversational memory, and error/no-match handling in `ChatWindow`/`chat-stream.ts` must be preserved exactly; only presentation changes.
- No dark mode toggle — out of scope for this pass (per design decision).
- No markdown rendering — assistant messages stay plain text (`whitespace-pre-wrap`).
- No new npm dependencies — every icon/pattern is built from what's already installed (`lucide-react`, `class-variance-authority`, `@base-ui/react`).
- No automated frontend test suite (existing project decision) — verification is manual via the `run` skill; `npm run build` after each task is the automated correctness gate.
- This continues on the existing `feature/web-frontend` branch and updates the already-open PR #2 — do not create a new branch or PR, and do not push/merge without the user's go-ahead.

---

### Task 1: `Badge` component

**Files:**
- Create: `frontend/components/ui/badge.tsx`

**Interfaces:**
- Produces: `Badge({ variant?: "default" | "secondary" | "outline", className?, ...props }: React.ComponentProps<"span">)` — consumed by Task 5 (chat sources) and Task 8 (landing corpus topics).

- [ ] **Step 1: Create the Badge component**

Create `frontend/components/ui/badge.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors. (Not imported anywhere yet — this only confirms the file is valid.)

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/badge.tsx
git commit -m "Add Badge component"
```

---

### Task 2: Shared `Logo` component

**Files:**
- Create: `frontend/components/layout/logo.tsx`

**Interfaces:**
- Produces: `Logo({ size?: "default" | "lg", asLink?: boolean }: { size?: "default" | "lg"; asLink?: boolean })` — consumed by Task 7 (chat header) and Task 8 (landing hero).

- [ ] **Step 1: Create the Logo component**

Create `frontend/components/layout/logo.tsx`:

```tsx
import Link from "next/link"
import { Leaf } from "lucide-react"

import { cn } from "@/lib/utils"

function LogoMark({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading font-semibold text-foreground",
        size === "lg" ? "text-3xl sm:text-4xl" : "text-lg"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
          size === "lg" ? "size-10" : "size-7"
        )}
      >
        <Leaf className={size === "lg" ? "size-5" : "size-4"} />
      </span>
      MedQuery-AI
    </span>
  )
}

export function Logo({
  size = "default",
  asLink = true,
}: {
  size?: "default" | "lg"
  asLink?: boolean
}) {
  if (!asLink) {
    return <LogoMark size={size} />
  }
  return (
    <Link
      href="/"
      aria-label="MedQuery-AI home"
      className="inline-flex transition-opacity hover:opacity-80"
    >
      <LogoMark size={size} />
    </Link>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/logo.tsx
git commit -m "Add shared Logo component"
```

---

### Task 3: `Card` elevation

**Files:**
- Modify: `frontend/components/ui/card.tsx:14-19`

**Interfaces:** none — pure className change, picked up automatically by every existing `Card` consumer (chat bubbles, example-question cards).

- [ ] **Step 1: Add a shadow to the Card className**

In `frontend/components/ui/card.tsx`, find the `Card` function's `className` (the `cn(...)` call starting with `"group/card flex flex-col..."`) and add `shadow-sm` alongside the existing `ring-1 ring-foreground/10`:

```tsx
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/card.tsx
git commit -m "Add subtle shadow to Card for elevation"
```

---

### Task 4: `ThinkingIndicator` component

**Files:**
- Create: `frontend/components/chat/thinking-indicator.tsx`

**Interfaces:**
- Produces: `ThinkingIndicator()` (no props) — consumed by Task 5 (`chat-message.tsx`).

- [ ] **Step 1: Create the thinking indicator**

Create `frontend/components/chat/thinking-indicator.tsx`:

```tsx
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" role="status" aria-label="Thinking">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/thinking-indicator.tsx
git commit -m "Add ThinkingIndicator component"
```

---

### Task 5: `ChatComposer` component

**Files:**
- Create: `frontend/components/chat/chat-composer.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button` (existing, `size="icon"` variant).
- Produces: `ChatComposer({ value, onChange, onSubmit, isStreaming }: { value: string; onChange: (value: string) => void; onSubmit: () => void; isStreaming: boolean })` — consumed by Task 7 (`chat-window.tsx`). `onSubmit` is called with no arguments; the caller reads the current `value` itself (mirrors the existing `handleSubmit` pattern in `chat-window.tsx`).

- [ ] **Step 1: Create the composer**

Create `frontend/components/chat/chat-composer.tsx`:

```tsx
"use client"

import { useEffect, useRef } from "react"
import { ArrowUp, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_HEIGHT_PX = 160

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const canSend = value.trim().length > 0 && !isStreaming

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
      className="flex items-end gap-2 border-t bg-background p-3 sm:p-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about integrative medicine topics..."
        aria-label="Ask a question"
        rows={1}
        disabled={isStreaming}
        className={cn(
          "max-h-40 min-h-8 w-full flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30"
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!canSend}
        aria-label={isStreaming ? "Waiting for response" : "Send message"}
      >
        {isStreaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/chat-composer.tsx
git commit -m "Add ChatComposer with auto-resizing textarea"
```

---

### Task 6: Rewrite `chat-message.tsx`

**Files:**
- Modify: `frontend/components/chat/chat-message.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Badge` (Task 1), `Card` (Task 3, now with shadow), `ThinkingIndicator` (Task 4), `cn` from `@/lib/utils`.
- Produces: `ChatMessage({ message, isThinking }: { message: Message; isThinking?: boolean })` — the `Message` type (`{ role, content, sources?, noMatch?, error? }`) is unchanged from today and is consumed by Task 7 (`chat-window.tsx`), which now also passes the new `isThinking` prop.

- [ ] **Step 1: Replace the full contents of chat-message.tsx**

Replace `frontend/components/chat/chat-message.tsx`:

```tsx
"use client"

import { useState } from "react"
import { AlertTriangle, Check, ChevronDown, Copy, FileText, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ThinkingIndicator } from "./thinking-indicator"

export type Message = {
  role: "user" | "assistant"
  content: string
  sources?: string[]
  noMatch?: boolean
  error?: string
}

export function ChatMessage({
  message,
  isThinking = false,
}: {
  message: Message
  isThinking?: boolean
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"
  const isAlert = Boolean(message.error || message.noMatch)

  async function copyContent() {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("flex items-start gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <Card
        className={cn(
          "group/message max-w-[85%] gap-1.5 p-3 sm:max-w-[75%]",
          isUser ? "bg-primary text-primary-foreground" : isAlert ? "bg-destructive/10" : "bg-muted"
        )}
      >
        {isThinking ? (
          <ThinkingIndicator />
        ) : (
          <>
            <div className="flex items-start gap-2">
              {isAlert && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />}
              <p className="whitespace-pre-wrap">
                {message.error
                  ? message.error
                  : message.noMatch
                    ? "Unable to find matching results."
                    : message.content}
              </p>
            </div>
            {!isUser && !isAlert && message.content && (
              <button
                type="button"
                onClick={copyContent}
                aria-label={copied ? "Copied" : "Copy message"}
                className="flex w-fit items-center gap-1 self-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 hover:text-foreground focus-visible:opacity-100"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setSourcesOpen((open) => !open)}
                  aria-expanded={sourcesOpen}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="size-3.5" />
                  {sourcesOpen
                    ? "Hide sources"
                    : `${message.sources.length} source${message.sources.length > 1 ? "s" : ""}`}
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", sourcesOpen && "rotate-180")}
                  />
                </button>
                {sourcesOpen && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.map((source, i) => (
                      <Badge key={`${source}-${i}`} variant="secondary">
                        {source}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: fails at this point — `chat-window.tsx` (Task 7, not yet done) still imports the old `ChatMessage` shape but doesn't pass `isThinking`, which is fine since it's optional (defaults to `false`); the build should actually succeed here since nothing changed in the call signature besides an optional prop. Expected: succeeds, zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/chat-message.tsx
git commit -m "Redesign chat message bubbles with avatars, sources pills, and copy button"
```

---

### Task 7: Rewrite `chat-window.tsx`

**Files:**
- Modify: `frontend/components/chat/chat-window.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Logo` (Task 2), `ChatComposer` (Task 5), `ChatMessage`/`Message` (Task 6).
- Produces: no change to the `/chat` route's external behavior — `ChatWindow` remains the default export consumed by `frontend/app/chat/page.tsx` (unmodified).

- [ ] **Step 1: Replace the full contents of chat-window.tsx**

Replace `frontend/components/chat/chat-window.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { Logo } from "@/components/layout/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer } from "./chat-composer"
import { ChatMessage, type Message } from "./chat-message"
import { streamChat, type ChatTurn } from "@/lib/chat-stream"
import { ExampleQuestionCard } from "@/components/landing/example-question-card"
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions"

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAutoSubmitted = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = { role: "user", content: text }
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }])
    setIsStreaming(true)

    try {
      await streamChat(userMessage.content, history, (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if ("token" in event) {
            next[next.length - 1] = { ...last, content: last.content + event.token }
          } else if ("done" in event) {
            next[next.length - 1] = { ...last, sources: event.sources }
          } else if ("no_match" in event) {
            next[next.length - 1] = { ...last, noMatch: true }
          } else if ("error" in event) {
            next[next.length - 1] = { ...last, error: event.error }
          }
          return next
        })
      })
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "Something went wrong reaching the server. Please try again.",
        }
        return next
      })
    } finally {
      setIsStreaming(false)
    }
  }

  function handleSubmit() {
    const text = input
    setInput("")
    sendMessage(text)
  }

  useEffect(() => {
    const q = searchParams.get("q")
    if (q && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true
      router.replace("/chat")
      sendMessage(q)
    }
    // sendMessage intentionally omitted: on first mount `messages` is always
    // empty, so the closure's history is correct for the auto-sent message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  const showEmptyState = messages.length === 0
  const lastIndex = messages.length - 1

  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Logo />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">Not a substitute for professional medical advice.</span>
          <span className="sm:hidden">Not medical advice.</span>
        </p>
      </div>
      <ScrollArea className="flex-1">
        {showEmptyState ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
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
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {messages.map((message, i) => (
              <ChatMessage
                key={i}
                message={message}
                isThinking={
                  isStreaming &&
                  i === lastIndex &&
                  message.role === "assistant" &&
                  message.content === "" &&
                  !message.noMatch &&
                  !message.error
                }
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
      <ChatComposer value={input} onChange={setInput} onSubmit={handleSubmit} isStreaming={isStreaming} />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build
```

Expected: succeeds, zero TypeScript errors, no `useSearchParams()` Suspense-boundary warning for `/chat`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/chat-window.tsx
git commit -m "Redesign chat window: sticky header, auto-scroll, new composer"
```

---

### Task 8: Landing page touch-ups

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 2), `Badge` (Task 1). No change to `EXAMPLE_QUESTIONS`/`ExampleQuestionCard` usage or the `/chat` and `/chat?q=` navigation contract.

- [ ] **Step 1: Replace the full contents of app/page.tsx**

Replace `frontend/app/page.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/layout/logo"
import { ExampleQuestionCard } from "@/components/landing/example-question-card"
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions"

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
]

export default function Home() {
  const router = useRouter()

  function askExample(question: string) {
    router.push(`/chat?q=${encodeURIComponent(question)}`)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1>
          <Logo size="lg" asLink={false} />
        </h1>
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
        <div className="flex flex-wrap gap-2">
          {CORPUS_TOPICS.map((topic) => (
            <Badge key={topic} variant="secondary">
              {topic}
            </Badge>
          ))}
        </div>
      </section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        ⚠️ Disclaimer: This tool is not intended to diagnose, treat, or
        replace professional medical advice. Always consult a qualified
        healthcare provider regarding any medical condition.
      </footer>
    </div>
  )
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
git commit -m "Use shared Logo and Badge chips on the landing page"
```

---

### Task 9: Manual end-to-end verification and push

**Files:** none (verification only, plus any fixes discovered)

**Interfaces:**
- Consumes: the full redesign from Tasks 1–8, plus the backend (`backend/main.py`, running on port 8000).

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1, from repo root
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Verify in a real browser (use the `run` skill / Playwright) — `/chat` core flow**

- Sending a message shows the `ThinkingIndicator` (pulsing dots) immediately, then replaces it with streamed tokens as they arrive.
- The view auto-scrolls to keep the newest content in view while streaming and after new messages are added.
- Sources: the "N sources" button expands into a pill/badge list; `aria-expanded` toggles (inspect via accessibility tree or DOM).
- Copy button appears on hover/focus over an assistant message, copies the message text, and shows the checkmark + "Copied" for ~2 seconds.
- Assistant messages show the small avatar icon on the left; user messages remain right-aligned with no avatar.

- [ ] **Step 3: Verify the composer**

- Typing a long question grows the textarea up to its max height, then scrolls internally.
- Pressing `Enter` sends the message; pressing `Shift+Enter` inserts a newline instead.
- The send button is disabled when the field is empty, shows a spinner while streaming, and is disabled during streaming.

- [ ] **Step 4: Verify empty/error/no-match states**

- Visiting `/chat` directly shows the empty-state example cards with visible card elevation (shadow).
- Clicking an empty-state card sends that question.
- Ask an off-topic question (e.g. "What's the best pizza topping?") — the response renders with the distinct warning/alert styling (amber-tinted background, alert-triangle icon), not as a normal answer bubble.
- Stop the backend server and send a message — the network-error message also renders with the distinct alert styling.
- Restart the backend before continuing.

- [ ] **Step 5: Verify the landing page and shared Logo**

- `/` renders the `Logo` (icon + wordmark) in place of the old plain text heading, inside an `<h1>`.
- Corpus topics render as wrapped pill chips, not a multi-column text list.
- The `/chat` header shows the same `Logo` mark, and clicking it navigates back to `/`.

- [ ] **Step 6: Responsive and keyboard checks**

- At a mobile viewport (~375px wide): header, message bubbles (max ~85% width), and composer all fit without horizontal scrolling; the disclaimer text shortens to "Not medical advice."
- At desktop width: message bubbles cap at ~75% width.
- Tab through the page: composer textarea → send button → sources toggle buttons → copy buttons, each with a visible focus ring.

- [ ] **Step 7: Fix any issues found**

If any check above fails or looks wrong (e.g. auto-scroll doesn't trigger, a color reads as too low-contrast, the thinking indicator doesn't clear on error), fix the relevant file from Tasks 1–8 and re-verify. Do not proceed to Step 8 until everything above passes.

- [ ] **Step 8: Report readiness to push**

Do not run `git push` as part of this task. Report that all checks in Steps 2–7 passed and the branch is ready to push; the controller confirms with the user before pushing (per this plan's Global Constraints — no push without the user's go-ahead). PR #2 would update automatically since it tracks `feature/web-frontend`, once pushed.
