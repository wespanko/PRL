"""
Panko backend — thin FastAPI router.

Route handlers stay small here. Real logic lives in:
  - agent/runner.py     — tutor agent loop, SSE streaming, tool dispatch
  - thesis/router.py    — thesis → portfolio mapping (preset + LLM paths)
  - risk/                — calculator, improvement, scoring
  - data/                — fetcher, universe, presets
  - tools/dispatcher.py  — tool execution for the agent loop
"""

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

from agent.runner import TUTOR_POINT_SUFFIX, run_agent_stream
from models.schemas import AnalyzeResponse, PortfolioRequest
from pdf.generator import generate_pdf
from risk.calculator import run_analysis
from thesis.router import ThesisRequest, handle_thesis

# Sentry — only initialized if SENTRY_DSN is set on the server. No-op in dev.
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=_sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.0,  # errors only; turn on for perf when relevant
            environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        )
    except Exception:
        # Sentry import/setup failures must never break the API.
        pass


app = FastAPI(title="Panko Risk API", version="0.2.0")

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


# ─── Request schemas ────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    portfolio_context: dict[str, Any] | None = None
    saved_payload: dict[str, Any] | None = None
    lessons_completed: list[str] | None = None
    # Phase 3 cross-session memory.
    user_profile: dict[str, Any] | None = None


class TutorRequest(BaseModel):
    messages: list[ChatMessage]
    # Base64-encoded JPEG of the user's current screen frame (no data: prefix).
    screenshot_base64: str | None = None
    screenshot_media_type: str = "image/jpeg"
    # "qa"    -> standard Q&A response (prose only)
    # "point" -> spatial mode: AI returns prose + a JSON bbox block at the end
    mode: str = "qa"
    portfolio_context: dict[str, Any] | None = None
    saved_payload: dict[str, Any] | None = None
    lessons_completed: list[str] | None = None
    user_profile: dict[str, Any] | None = None


class ImproveRequest(PortfolioRequest):
    risk_tolerance: str | None = None  # conservative | balanced | aggressive


RISK_TOLERANCE_TO_DROP_PCT = {
    "conservative": 0.10,
    "balanced":     0.15,
    "aggressive":   0.20,
}


# ─── Routes ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/prices")
def latest_prices(tickers: str):
    """Latest available close price per ticker, used by the Shares-mode form.

    `tickers` is a comma-separated string. Returns:
        {"prices": {"NVDA": 942.13, ...}, "missing": ["BAD"], "asof": "2026-05-02"}
    """
    from datetime import datetime, timedelta
    from data.fetcher import fetch_prices

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"prices": {}, "missing": [], "asof": None}

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
        # Per-ticker fallback — one bad ticker shouldn't kill the whole batch.
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


@app.post("/api/thesis")
def thesis(request: ThesisRequest):
    return handle_thesis(request)


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


@app.post("/api/chat")
def chat(request: ChatRequest):
    raw_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def gen():
        yield from run_agent_stream(
            surface="Just Ask (text)",
            initial_messages=raw_messages,
            saved_payload=request.saved_payload,
            portfolio_context=request.portfolio_context,
            lessons_completed=request.lessons_completed,
            user_profile=request.user_profile,
            has_image=False,
            mode=None,
        )

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/tutor")
def tutor(request: TutorRequest):
    # Latest user message gets the screenshot as an image content block;
    # earlier messages stay text-only to keep token use down.
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
        yield from run_agent_stream(
            surface=surface,
            initial_messages=raw_messages,
            saved_payload=request.saved_payload,
            portfolio_context=request.portfolio_context,
            lessons_completed=request.lessons_completed,
            user_profile=request.user_profile,
            has_image=has_image,
            mode=request.mode,
            extra_system_suffix=extra_suffix,
        )

    return StreamingResponse(gen(), media_type="text/event-stream")
