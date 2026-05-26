"""
Thesis endpoint — maps a user's investment thesis to a curated portfolio.

Two paths:
1. Preset (preset_id supplied) — pre-computed portfolio, zero LLM cost.
2. LLM (default) — Haiku-based universe-bounded mapping with hallucinated-
   ticker filtering.

Lives outside main.py because it carries its own ~150-line system prompt
that's tuned for structured JSON output. Bundling it with route plumbing
made main.py a monolith.
"""

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel


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


def handle_thesis(request: ThesisRequest) -> dict[str, Any]:
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
