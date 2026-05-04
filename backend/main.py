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
    portfolio_context: dict[str, Any] | None = None


def _build_system_prompt(ctx: dict | None) -> str:
    base = (
        "You are a personal portfolio analyst assistant. Be specific, honest, and direct. "
        "Use exact numbers from the portfolio context provided. Do not invent metrics. "
        "If a question requires computing something you don't have, say so clearly and give a directional estimate. "
        "Never give specific buy/sell advice — frame everything as analysis and education. "
        "Keep responses concise — 3-6 sentences unless the question genuinely requires more."
    )
    if not ctx:
        return base

    holdings = ", ".join(
        f"{t} {w:.0%}" for t, w in zip(ctx.get("tickers", []), ctx.get("weights", []))
    )
    rc = ctx.get("risk_contributions", [])
    top_risk = max(rc, key=lambda x: x["pct_risk"]) if rc else {}

    stress = ctx.get("stress_scenarios", {})
    worst_stress = min(stress.items(), key=lambda x: x[1]) if stress else ("—", 0)

    context_block = f"""
PORTFOLIO CONTEXT:
Holdings: {holdings}
Period: {ctx.get('period', {}).get('start', '?')} → {ctx.get('period', {}).get('end', '?')} | Benchmark: {ctx.get('benchmark', 'SPY')}

Performance:
  Return: {ctx.get('annualized_return', 0):.1%}  |  Sharpe: {ctx.get('sharpe_ratio', 0):.2f}
  Volatility: {ctx.get('annualized_volatility', 0):.1%}  |  Max Drawdown: {ctx.get('max_drawdown', 0):.1%}
  Beta: {ctx.get('beta', 0):.2f}  |  Risk Score: {ctx.get('risk_score', 0):.1f}/10

Diversification:
  Nominal ENP: {ctx.get('enp_capital', 0):.1f} positions  |  Corr-Adjusted ENP: {ctx.get('enp_risk', 0):.1f} positions
  HHI: {ctx.get('hhi', 0):.3f}  |  VaR 95% (monthly): {ctx.get('var_95', 0):.1%}

Capture Ratios:
  Upside: {ctx.get('upside_capture', 0):.2f}×  |  Downside: {ctx.get('downside_capture', 0):.2f}×

Benchmark Attribution:
  Beta: {ctx.get('benchmark_beta', 0):.2f}  |  Alpha: {ctx.get('benchmark_alpha', 0):.1%}
  {ctx.get('pct_from_beta', 0):.0%} of return from market exposure

Top Risk Driver: {top_risk.get('ticker', '—')} at {top_risk.get('pct_risk', 0):.0%} of portfolio risk
Portfolio DNA: {ctx.get('portfolio_dna', '—')}
Dominant Theme: {ctx.get('top_theme', '—')}
Worst Stress Scenario: {worst_stress[0]} ({worst_stress[1]:.1%})
"""
    return base + "\n" + context_block


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


@app.post("/api/chat")
def chat(request: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        def no_key():
            yield f"data: {json.dumps({'text': 'ANTHROPIC_API_KEY is not set. Add it to your environment to enable the assistant.'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    system = _build_system_prompt(request.portfolio_context)
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def stream():
        try:
            with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as s:
                for text in s.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'text': f'Error: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
