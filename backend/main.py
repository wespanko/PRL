import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

# Load backend/.env from the file's own directory (not CWD), so it works
# regardless of where uvicorn is launched from.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from models.schemas import AnalyzeResponse, PortfolioRequest
from pdf.generator import generate_pdf
from risk.calculator import run_analysis
from prompts.tutor_prompt import TUTOR_SYSTEM_PROMPT, build_context_block
from tools.tutor_tools import TOOLS, TOOL_STATUS_COPY
from tools.dispatcher import execute_tool

app = FastAPI(title="Panko Risk API", version="0.1.0")

# CORS: allowed origins are comma-separated in PANKO_ALLOWED_ORIGINS env var.
# Defaults to localhost dev origins. In prod, set to your Vercel URL.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_origins = [o.strip() for o in os.environ.get("PANKO_ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",  # any Vercel preview URL
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/prices")
def latest_prices(tickers: str):
    """Latest available close price per ticker, used by the Shares-mode form.

    `tickers` is a comma-separated string. Returns:
        {"prices": {"NVDA": 942.13, "AAPL": 218.4, ...},
         "missing": ["BAD"], "asof": "2026-05-02"}
    Skips silently over tickers that fail to fetch (returns them in `missing`).
    Reuses the same fetch_prices cache as analysis, so it's free if those tickers
    were already analyzed.
    """
    from datetime import datetime, timedelta
    from data.fetcher import fetch_prices

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"prices": {}, "missing": [], "asof": None}

    # Pull last 7 days so weekends/holidays don't return empty.
    end = datetime.now().date()
    start = end - timedelta(days=7)

    prices_out: dict[str, float] = {}
    missing: list[str] = []
    asof: str | None = None
    try:
        df, _ = fetch_prices(ticker_list, str(start), str(end))
        if not df.empty:
            asof = str(df.index[-1].date())
            for t in ticker_list:
                if t in df.columns:
                    last = float(df[t].dropna().iloc[-1]) if df[t].dropna().size > 0 else None
                    if last is not None and last > 0:
                        prices_out[t] = round(last, 2)
                    else:
                        missing.append(t)
                else:
                    missing.append(t)
    except Exception:
        # Per-ticker fallback — try them one at a time so a single bad ticker
        # doesn't kill the whole batch.
        for t in ticker_list:
            try:
                df_one, _ = fetch_prices([t], str(start), str(end))
                if not df_one.empty and t in df_one.columns:
                    last = float(df_one[t].dropna().iloc[-1])
                    prices_out[t] = round(last, 2)
                    asof = str(df_one.index[-1].date())
                else:
                    missing.append(t)
            except Exception:
                missing.append(t)

    return {"prices": prices_out, "missing": missing, "asof": asof}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: PortfolioRequest):
    return run_analysis(payload)


@app.post("/api/report/pdf")
def report_pdf(payload: PortfolioRequest):
    results = run_analysis(payload)
    return Response(
        content=generate_pdf(results),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=panko_risk_report.pdf"},
    )


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    # Legacy field — kept for backwards compat. The context block built from
    # this is now inserted into the first user message rather than baked into
    # the system prompt.
    portfolio_context: dict[str, Any] | None = None
    # The raw PortfolioRequest payload of the user's last analysis. Used as
    # fallback when a tool call omits `holdings`.
    saved_payload: dict[str, Any] | None = None
    # List of lesson IDs (or topic names) the user has completed. Surfaced
    # in the context block so the model knows what it can reference without
    # re-explaining.
    lessons_completed: list[str] | None = None


class TutorRequest(BaseModel):
    # Same chat shape as /api/chat, plus a single screenshot.
    messages: list[ChatMessage]
    # Base64-encoded JPEG of the user's current screen frame (no data: prefix).
    screenshot_base64: str | None = None
    # Optional MIME type — defaults to image/jpeg.
    screenshot_media_type: str = "image/jpeg"
    # "qa"    -> standard Q&A response (prose only)
    # "point" -> spatial mode: AI returns prose + a JSON bbox block at the end
    mode: str = "qa"
    portfolio_context: dict[str, Any] | None = None
    saved_payload: dict[str, Any] | None = None
    lessons_completed: list[str] | None = None


class ThesisRequest(BaseModel):
    thesis: str = ""
    risk_tolerance: str | None = None  # "conservative" | "balanced" | "aggressive"
    preset_id: str | None = None       # if set, serve curated portfolio without LLM


