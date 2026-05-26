# Panko Architecture

Single-developer product. Tutor-first portfolio risk tool. No auth, no database; user state lives in the browser.

## Stack

- **Frontend:** React 18 + Vite + Tailwind. Hosted on Vercel.
- **Backend:** Python 3 + FastAPI on Render free tier (~30s cold start; see DEPLOY.md → keep-warm).
- **LLM:** Anthropic SDK. `claude-opus-4-7` in the tutor agent loop; `claude-haiku-4-5` for structured thesis → universe mapping.

## What the app is

The marquee surface is the **tutor**: an agentic AI that screen-shares with the user, sees their brokerage / chart / lesson, and teaches them about their portfolio. The legacy analytics pages (Dashboard / Analyze / Simulate / Improve / Plan / Monitor / Learn / Practice) are grouped in the sidebar under "Tools" and "Lessons."

## Backend layout

```
backend/
  main.py              FastAPI app — routes + CORS + lifespan
  agent/               (Phase 2) tutor + chat agent loop
    runner.py          _run_agent_stream — multi-turn tool loop with SSE
  thesis/              (Phase 2) thesis-mapping (LLM + preset paths)
  prompts/
    tutor_prompt.py    Unified system prompt + per-turn context block
  tools/
    tutor_tools.py     Anthropic tool schemas (5 tools)
    dispatcher.py      execute_tool — routes tool_use → internal function
  risk/                Calculator (analyze), improvement (optimize), scoring
  data/                Fetcher (yfinance), universe, preset portfolios
  pdf/                 PDF report generator
  models/schemas.py    Pydantic request/response shapes
  tests/               pytest suite (9 files)
```

### The five tools

`run_analysis`, `map_thesis_to_portfolio`, `optimize`, `suggest_lesson`, `save_snapshot`. Both `/api/chat` (text) and `/api/tutor` (vision) share the same tool set via `agent/runner.py`. The dispatcher returns a `summary_for_model` (short text the model narrates from) plus an optional `ui_payload` emitted as a separate SSE event so the frontend can render rich cards without bloating model context.

## Frontend layout

```
frontend/src/
  App.jsx              Top-level routing (active-tab state, sidebar)
  components/
    LiveTutorPage.jsx  Marquee tutor surface (screen share + chat)
    Sidebar.jsx        Persistent left nav
    Practice* Learn*   Lesson surfaces
    Analyze/Simulate/Improve/Monitor/Plan/Dashboard*   Legacy analytics
    AssistantPanel     Floating Cmd-K assistant
  hooks/               (Phase 2) extracted hooks: useScreenShare, useTutorStream
  utils/
    streamTutorEvents.js  SSE parser, shared by all chat surfaces
    snapshots.js          localStorage persistence
    portfolioContext.js   Build per-turn context block
    profile.js            (Phase 3) user_profile read/write
```

## Streaming and tool-use wire

1. Client POSTs to `/api/tutor` or `/api/chat` with `{messages, portfolio_context, saved_payload, lessons_completed, user_profile}` (vision adds `screenshot_base64`).
2. Backend runs a multi-turn loop, max 6 turns. Each turn streams text deltas as `data: {"text": "..."}` SSE events.
3. When the model returns a `tool_use` block, the backend emits `{"type":"tool_use","tool","status"}` (frontend shows status pill), runs the tool, emits `{"type":"tool_ui","tool","payload"}` (frontend renders card / runs side effect), appends a `tool_result` block, and re-enters the loop.
4. Stream ends with `data: [DONE]`.

The model never sees `ui_payload`. The frontend never parses model text for tool intent. This split keeps the context tight and the UI clean.

## State and persistence

- **No backend database.** Everything user-specific is in the browser.
- **localStorage keys:**
  - `panko_last_session` — last analyzed portfolio + results
  - `panko_snapshots_v1` — saved snapshots
  - `panko_practice_v1` — completed lessons
  - `panko_profile_v1` — (Phase 3) cross-session user_profile
- Privacy stance: shared screenshots are forwarded to Claude and discarded; nothing is stored on Panko servers.

## Deploy

`git push main` → Vercel and Render both auto-rebuild. See DEPLOY.md.

## Memory model (Phase 3)

The tutor has three layers of memory:

1. **Per-turn context** — `build_context_block()` injects surface, portfolio summary, completed lessons, and (Phase 3) user_profile into the first user message every turn. Not cached in the system prompt; refreshed each request.
2. **Within-session** — the message history passed in `request.messages` carries the full transcript of the current session.
3. **Cross-session (Phase 3)** — `user_profile` in localStorage stores facts the model has learned about the user (risk tolerance, observed biases, stated goals). Sent in every request; updated via the `remember_about_user` tool when the model wants to persist a new fact.
