# Chat Interface & Design System Redesign — Design

## Context

The MedQuery-AI landing page (`/`) was redesigned recently (spec: `2026-08-25-landing-page-redesign-design.md`) — hero, example-question cards, how-it-works, disclaimer footer, teal/green palette. The chat interface (`/chat`) that visitors land on after clicking through is still the original bare-bones implementation from the initial frontend build: plain text bubbles, a single-line input, no loading feedback while the model is thinking, no auto-scroll during streaming, and a plain-text "Show/Hide sources" toggle. `lucide-react` is already an installed dependency but is used nowhere in the app.

This spec covers a redesign of `/chat` plus the shared design-system pieces (icons, elevation, shared `Logo` component) needed to make it feel like one cohesive product with the landing page, rather than a polished front door leading into an unfinished room.

## Goals

- Redesign the chat interface's visual and interaction design: message bubbles, avatars, streaming/thinking indicator, auto-scroll, sources display, copy-to-clipboard, composer.
- Put the already-installed `lucide-react` icon set to use consistently across both routes (logo mark, navigation, sources, copy, alerts).
- Add elevation (shadow scale) to the shared `Card` usage so the interface reads as layered rather than flat.
- Extract a shared `Logo` component (icon + wordmark) used identically on the landing page and the chat header, replacing the two independent copies.
- Light touch-up to the landing page for visual consistency with the new icon system: corpus topics become pill/badge chips, and the shared `Logo` replaces the plain text heading in the hero.
- Full responsive pass on the chat page (mobile bubble width, composer safe-area, header/composer padding).
- Accessibility pass: `aria-label`s on icon-only buttons, `aria-expanded` on the sources toggle, textarea labeling, contrast check on the teal palette's text/background pairs.

## Non-goals

- No dark mode toggle. The `.dark` CSS tokens remain defined but unreachable, as today — explicitly deferred.
- No markdown rendering for assistant messages. Current plain-text (`whitespace-pre-wrap`) rendering is adequate for the prose-style answers the backend produces; adding a markdown renderer would be a new dependency for marginal benefit.
- No structural rebuild of the landing page — section order, copy, and example-question cards stay as they are; only the two consistency touch-ups listed above.
- No backend changes. No new chat behavior (multi-session history, auth, persistence).
- No automated visual regression testing — verified manually per the project's existing testing approach.

## Architecture

```
frontend/components/
├── layout/
│   └── logo.tsx              Shared icon + wordmark (new) — used on landing hero + chat header
├── chat/
│   ├── chat-window.tsx       Modified: sticky header w/ Logo, auto-scroll, composer textarea
│   ├── chat-message.tsx      Modified: avatar, elevation, thinking indicator, sources redesign, copy button
│   ├── thinking-indicator.tsx  New: animated three-dot pulse shown while awaiting first token
│   └── chat-composer.tsx     New: auto-resizing textarea + send button, extracted from chat-window
├── landing/
│   └── example-question-card.tsx  Unchanged
└── ui/
    ├── card.tsx               Modified: add shadow to existing ring-based elevation
    └── badge.tsx               New: shadcn-pattern pill component for corpus topics + sources list

frontend/app/
├── page.tsx                  Modified: Logo in hero, corpus topics as Badge chips
└── chat/page.tsx             Unchanged (still just renders ChatWindow in Suspense)
```

`chat-composer.tsx` is split out of `chat-window.tsx` because the auto-resize textarea logic (height measurement, keydown handling for Enter/Shift+Enter) is a distinct, independently testable unit from message-list/streaming orchestration — keeping `chat-window.tsx` focused on state and data flow.

## Chat interface redesign

**Header** — sticky bar at the top of `/chat`: the shared `Logo` (icon + "MedQuery-AI", links to `/`) on the left, the existing short disclaimer line on the right (icon + text, replacing the emoji), subtle bottom border + background matching the header treatment already established on the landing page.