def _build_suggestions_from_holdings(holdings: list[dict]) -> list[dict]:
    """Join {ticker, weight, reason} entries with universe metadata to produce
    the standard suggestion shape returned by /api/thesis."""
    from data.universe import find_ticker
    out = []
    for h in holdings:
        entry = find_ticker(h["ticker"])
        if entry is None:
            continue
        out.append({
            "ticker": entry["ticker"],
            "name": entry["name"],
            "kind": entry.get("kind", "etf"),       # "stock" | "etf" | "trust"
            "theme": entry["theme"],
            "reason": h.get("reason", ""),
            "role": entry["role"],
            "blurb": entry.get("blurb", ""),         # plain-English explanation
            "weight": h.get("weight"),
        })
    return out


@app.post("/api/thesis")
def thesis(request: ThesisRequest):
    """Map a user's investment thesis to specific ticker suggestions.

    Two paths:
    1. If `preset_id` is provided and known → serve a pre-computed portfolio
       from data.preset_portfolios. Zero LLM cost, sub-100ms response,
       perfectly consistent results across users.
    2. Otherwise → call Claude Haiku to map the free-form thesis to the
       curated universe (strict prompt, hallucinated tickers filtered out).
    """
    # ── Path 1: pre-computed preset ────────────────────────────────────────
    if request.preset_id:
        from data.preset_portfolios import get_preset
        preset = get_preset(request.preset_id, request.risk_tolerance)
        if preset is not None:
            return {
                "themes": preset["themes"],
                "summary": preset["summary"],
                "suggestions": _build_suggestions_from_holdings(preset["holdings"]),
                "source": "preset",
            }
        # unknown preset_id falls through to LLM with the user's thesis text

    # ── Path 2: live LLM mapping ───────────────────────────────────────────
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "themes": [],
            "suggestions": [],
            "summary": "Set ANTHROPIC_API_KEY in backend/.env to enable thesis suggestions.",
            "error": "no_api_key",
        }

    from anthropic import Anthropic
    from data.universe import universe_for_prompt, find_ticker

    client = Anthropic(api_key=api_key)
    universe = universe_for_prompt()
    risk_line = (
        f"User's stated risk tolerance: {request.risk_tolerance}. "
        if request.risk_tolerance else ""
    )

    system_prompt = f"""You are a portfolio construction assistant. Given an investment thesis, you map it to concrete ETF/stock tickers from a curated universe.

CURATED UNIVERSE (you MUST only suggest tickers from this list):
{universe}

Rules:
1. Identify 2-5 key themes or concerns from the user's thesis (e.g., "AI growth," "rate hedge," "defensive ballast," "international diversification").
2. For each theme, suggest 1-3 tickers from the universe above. NEVER invent a ticker that is not in the list.
3. Each suggestion must include a 1-sentence reason explaining how it fits the thesis.
4. Suggest a balanced mix — don't pile 8 tickers into one theme. Aim for 5-9 total suggestions.
5. {risk_line}If conservative, weight toward bonds, defensive equity, and gold. If aggressive, allow more equity, single names, and thematic ETFs. If balanced, mix.
6. Return STRICTLY valid JSON with this schema:
   {{
     "themes": ["theme 1", "theme 2", ...],
     "summary": "2-3 sentence overview of how the suggestions reflect the thesis",
     "suggestions": [
       {{"ticker": "SPY", "theme": "Broad US Equity", "reason": "Core US large-cap exposure to anchor the portfolio."}},
       ...
     ]
   }}

Return only the JSON. No prose. No markdown fences."""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": request.thesis.strip()[:4000]}],
        )
        text = "".join(block.text for block in response.content if hasattr(block, "text"))
    except Exception as e:
        return {"themes": [], "suggestions": [], "summary": "", "error": f"llm_error: {e}"}

    # Strip any code fences if the model added them despite instructions
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {
            "themes": [], "suggestions": [], "summary": "",
            "error": "llm_returned_invalid_json", "raw": text[:500],
        }

    # Validate every suggested ticker is actually in the universe
    suggestions_out = []
    for s in parsed.get("suggestions", []):
        tk = (s.get("ticker") or "").upper().strip()
        entry = find_ticker(tk)
        if entry is None:
            continue  # silently drop hallucinated tickers
        suggestions_out.append({
            "ticker": entry["ticker"],
            "name": entry["name"],
            "kind": entry.get("kind", "etf"),
            "theme": s.get("theme") or entry["theme"],
            "reason": s.get("reason", ""),
            "role": entry["role"],
            "blurb": entry.get("blurb", ""),
        })

    return {
        "themes": parsed.get("themes", []),
        "summary": parsed.get("summary", ""),
        "suggestions": suggestions_out,
        "source": "llm",
    }


