# Landing Page & Visual Redesign — Design

## Context

The MedQuery-AI frontend (built in the still-open `feature/web-frontend` branch, PR #2) currently has a single route: the chat interface lives directly at `/`, styled with unmodified shadcn defaults (plain black/white/gray). The user's feedback: "The UI looks horrible... when you haven't chatted yet the page looks too blank."

This spec covers a redesign to fix both problems: a real landing page that gives the empty state something to show, and a visual style pass that moves off the default shadcn theme. This work continues on `feature/web-frontend` rather than a new branch, since the frontend hasn't merged yet — reviewers will see the finished, polished frontend in one PR.

## Goals

- Add a real landing page (`/`) that introduces the project, so a first-time visitor sees a complete page instead of an empty chat box.
- Move the chat interface to its own route (`/chat`).
- Give the chat page's empty state (before any messages) something to show too, not just the landing page.
- Replace the default black/white shadcn palette with a calming health/wellness color scheme.
- Keep all existing chat functionality (streaming, sources, conversational memory, error handling) unchanged — this is a presentation-layer redesign, not a behavior change.

## Non-goals

- No backend changes.
- No new chat behavior (multi-session history, auth, persistence) — out of scope, unrelated to this redesign.
- No automated visual regression testing — verified manually per the project's existing testing approach.

## Architecture

Two routes replace the current single-page app:

```
frontend/app/
├── page.tsx              Landing page (was: rendered ChatWindow directly)
├── chat/
│   └── page.tsx          Chat page (new) — renders ChatWindow
└── globals.css           Updated color tokens (teal/green palette)

frontend/lib/
└── example-questions.ts  Shared list of sample prompts (new)

frontend/components/
├── landing/
│   └── (hero, example-question-card, how-it-works sections — new)
└── chat/
    ├── chat-window.tsx   Modified: reads ?q= param, shows empty-state cards
    ├── chat-message.tsx  Unchanged
    └── ...
```

### Example-question handoff

Both the landing page and the chat page's empty state render clickable cards built from the same `example-questions.ts` list, so they can't drift out of sync.

- Landing page cards: clicking one navigates to `/chat?q=<encoded question>`.
- Chat page: on mount, if a `q` query param is present, it is submitted exactly once (same code path as typing it and hitting Send), then the param is not re-submitted on subsequent renders.
- Chat page empty-state cards (shown when there are zero messages and no `q` param triggered a send yet): clicking one submits that question directly, same as typing it.
- A plain "Start Chatting" button/link on the landing page navigates to `/chat` with no query param — lands on the normal empty state.

## Landing page (`/`) — full hero layout

1. **Hero** — "MedQuery-AI" title, one-line tagline ("An AI assistant for exploring integrative medicine literature"), a "Start Chatting" button linking to `/chat`.
2. **Example questions** — 4-6 cards, each a real question matched to actual corpus content (e.g. "What helps with insomnia?", "What integrative approaches help with anxiety?", "What are natural approaches to managing hypertension?", "How can I support gut health with IBS?"). Clicking navigates to `/chat?q=...` per the handoff above.
3. **How it works** — a short paragraph explaining that answers are grounded in a specific Integrative Medicine document corpus (not general web knowledge), followed by a list of the corpus's topic sections (Affective Disorders, Neurology, Infectious Disease, Cardiovascular Disease, Allergy, Metabolic & Endocrine Disorders, Nephrology, Gastrointestinal Disorders, Autoimmune Disease, Gynecology, Urology, Musculoskeletal, Dermatology, Cancer, Substance Abuse, Ophthalmology).
4. **Disclaimer footer** — the full medical disclaimer text (moved here from its current cramped spot in the chat header): "⚠️ Disclaimer: This tool is not intended to diagnose, treat, or replace professional medical advice. Always consult a qualified healthcare provider regarding any medical condition."

## Chat page (`/chat`)

- **Header**: compact — a back-to-home link/logo, "MedQuery-AI" title, and a short one-line disclaimer reminder (e.g. "Not a substitute for professional medical advice.") — kept here (not only on the landing page) since a visitor could land directly on `/chat` via a bookmarked or shared URL without ever seeing the landing page.
- **Empty state** (zero messages, no pending `?q=` auto-send): the same example-question cards used on the landing page, centered in the message area, replacing blank space.
- **Populated state**: unchanged from the current implementation — chat bubbles, streaming, expandable sources, error messages.

## Visual style

Replace the `:root` and `.dark` color tokens in `frontend/app/globals.css` with a teal/green health-palette (exact `oklch` values to be chosen during implementation, following accessible-contrast practice for text-on-background pairs), covering at minimum: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--border`, `--card`. Increase `--radius` from the current `0.625rem` for a softer, more rounded feel across buttons, cards, and chat bubbles — since these are shared tokens, existing chat components pick up the new look automatically with no component-level changes needed. Both light and dark variants get updated so the app stays theme-aware.

## Data flow (new: landing → chat handoff)

1. User clicks an example-question card on `/` (or types nothing and clicks "Start Chatting").
2. Router navigates to `/chat` (with `?q=...` if a specific question was clicked).
3. On mount, `ChatWindow` checks for a `q` param. If present, it calls the same submit path used for manual input, then clears/ignores the param so it doesn't resubmit on re-render (e.g. via a `useRef` guard or by replacing the URL without the param).
4. From there, behavior is identical to the existing chat flow (SSE streaming, sources, conversational history for subsequent messages).

## Testing approach

No automated frontend test suite, consistent with the existing project decision (spec: `2026-08-24-web-frontend-design.md`). Manual verification via the `run` skill (Playwright + real browser), covering:
- Landing page renders all four sections.
- Clicking an example-question card navigates to `/chat` and auto-sends that question.
- "Start Chatting" navigates to `/chat` with an empty state showing the card grid.
- Clicking a card in the chat empty state sends that question.
- The disclaimer is visible on both the landing page (full) and chat page (short form).
- Light and dark mode both render sanely with the new palette (spot-check contrast/readability).
- Existing chat behavior (streaming, sources, follow-up memory, off-topic no-match, error handling) still works unchanged — this is a regression check, not new coverage.

## Rollout

Continues on the existing `feature/web-frontend` branch (not a new branch, per the user's choice — PR #2 is still open and unmerged). Existing PR #2 gets updated with these commits rather than a new PR being opened.