**Message list** (`chat-message.tsx`):
- Assistant messages: small circular avatar (leaf/sparkle icon, primary-colored background) to the left of the bubble. User messages: right-aligned, primary-colored bubble, no avatar — same left/right pattern as today, restyled.
- Bubbles get a soft shadow (`shadow-sm`) in addition to the existing card treatment, for depth against the background.
- **Thinking indicator**: when the last message is the assistant's, `isStreaming` is true, and `content === ""`, render the new `ThinkingIndicator` (three dots, staggered pulse animation via CSS) in place of an empty bubble.
- **Auto-scroll**: the message container scrolls to bottom on every message-array update and on each streamed token append, via a ref to a bottom sentinel element and `scrollIntoView` (or direct `scrollTop` assignment on the scroll viewport) in a `useEffect`.
- **Sources**: replace the plain underlined toggle button with a small ghost button — file icon + "N sources" + chevron that rotates on expand — `aria-expanded` reflects state. Expanded content renders each source as a small pill (`Badge` component) instead of a bare bulleted list.
- **Copy button**: icon-only button (copy icon → check icon for ~2s after click) in the corner of assistant messages, visible on hover/focus (always visible on touch/mobile widths since there's no hover). Copies `message.content` via `navigator.clipboard.writeText`.
- **Error / no-match states**: rendered with a muted amber/warning tone and an alert-triangle icon, visually distinct from a normal answer bubble, so a user immediately recognizes "something didn't work" vs. a real answer.

**Composer** (`chat-composer.tsx`):
- Auto-resizing `<textarea>`: starts at one line, grows with content up to a max height (~6 lines), then becomes internally scrollable.
- `Enter` submits (when not composing/IME and not empty); `Shift+Enter` inserts a newline.
- Send button becomes an icon button (arrow-up in a circle); shows a small spinner in place of the icon while `isStreaming`, and is disabled when the input is empty or a response is streaming.
- Textarea gets an `aria-label` ("Ask a question") since there's no visible `<label>` element.

**Empty state**: unchanged structurally (same example-question card grid per the existing landing↔chat handoff spec) but the cards pick up the new `Card` elevation automatically since that's a shared-component change.

## Design system extensions

- **Icons** (`lucide-react`, already installed): a fixed, meaning-to-icon mapping used everywhere it applies rather than ad hoc per component — logo mark, `ArrowLeft`/back, `Send`, `Copy`/`Check`, `ChevronDown` (sources), `FileText` (sources), `AlertTriangle` (disclaimer, error, no-match).
- **Elevation**: `components/ui/card.tsx` gains a `shadow-sm` alongside its existing `ring-1 ring-foreground/10`, so every `Card` consumer (chat bubbles, example-question cards, sources pills if built on `Card`) picks up depth with no per-usage change.
- **`Badge` component** (new, `components/ui/badge.tsx`): small pill following the same `cva` + `data-slot` pattern as the existing `Button`/`Card` primitives (variant: default/secondary/outline), used for corpus topics on the landing page and the sources list in chat.
- **`Logo` component** (new, `components/layout/logo.tsx`): icon + "MedQuery-AI" wordmark, optionally wrapped in a `Link` to `/`. Replaces the plain `<h1>MedQuery-AI</h1>` text in the landing hero and the `<Link>MedQuery-AI</Link>` text in the chat header — same visual mark in both places instead of two independently-styled copies.

## Landing page touch-ups (light touch, per scope)

- `CORPUS_TOPICS` renders as `Badge` chips in a flex-wrap row instead of a plain multi-column text list — same content, better scannability, visually consistent with the new sources-pill treatment in chat.
- Hero heading swaps the plain "MedQuery-AI" text for the shared `Logo` component (larger size variant).
- No other changes to `page.tsx` — section order, copy, example-question cards, and the "Start Chatting" CTA stay exactly as they are today.

## Responsive

- Message bubble `max-width`: ~85% on mobile (`< sm`), ~75% at `sm` and above (currently a flat 80%).
- Header and composer padding steps down at the `sm` breakpoint to reclaim space on small screens.
- Composer bottom padding accounts for `env(safe-area-inset-bottom)` so it isn't obscured by mobile browser chrome / home indicator.
- Corpus topic chips wrap naturally at all widths (flex-wrap, no fixed column count).

## Accessibility

- Every icon-only button (`copy`, `send`, back-via-logo) gets an `aria-label`.
- Sources toggle button gets `aria-expanded={sourcesOpen}`.
- Composer textarea gets `aria-label="Ask a question"`.
- Focus-visible rings preserved from the existing `@base-ui/react` primitives (`Button`, `Input`→textarea equivalent) — no change needed there, just verified after the visual restyle.
- Teal palette text/background pairs (`--foreground`/`--background`, `--primary-foreground`/`--primary`, `--muted-foreground`/`--muted`, `--muted-foreground`/`--background`) checked for WCAG AA contrast during implementation; any pair that fails gets its lightness adjusted.

## Data flow

No changes to the request/response data flow described in the existing specs (`2026-08-24-web-frontend-design.md`, `2026-08-25-landing-page-redesign-design.md`) — this is a presentation-layer redesign. The only new client-side state is: thinking-indicator visibility (derived from existing `isStreaming` + last-message content, not new state), copy-button "copied" flag (local, 2s timeout), and textarea height (derived from `scrollHeight`, not stored state).

## Testing approach

No automated frontend test suite, consistent with the existing project decision. Manual verification via the `run` skill (Playwright + real browser), covering:
- Sending a message shows the thinking indicator, then streams tokens with the view auto-scrolling to follow.
- Sources expand/collapse correctly and show the pill-styled source list; `aria-expanded` toggles.
- Copy button copies the assistant's message text and shows the checkmark confirmation.
- Composer: typing wraps/grows the textarea up to its max height; `Enter` sends; `Shift+Enter` inserts a newline; the send button disables while streaming and while empty.
- Empty state still shows the example-question cards with the new elevation; clicking one still sends correctly.
- Error path (backend unreachable) renders the distinct error styling.
- No-match path (off-topic question) renders the distinct no-match styling.
- Landing page: corpus topics render as chips; the shared `Logo` renders correctly in both the hero and the chat header and links back to `/` from chat.
- Responsive check at mobile width (~375px) and desktop width for both routes.
- Keyboard-only pass: tab order through composer → send button → sources toggles → copy buttons, with visible focus rings throughout.

## Rollout

Continues on the existing `feature/web-frontend` branch (PR #2 still open, unmerged), consistent with how the landing-page redesign was handled — reviewers see one complete, polished frontend in a single PR rather than a rebase-heavy trail of partial redesigns.