RISK_TOLERANCE_TO_DROP_PCT = {
    "conservative": 0.10,
    "balanced":     0.15,
    "aggressive":   0.20,
}


class ImproveRequest(PortfolioRequest):
    risk_tolerance: str | None = None  # conservative | balanced | aggressive


@app.post("/api/improve")
def improve(payload: ImproveRequest):
    from risk.weaknesses import detect_weaknesses
    from risk.improvement import generate_paths

    drop_pct = RISK_TOLERANCE_TO_DROP_PCT.get(
        (payload.risk_tolerance or "balanced").lower(), 0.15
    )

    current_results = run_analysis(payload)
    weaknesses = detect_weaknesses(current_results)
    paths = generate_paths(current_results, payload, max_drop_pct=drop_pct)

    return {
        "current_results": current_results,
        "weaknesses": weaknesses,
        "paths": paths,
        "risk_tolerance": payload.risk_tolerance or "balanced",
        "constraint_drop_pct": drop_pct,
    }


# ─── Tutor agent (shared tool loop) ─────────────────────────────────────
# /api/chat and /api/tutor both run this loop. They differ only in whether
# the user's latest message has an image attached.
#
# Streaming + tool use: each turn streams text deltas to the client. After
# the stream ends we inspect the final message for tool_use blocks; if any
# are present we run them, emit an SSE event with the structured ui_payload
# (so the frontend can render lesson cards, snapshot confirmations, etc.),
# append a tool_result block, and re-enter the loop. We exit once the
# model produces a turn with no tool_use blocks.

# Spatial-mode addendum to the system prompt. Only appended for vision
# requests where mode == "point" — the spec for the JSON bbox format is
# what the frontend's parseBoxes.js expects.
TUTOR_POINT_SUFFIX = """

────────────────────────────────────────
SPATIAL MODE — POINTING TASK

The user is asking you to LOCATE one or more elements on the screen. The UI
will draw rectangles directly on the screenshot at the coordinates you give.

Format your response EXACTLY like this:

1. ONE short sentence of prose describing what you found (one sentence, no more).
2. Then a fenced JSON code block listing every element to highlight:

```json
[
  {"label": "Buy button", "bbox": [72, 14, 18, 6]}
]
```

bbox = [x, y, width, height] as PERCENTAGES of the image dimensions (0-100).
- (0, 0) is the top-left corner of the image.
- (100, 100) is the bottom-right corner.
- Be tight: hug the element with minimal padding (~2-3% margin max).
- Multiple elements is fine — list them all.

If you genuinely cannot find the requested element, prose explains why,
followed by an empty JSON block: ```json []```

DO NOT include any text after the closing ``` of the JSON block.
DO NOT use lesson references in this mode — keep the prose minimal.
"""

MAX_TOOL_TURNS = 6


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _serialize_assistant_content(content_blocks) -> list[dict]:
    """Convert the SDK's content-block objects back into dicts suitable for
    the next API call's `messages` argument. We hand-pick fields instead of
    calling .model_dump() because the SDK emits client-side fields (like
    `parsed_output` on TextBlock) that the API rejects when echoed back."""
    out: list[dict] = []
    for b in content_blocks:
        if isinstance(b, dict):
            out.append(b)
            continue
        t = getattr(b, "type", None)
        if t == "text":
            out.append({"type": "text", "text": getattr(b, "text", "")})
        elif t == "tool_use":
            out.append({
                "type": "tool_use",
                "id": getattr(b, "id", ""),
                "name": getattr(b, "name", ""),
                "input": getattr(b, "input", {}) or {},
            })
        elif t == "thinking":
            out.append({
                "type": "thinking",
                "thinking": getattr(b, "thinking", ""),
                "signature": getattr(b, "signature", ""),
            })
        elif t == "redacted_thinking":
            out.append({"type": "redacted_thinking", "data": getattr(b, "data", "")})
        # Unknown block types are dropped — the API will reject anything novel.
    return out


