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

- [ ] Voice input (Web Speech API → text → existing flow)
- [ ] "Related lesson" side card that pulls from Practice content when AI mentions a concept
- [ ] Better empty / pre-share state with example questions
- [ ] Token usage indicator (estimated $$ per question)
- [ ] Stop-share auto-detection (browser fires `inactive` event)
- [ ] Throttle / debounce captures
- [ ] Mobile-friendly UI (even if no screen capture on mobile — can still do chat)

### Phase 3 — Stretch

- [ ] Phone pairing (QR code → mobile companion app or PWA; phone shows AI guidance synced to desktop)
- [ ] Continuous-capture mode with smart triggering (only send frames when user is on a new screen)
- [ ] On-screen annotations (would require browser extension — separate product)
- [ ] Account-synced session history
- [ ] "Teach me about this button" → AI literally circles UI elements (vision model returns coords)
- [ ] Voice output (TTS for AI responses)

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

- **2026-05-12** — Plan saved. Starting Phase 1 implementation.
