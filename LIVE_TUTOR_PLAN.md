# Live Tutor — Project Plan

**Status:** Active build. Started 2026-05-12.
**Owner:** Wes
**Reference doc:** this is the source of truth for the Live Tutor feature. When in doubt about scope, decisions, or architecture, look here first.

---

## Vision

An AI tutor that **looks at the user's actual brokerage screen** — Robinhood, Fidelity, Schwab, whatever they have open — and teaches them what they're seeing in real time. The AI explains buttons, charts, metrics, and concepts using vision, anchored to the user's own portfolio context.

**The category-defining frame:** *every other "AI for investing" tool is a chat box that lives in its own UI. This one lives in YOUR UI — wherever you already invest.*

It plugs directly into the Practice curriculum: when the AI sees a candlestick chart on Fidelity, it can say "remember Lesson 4? Tap to review."

## What we're building (MVP)

A new **Live Tutor** tab inside the existing Panko Risk Lab web app. No Electron, no desktop install — uses `navigator.mediaDevices.getDisplayMedia()` (the browser's built-in screen-share API, same one Google Meet uses).

### User flow

1. User clicks "Live Tutor" in the sidebar
2. Big "Share your screen" CTA — explains what will happen, asks for consent
3. User clicks → browser native picker (whole screen / specific app / tab)
4. Sharing starts. Snapshot is taken from the video stream on demand (no continuous capture for cost reasons).
5. User asks a question (text input or "voice" stretch goal)
6. App snapshots the current frame → sends image + question to backend
7. Backend calls Claude Opus 4.7 with vision → streams response
8. Chat shows answer, references any related Practice lesson
9. User can "Stop sharing" anytime; nothing persisted server-side

### Out of scope for MVP

- Mobile / phone pairing (v3 — websocket sync between phone and desktop)
- Voice input (stretch — Web Speech API or Whisper)
- Continuous/auto-trigger capture (cost prohibitive at v1)
- On-screen annotations / overlays (would need Electron or a browser extension)
- Persistent session history (chat is ephemeral)
- Multi-account profile sync

## Architecture

### Frontend (existing React app)

- New page: `frontend/src/components/LiveTutorPage.jsx`
- Lazy-loaded route in `App.jsx`
- Sidebar nav item with `Eye` or `Camera` lucide icon
- Screen share via `getDisplayMedia({ video: true, audio: false })`
- Hidden `<video>` element streams the screen; on user "Ask" click we paint the current frame to a `<canvas>` and grab a JPEG data URL
- POST to `/api/tutor` with `{ messages, screenshot_base64 }`
- Stream response back via SSE (same pattern as existing `/api/chat`)

### Backend (existing FastAPI)

- New endpoint: `POST /api/tutor` in `backend/main.py`
- Uses Anthropic SDK (already wired)
- Model: `claude-opus-4-7` (vision-capable)
- Streaming via Server-Sent Events
- Image is included in the user message as a base64 content block
- System prompt: framed as "you are a friendly Panko investing tutor; the user is showing you their screen; explain in plain English; cite Panko Practice lessons when relevant"

### Cost model

- Claude Opus 4.7 vision: ~$0.005–$0.015 per screenshot at typical resolution
- MVP uses **manual capture only** (one image per question) → ~$0.01–$0.05 per question
- At 10 questions per session, ~$0.10–$0.50/user/session
- Sustainable; can downgrade to Haiku 4.5 later for 5× cost reduction if quality holds

## Phases

### Phase 1 — MVP (this sprint)

- [ ] Save this plan doc
- [ ] Sidebar nav: "Live Tutor" item
- [ ] LiveTutorPage.jsx: share-screen button + chat panel
- [ ] Frame capture from video → base64 JPEG
- [ ] Backend `/api/tutor` SSE endpoint with Claude vision
- [ ] Style to match existing Duolingo/blue aesthetic
- [ ] Disclaimer banner (educational, not financial advice)
- [ ] Privacy callout (your screen is shared with Anthropic when you ask; nothing stored)
- [ ] Build + ship to prl-seven.vercel.app

### Phase 2 — Polish

- [x] Voice input (Web Speech API → text → existing flow) — shipped 2026-05-12
- [x] "Related lesson" card that pulls from Practice when AI mentions a concept — shipped 2026-05-12
- [x] Better empty / pre-share state with example questions — shipped in Phase 1
- [x] Token usage indicator (estimated $$ per session) — shipped 2026-05-12
- [x] Stop-share auto-detection (browser fires `inactive` event) — shipped in Phase 1
- [ ] Throttle / debounce captures (still manual; auto-capture is Phase 3)
- [ ] Mobile-friendly fallback (chat-only mode when no screen-share API)

### Phase 3+ — Extended Roadmap (Week 1 of real product work)

> Phase 1 and Phase 2 were thin slices — single-file changes, ~200 lines each. Below is the multi-day plan that makes Live Tutor a real product, not a demo. Each day is a substantive epic with multi-file changes, real architectural decisions, and acceptance criteria. Estimate: 6-8 productive hours per day, 7 days total.

---

#### **Day 1 — Visual annotations / pointing** ✅ shipped 2026-05-12

The AI doesn't just describe — it draws. "Show me the buy button" → bounding box overlay appears on the screen preview.

**Deliverables:**
- Backend: prompt Claude vision to optionally return structured JSON of `{element_label, bbox: [x, y, w, h]}` arrays alongside text. Parse out of the streamed response.
- Frontend: SVG overlay layer composited over the video preview. Renders rounded rectangles + label tags with the same blue accent.
- Coordinate normalization: Claude returns bbox as % of image dimensions, frontend scales to current preview size.
- New input mode: "Point" button alongside Send — phrasing the question as a spatial instruction ("where's X?") routes through a different system prompt that prioritizes box output.
- Hover/tap on a box pulses it; click expands a popover with the box's label + description.

**Acceptance criteria:**
- Asking "where is the Buy button?" on a Robinhood screenshot renders a visible box around it
- Boxes scale correctly when the user resizes the browser window
- If Claude returns no boxes, UI falls back gracefully to text-only

**File changes:**
- `backend/main.py` — extend `TutorRequest` with `mode: "qa" | "point"`; add JSON parser for box output
- `frontend/src/components/LiveTutorPage.jsx` — split into `LiveTutorPage`, `SharedScreenPanel`, `AnnotationOverlay`, `ChatPanel`
- `frontend/src/components/AnnotationOverlay.jsx` — NEW, SVG rendering + scaling

**Risks:**
- Claude vision's spatial accuracy isn't perfect — boxes may be slightly off. Mitigate with visible "approximate" label, allow users to tap-near tolerance.
- Streaming JSON is awkward. Fallback: have Claude emit boxes as a final JSON block after the prose answer; parse on stream-end.

---

#### **Day 2 — Smart continuous capture**

Stop making users click "Send" every time. Auto-grab frames when the scene meaningfully changes.

**Deliverables:**
- "Live" toggle in the share panel. When on: poll for frames every 1s, compute perceptual hash, only consult AI if scene-similarity drops below threshold AND user has been idle on this scene for 2+ seconds.
- Perceptual hash via `blockhash-core` (small JS lib) or a hand-rolled 8×8 luminance hash.
- Auto-asked questions get a generic "what's notable here?" prompt with low max_tokens to keep cost down.
- Hard rate limit: max 1 AI call per 10 seconds even in live mode.
- "Why was this captured?" tooltip on auto-triggered turns — shows the previous frame so user understands what changed.

**Acceptance criteria:**
- Toggling "Live" on, then switching tabs to a new website, results in an AI response within 3-5 seconds without the user typing anything
- Sitting still on the same screen for a minute produces 0 new AI calls
- Cost meter ticks up only when AI is actually called

**File changes:**
- `frontend/src/utils/perceptualHash.js` — NEW, 8×8 luminance hash + hamming distance
- `frontend/src/hooks/useSmartCapture.js` — NEW, interval + scene-detection logic
- `frontend/src/components/LiveTutorPage.jsx` — wire up the new hook + UI toggle
- `backend/main.py` — accept `auto_triggered: bool` for analytics

**Risks:**
- Browser tab in background throttles `setInterval` — need `requestVideoFrameCallback` instead
- Privacy: auto-capture is more invasive. UI must show a recording indicator and let user pause/resume easily.

---

#### **Day 3 — Account system & server-side persistence**

Move past localStorage. Make sessions cross-device. Set the foundation for paid tiers.

**Deliverables:**
- Backend: SQLite via SQLAlchemy. Schema: `users`, `tutor_sessions`, `tutor_messages`, `practice_progress`.
- Magic-link auth: user types email → backend sends link via Resend / Postmark → click → JWT cookie set. No passwords.
- Frontend: login screen (replaces WelcomePage gate when a user wants to sign in). Local profile becomes "guest mode" that can be migrated to a real account.
- Sessions persist server-side; users see history list in the tutor: "Tuesday's session: 14 questions about beta and drawdown."
- Practice progress (XP, streak, lessons mastered) syncs across devices.
- Migration flow: signed-in user's first login pulls their localStorage into the server.

**Acceptance criteria:**
- Sign in on laptop, open phone (chat-only mode), see same XP and streak
- Tutor session from yesterday is accessible today, with the chat transcript and the timestamps of each turn
- Logged-out users can still use the app in guest mode with localStorage

**File changes:**
- `backend/main.py` — JWT middleware, auth endpoints
- `backend/db/` — NEW, models + migrations
- `backend/auth/` — NEW, magic-link send + verify
- `frontend/src/utils/profile.js` — extend with server sync logic
- `frontend/src/components/LoginPage.jsx` — NEW
- `frontend/src/components/SessionHistoryDrawer.jsx` — NEW

**Risks:**
- Email deliverability for magic links — need a transactional email provider (free tier of Resend should work)
- Render's free tier loses SQLite on restart — need persistent disk ($1/mo upgrade) or Postgres add-on
- Schema migrations as the product evolves — pick Alembic now, save pain later

---

#### **Day 4 — Brokerage-aware tutoring**

The AI recognizes which broker you're on and tailors guidance.

**Deliverables:**
- Vision sub-prompt: first pass classifies the screen — Robinhood / Fidelity / Schwab / E*TRADE / Vanguard / Webull / IBKR / Other / Not-a-broker. Cached for the session.
- Broker knowledge base in `backend/data/brokers.py`: per-broker JSON of common UI elements ("Buy button is in the top-right green block on RH; bottom-center on Fidelity"), terminology differences ("RH calls this 'recurring investment'; Schwab calls it 'periodic investment'").
- AI's main answer prompt is conditioned on the detected broker.
- UI shows detected broker as a chip ("Looking at: Robinhood ✓") with a manual override dropdown.

**Acceptance criteria:**
- Asking "how do I set up auto-invest?" on Robinhood gives Robinhood-specific button instructions, not generic
- Switching tabs to Fidelity changes the detected broker chip within 2 captures
- "Other" broker fallback still works generically

**File changes:**
- `backend/data/brokers.py` — NEW, knowledge base (curated, ~100 lines per broker)
- `backend/main.py` — two-stage call: detect → answer (cached detection per session)
- `frontend/src/components/LiveTutorPage.jsx` — broker chip + manual override

**Risks:**
- Two API calls per question doubles cost — only run detection once per ~5 questions or on cache miss
- Curating broker knowledge is grunt work — start with just Robinhood + Fidelity (covers ~60% of retail)

---

#### **Day 5 — Embedded mini-lessons + voice output**

Don't make users leave the chat to learn. Pull Practice content inline.

**Deliverables:**
- When the AI detects a concept it should teach, instead of (or in addition to) the related-lesson card, surface an embedded mini-exercise from `data/lessons.js` directly in chat — single question, single answer, immediate feedback.
- Mini-exercise UI is a compact version of the LessonPlayer (one question, no hearts, no progress bar).
- "Check" / "Continue" inline; on correct answer, hearts/XP increment.
- Voice output via browser `SpeechSynthesis` API (free, no Anthropic cost). Toggle in settings. Per-message replay button.
- Voice plays automatically only if user has opted in (no surprise audio).

**Acceptance criteria:**
- AI says "the Sharpe ratio is..." → an embedded "Quick check: which Sharpe is best?" exercise appears below the response
- Answering correctly earns 10 XP toward the Practice tab progress
- Tapping the speaker icon on any AI message reads it aloud

**File changes:**
- `frontend/src/components/InlineExercise.jsx` — NEW, compact LessonPlayer derivative
- `frontend/src/components/LiveTutorPage.jsx` — wire detection of "teach me" intent + inject exercises
- `frontend/src/utils/voiceOutput.js` — NEW, SpeechSynthesis wrapper
- `frontend/src/data/lessons.js` — add `quickCheck: true` flag to mark exercises suitable for inline use

**Risks:**
- Detecting "teach me this" intent from AI responses is heuristic — may show exercises too often (annoying) or too rarely (useless). Tune the keyword list and confidence threshold.
- SpeechSynthesis voices vary by OS — quality is mediocre. Acceptable for v1; consider ElevenLabs later ($).

---

#### **Day 6 — Onboarding, quotas, error handling**

Make first-run feel intentional. Set up monetization rails.

**Deliverables:**
- First-time tutor onboarding: 4-step animated walkthrough explaining what the tool does, how privacy works, what example questions to try, click-through to first share.
- Free tier: 15 questions/day. Paid tier (placeholder, no Stripe yet): unlimited. Quota counter visible in account menu.
- Quota-exhausted UI: friendly upgrade prompt; doesn't break the app.
- Robust error handling: network failure shows retry button, vision API rate-limit shows friendly back-off message, screen-share permission denied gives explicit recovery instructions.
- Analytics events (lightweight, self-hosted to a tiny SQLite table): tutor_share_started, tutor_question_asked, tutor_question_failed, related_lesson_clicked, embedded_exercise_completed.

**Acceptance criteria:**
- New user clicking "Live Tutor" for the first time sees the walkthrough; second visit skips it
- Asking the 16th question on a free account shows the quota-cap UI gracefully
- Killing the backend mid-stream shows a "Try again" button, not a stack trace

**File changes:**
- `frontend/src/components/LiveTutorOnboarding.jsx` — NEW, 4-step intro
- `backend/main.py` — quota middleware (decrement on each /api/tutor call)
- `backend/db/models.py` — `daily_quota` field on users
- `frontend/src/utils/analytics.js` — NEW, fire-and-forget event sender
- `backend/main.py` — `/api/event` ingest endpoint

**Risks:**
- Onboarding screens are easy to over-design — keep to 4 cards max, no friction
- Quota enforcement on the backend means abuse-resistant; can't be bypassed by clearing localStorage

---

#### **Day 7 — Mobile companion (chat-only) + polish**

Mobile browsers can't share screens, but they can still chat. And we need a polish pass before calling it done.

**Deliverables:**
- Mobile detection in LiveTutorPage. If `getDisplayMedia` unsupported: render a chat-only experience with photo upload from camera roll instead of live screen share.
- "Pair with my desktop" entry point for stretch goal (uses session ID from desktop, just shows recent transcripts and lesson cards — Phase 2 of phone pairing).
- Comprehensive empty-states throughout (no questions yet, no boxes returned, no broker detected, etc.)
- Loading shimmer for AI responses (not just dots)
- Accessibility pass: keyboard nav for chat, ARIA labels for all icons, focus management when modals open
- Performance: ensure no unnecessary re-renders during streaming
- End-to-end smoke test (Playwright): share → ask → answer → continue → stop share

**Acceptance criteria:**
- iPhone Safari opens Live Tutor and can upload a screenshot to ask about
- All buttons reachable via Tab key
- Lighthouse a11y score ≥ 95 on Live Tutor route
- Playwright test runs green in CI

**File changes:**
- `frontend/src/components/LiveTutorPage.jsx` — mobile branch
- `frontend/src/components/MobileLiveTutorChat.jsx` — NEW
- `frontend/tests/livetutor.spec.js` — NEW, Playwright test
- `.github/workflows/test.yml` — NEW, run Playwright on PR

**Risks:**
- Playwright in CI for screen-share is fiddly (need mock media stream) — can skip the share step and only test chat flow
- Mobile camera-roll upload changes the architecture slightly — file upload vs. video frame extraction

---

### Stretch — Week 2

These don't fit the week-1 budget but are the logical next moves:

- **Phone pairing (real-time)** — QR-code pair flow, WebSocket sync, mobile shows pushed lesson cards as desktop shares screen. ~2-3 days.
- **Session recording + replay** — save full Q&A as study notes; user can re-watch with their own screenshots and explanations. ~1 day.
- **Personalized curriculum** — track which concepts each user struggles with; AI proactively suggests Practice lessons in dashboard. ~2 days.
- **Stripe billing** — wire up actual paid tier. ~1 day.
- **Multi-language support** — i18n the UI strings; Claude already speaks every language fluently. ~1 day.

---

## Pace check / honest disclosure

Phases 1 and 2 took ~30 minutes of build time each. The Day 1-7 items above are not the same kind of work. Day 1 alone (annotations) needs: a real coordinate system, SVG overlay rendering, vision-output parsing, hover state, fallback handling, and visual debugging across at least 5 screenshots. That's ~6 hours of focused work, not 30 minutes. If we ship one day per session, the week takes 7 sessions. If we cram, we cut corners — and the user-visible result is "another half-working demo."

Recommend: pick the day that excites you most and we go deep on it next.

## Technical decisions

- **No Electron in v1.** Browser screen-share API is enough to validate the concept. Adding Electron later if needed.
- **Manual capture, not streaming.** Cost + privacy. Each question = one frame.
- **JPEG, not PNG.** Smaller payload, faster upload, still readable by Claude.
- **`claude-opus-4-7` for vision.** Best quality model that supports vision. Will benchmark vs Haiku 4.5 once we have user data.
- **SSE streaming.** Mirrors the existing `/api/chat` pattern; user sees response token-by-token.
- **No server-side persistence.** Screenshots and chat live only in browser memory; backend forwards to Anthropic and returns the response.

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Brokerage ToS (Robinhood) might forbid screen-reading by third parties | Medium | Frame Panko as a user-controlled tool the USER chooses to share with — not automated scraping. Add disclaimer in UI. Most likely safe; check ToS before commercial launch. |
| Claude misidentifies UI elements or invents features that don't exist on screen | High | Heavy system prompt grounding: "only describe what is actually visible; if unsure, say so." Show user the captured frame alongside the answer so they can verify. |
| Vision API costs spike with heavy users | Medium | Per-day question cap (free tier: 20 questions/day). Optional Pro tier later. |
| Users feel privacy-spooked by screen sharing | High | Clear consent flow + privacy callout. No automatic capture. Easy stop-share. |
| Mobile users can't screen-share (no API on iOS/Android browsers) | Low | Mobile shows "Open on desktop for full experience" + chat-only fallback. |

## File changes (Phase 1)

### New files
- `LIVE_TUTOR_PLAN.md` (this doc)
- `frontend/src/components/LiveTutorPage.jsx`

### Modified files
- `frontend/src/components/Sidebar.jsx` (add nav item)
- `frontend/src/App.jsx` (lazy import + route)
- `backend/main.py` (add `/api/tutor` SSE endpoint)

## Open questions

- **Pricing?** Free for MVP; figure out subscription later. Question caps will be a soft gate.
- **Voice input — Whisper or Web Speech?** Web Speech is free + offline-ish but inconsistent across browsers. Whisper costs ~$0.006/min but works everywhere. Defer to Phase 2.
- **Should we capture the "answer with what the AI saw" as a Practice flashcard?** Cool concept — answered questions become personalized lessons. Defer.
- **Brokerage ToS** — need to actually read Robinhood / Fidelity / Schwab terms. Could ask a lawyer before commercial launch.

---

## Build log

- **2026-05-12** — Plan saved. Phase 1 MVP shipped: screen share, vision Q&A, /api/tutor endpoint, sidebar tab.
- **2026-05-12** — Phase 2 polish shipped: voice input via Web Speech API (mic button in composer), related-Practice-lesson cross-link card under each AI answer (keyword detection across all 8 lesson topics), per-session cost meter pill in chat header.
- **2026-05-12** — Extended roadmap added. 7-day plan covering annotations, smart capture, accounts, brokerage-awareness, embedded lessons, onboarding/quotas, mobile companion. Each day = real epic, not a quick commit.
- **2026-05-12** — Day 1 (Visual annotations) shipped. Backend supports `mode: "point"` with new TUTOR_POINT_SUFFIX prompt that instructs Claude to emit a JSON bbox block after a one-sentence summary. Frontend: new `parseBoxes` utility (handles malformed JSON, out-of-range coords, missing block); new `AnnotationOverlay` component (SVG box layer + pixel-positioned label tabs with hover state, auto top-of-image flip for tabs that would clip); new "Point" submit button (Crosshair icon) alongside Send; each user message stores its captured frame so the assistant message can render the same image with boxes drawn on it; while streaming in point mode, `previewProse()` hides the trailing JSON block from the chat bubble. Bundle: LiveTutorPage 16.5kB → 21.3kB.