def _run_agent_stream(
    *,
    surface: str,
    initial_messages: list[dict],
    saved_payload: dict | None,
    portfolio_context: dict | None,
    lessons_completed: list[str] | None,
    has_image: bool,
    mode: str | None,
    extra_system_suffix: str = "",
):
    """Generator yielding SSE-formatted events. Runs the multi-turn tool
    loop and streams text deltas as they arrive."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        yield _sse({"text": "ANTHROPIC_API_KEY is not set on the server."})
        yield "data: [DONE]\n\n"
        return

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    # Prepend the per-turn context block to the first user message. Lives
    # inside the user message (not the system prompt) so it's per-turn rather
    # than cached as a static prompt.
    messages = [dict(m) for m in initial_messages]
    context_line = build_context_block(
        surface=surface,
        portfolio=portfolio_context,
        has_image=has_image,
        lessons_completed=lessons_completed,
        mode=mode,
    )
    if context_line and messages:
        # Find the first user message and inject. For vision turns, the user
        # message content is already a list of blocks (image + text); we
        # prepend the context line to the text block.
        for idx, m in enumerate(messages):
            if m["role"] != "user":
                continue
            content = m["content"]
            if isinstance(content, str):
                m["content"] = f"{context_line}\n{content}"
            elif isinstance(content, list):
                # Find the first text block; insert the context line into it.
                injected = False
                for cb in content:
                    if isinstance(cb, dict) and cb.get("type") == "text":
                        cb["text"] = f"{context_line}\n{cb.get('text', '')}"
                        injected = True
                        break
                if not injected:
                    content.append({"type": "text", "text": context_line})
            break

    system_prompt = TUTOR_SYSTEM_PROMPT + extra_system_suffix

    try:
        for turn in range(MAX_TOOL_TURNS):
            with client.messages.stream(
                model="claude-opus-4-7",
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                tools=TOOLS,
            ) as s:
                # Forward text deltas immediately so the user sees the
                # response stream as it's generated.
                for text in s.text_stream:
                    yield _sse({"text": text})
                final = s.get_final_message()

            # Look for tool_use blocks in the final message.
            tool_uses = [b for b in final.content if getattr(b, "type", None) == "tool_use"]
            if not tool_uses:
                # No more tool calls — done.
                break

            # Record this assistant turn (including the tool_use blocks) so
            # the next API call has the full conversation history.
            messages.append({
                "role": "assistant",
                "content": _serialize_assistant_content(final.content),
            })

            # Run each tool. Emit a tool_use SSE event so the frontend can
            # show the right status pill, then emit the ui_payload (if any)
            # so cards / side effects can render.
            tool_result_blocks = []
            for tu in tool_uses:
                yield _sse({
                    "type": "tool_use",
                    "tool": tu.name,
                    "status": TOOL_STATUS_COPY.get(tu.name, "Thinking…"),
                })
                result = execute_tool(tu.name, dict(tu.input or {}), saved_payload)
                if result.ui_payload:
                    yield _sse({
                        "type": "tool_ui",
                        "tool": tu.name,
                        "payload": result.ui_payload,
                    })
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result.summary_for_model,
                    "is_error": result.is_error,
                })

            messages.append({"role": "user", "content": tool_result_blocks})
            # Loop continues — model will narrate the tool results.
        else:
            # Hit MAX_TOOL_TURNS without a clean text-only finish.
            yield _sse({"text": " (Reached max tool turns — stopping here.)"})
    except Exception as exc:
        yield _sse({"text": f"Error: {exc}"})

    yield "data: [DONE]\n\n"


@app.post("/api/chat")
def chat(request: ChatRequest):
    raw_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def gen():
        yield from _run_agent_stream(
            surface="Just Ask (text)",
            initial_messages=raw_messages,
            saved_payload=request.saved_payload,
            portfolio_context=request.portfolio_context,
            lessons_completed=request.lessons_completed,
            has_image=False,
            mode=None,
        )

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/tutor")
def tutor(request: TutorRequest):
    # Build the message list. The latest user message gets the screenshot
    # attached as an image content block; previous messages stay text-only
    # to keep token usage down.
    raw_messages = [{"role": m.role, "content": m.content} for m in request.messages]
    if request.screenshot_base64 and raw_messages and raw_messages[-1]["role"] == "user":
        last = raw_messages[-1]
        raw_messages[-1] = {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": request.screenshot_media_type,
                        "data": request.screenshot_base64,
                    },
                },
                {"type": "text", "text": last["content"]},
            ],
        }

    has_image = bool(request.screenshot_base64)
    surface = "Live Tutor (vision session)" if has_image else "Live Tutor (text)"
    extra_suffix = TUTOR_POINT_SUFFIX if request.mode == "point" else ""

    def gen():
        yield from _run_agent_stream(
            surface=surface,
            initial_messages=raw_messages,
            saved_payload=request.saved_payload,
            portfolio_context=request.portfolio_context,
            lessons_completed=request.lessons_completed,
            has_image=has_image,
            mode=request.mode,
            extra_system_suffix=extra_suffix,
        )

    return StreamingResponse(gen(), media_type="text/event-stream")
