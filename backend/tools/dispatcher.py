"""
Tool dispatcher for the Panko tutor agent loop.

When Claude returns a `tool_use` block, the endpoint hands the (name, input,
saved_payload) tuple to `execute_tool`. We route to the right internal
function (run_analysis, generate_paths, thesis-mapping, etc.), build a
compact text summary for the model, and — for tools whose output the
frontend renders as a card or persists locally — also return a structured
`ui_payload` the endpoint emits as a separate SSE event.

Design contract:
  - `summary_for_model`: short, plain-English string. The model narrates
    from this. We deliberately do NOT shove the full AnalyzeResponse JSON
    into the model's tool_result — it bloats context and the model
    summarizes worse from raw JSON than from a clean digest.
  - `ui_payload`: optional dict for the frontend (lesson card, snapshot
    confirmation card, suggested-holdings preview, etc.). Emitted via
    SSE so React can render it inline in the transcript.
  - `is_error`: True if the tool failed; the model is expected to narrate
    the error gracefully ("I need holdings to analyze — paste them or
    share your screen").

Saved-payload contract: the chat/tutor endpoint receives `saved_payload`
in the request (a dict shaped like PortfolioRequest). Tools that need
holdings fall back to `saved_payload.holdings` when the model omits them.
Tools that need analysis dates always use saved_payload dates if present,
else default to a recent 3-year window.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any


log = logging.getLogger("panko.tools")


# Topic enum from the suggest_lesson tool → frontend Practice lesson IDs.
# Most topics match the lesson id 1:1; "volatility" maps to "vol_basics".
LESSON_ID_MAP = {
    "volatility":      "vol_basics",
    "sharpe":          "sharpe",
    "diversification": "diversification",
    "beta":            "beta",
    "drawdowns":       "drawdowns",
    "var":             "var",
    "capture":         "capture",
    "correlation":     "correlation",
}

LESSON_TITLES = {
    "vol_basics":      "Volatility & Returns",
    "sharpe":          "The Sharpe Ratio",
    "diversification": "Real Diversification",
    "beta":            "Beta & Market Risk",
    "drawdowns":       "Drawdowns",
    "var":             "Value at Risk (VaR)",
    "capture":         "Capture Ratios",
    "correlation":     "Correlation",
}


# Maps the optimize tool's constraint enum to the path NAME generate_paths()
# emits. If the preferred path isn't in the generated set (e.g. weakness
# detection didn't surface it), we fall back to the first available path.
CONSTRAINT_TO_PATH_NAME = {
    "preserve_sharpe":     "Maximize Health",
    "max_diversification": "Better Diversified",
    "reduce_drawdown":     "Lower Drawdown",
}


@dataclass
class ToolResult:
    """Return value of execute_tool. The endpoint converts this into the
    Anthropic tool_result content block plus, optionally, an SSE event."""
    summary_for_model: str
    ui_payload: dict | None = None
    is_error: bool = False


def _default_dates() -> tuple[str, str]:
    """3-year window ending today — used when saved_payload doesn't supply dates."""
    end = date.today()
    start = end - timedelta(days=365 * 3)
    return str(start), str(end)


def _coerce_holdings(raw: Any) -> list[dict] | None:
    """Validate + normalize the holdings shape used by all tools."""
    if not isinstance(raw, list) or not raw:
        return None
    out: list[dict] = []
    for h in raw:
        if not isinstance(h, dict):
            continue
        t = (h.get("ticker") or "").upper().strip()
        try:
            w = float(h.get("weight"))
        except (TypeError, ValueError):
            continue
        if not t or w <= 0:
            continue
        out.append({"ticker": t, "weight": w})
    if not out:
        return None
    # Renormalize so weights sum to 1.0 even if the model gave loose values.
    total = sum(h["weight"] for h in out)
    if total <= 0:
        return None
    for h in out:
        h["weight"] = h["weight"] / total
    return out


def _resolve_holdings(
    tool_input: dict, saved_payload: dict | None
) -> tuple[list[dict] | None, str | None]:
    """Choose holdings from tool_input (preferred) or saved_payload (fallback).
    Returns (holdings, error_string_or_None)."""
    h = _coerce_holdings(tool_input.get("holdings"))
    if h:
        return h, None
    if saved_payload:
        h = _coerce_holdings(saved_payload.get("holdings"))
        if h:
            return h, None
    return None, (
        "I don't have any holdings to work with yet. You can paste them, "
        "share your brokerage screen, or describe the thesis you're investing in."
    )


def _build_payload_request(holdings: list[dict], saved_payload: dict | None):
    """Build a PortfolioRequest matching the saved analysis if possible,
    falling back to defaults. Imported lazily so the dispatcher module is
    cheap to import."""
    from models.schemas import Holding, PortfolioRequest

    if saved_payload:
        start = saved_payload.get("start_date") or _default_dates()[0]
        end   = saved_payload.get("end_date")   or _default_dates()[1]
        benchmark = saved_payload.get("benchmark", "SPY") or "SPY"
        rfr = saved_payload.get("risk_free_rate", 0.045)
    else:
        start, end = _default_dates()
        benchmark, rfr = "SPY", 0.045

    return PortfolioRequest(
        holdings=[Holding(ticker=h["ticker"], weight=h["weight"]) for h in holdings],
        start_date=start,
        end_date=end,
        benchmark=benchmark,
        risk_free_rate=rfr,
    )


# ── run_analysis ─────────────────────────────────────────────────────────
def _exec_run_analysis(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    from risk.calculator import run_analysis

    holdings, err = _resolve_holdings(tool_input, saved_payload)
    if err:
        return ToolResult(summary_for_model=err, is_error=True)

    try:
        payload = _build_payload_request(holdings, saved_payload)
        results = run_analysis(payload)
    except Exception as exc:
        log.exception("run_analysis tool failed")
        return ToolResult(
            summary_for_model=f"Analysis failed: {exc}. The data window may be too short or a ticker may be invalid.",
            is_error=True,
        )

    # Compact text digest for the model. Pull only the numbers it needs to
    # narrate, leaving the full payload to the frontend for chart rendering.
    rc = results.get("risk_contributions") or []
    top_driver = max(rc, key=lambda x: x.get("pct_risk", 0)) if rc else {}
    panko_score = round(max(0.0, 10.0 - float(results.get("risk_score", 5.0))) * 10)

    holdings_line = ", ".join(
        f"{t} {w * 100:.0f}%"
        for t, w in zip(results.get("tickers", [])[:7], results.get("weights", [])[:7])
    )

    summary = (
        f"Analysis complete for: {holdings_line}\n"
        f"Panko Score: {panko_score}/100\n"
        f"Sharpe: {results.get('sharpe_ratio', 0):.2f}  |  "
        f"Annualized return: {results.get('annualized_return', 0):.1%}  |  "
        f"Annualized vol: {results.get('annualized_volatility', 0):.1%}\n"
        f"Beta vs {results.get('benchmark', 'SPY')}: {results.get('beta', 0):.2f}  |  "
        f"Max drawdown: {results.get('max_drawdown', 0):.1%}  |  "
        f"VaR 95% (monthly): {results.get('var_95', 0):.1%}\n"
        f"Upside capture: {results.get('upside_capture', 0):.2f}x  |  "
        f"Downside capture: {results.get('downside_capture', 0):.2f}x\n"
        f"Concentration: ENP (capital) {results.get('concentration', {}).get('effective_n', 0):.1f}, "
        f"ENP (risk) {results.get('concentration', {}).get('enp_risk', 0):.1f}\n"
        f"Top risk driver: {top_driver.get('ticker', '—')} "
        f"({top_driver.get('pct_risk', 0):.0%} of portfolio risk)\n"
        f"Portfolio DNA: {(results.get('portfolio_dna') or {}).get('type', '—')}\n"
    )

    return ToolResult(
        summary_for_model=summary,
        ui_payload={
            "type": "analysis_result",
            "panko_score": panko_score,
            "tickers": results.get("tickers", []),
            "weights": results.get("weights", []),
        },
    )


# ── map_thesis_to_portfolio ──────────────────────────────────────────────
def _exec_thesis(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    import os
    thesis = (tool_input.get("thesis") or "").strip()
    risk_tolerance = (tool_input.get("risk_tolerance") or "moderate").strip().lower()
    # Existing /api/thesis uses "balanced" not "moderate" — translate.
    if risk_tolerance == "moderate":
        risk_tolerance = "balanced"

    if not thesis:
        return ToolResult(
            summary_for_model="I need a description of what you want to invest in. Say a sentence or two about the bet you're trying to make.",
            is_error=True,
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return ToolResult(
            summary_for_model="Thesis mapping needs the ANTHROPIC_API_KEY environment variable set on the server.",
            is_error=True,
        )

    try:
        from anthropic import Anthropic
        from data.universe import universe_for_prompt, find_ticker
        import json as _json

        client = Anthropic(api_key=api_key)
        universe = universe_for_prompt()
        system_prompt = (
            "You map a user's investment thesis to specific ETF/stock tickers from a curated universe. "
            "Return STRICT JSON with shape: {themes:[], summary:'', suggestions:[{ticker, theme, reason}]}. "
            f"Risk tolerance: {risk_tolerance}. Pick 5-9 suggestions, only from this universe:\n{universe}\n"
            "Return ONLY JSON. No prose, no fences."
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": thesis[:4000]}],
        )
        text = "".join(b.text for b in resp.content if hasattr(b, "text")).strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        parsed = _json.loads(text)
    except Exception as exc:
        log.exception("thesis mapping failed")
        return ToolResult(
            summary_for_model=f"Thesis mapping failed: {exc}. Try restating your thesis or naming the exposures you want.",
            is_error=True,
        )

    # Filter hallucinated tickers + equal-weight the survivors so the model
    # has a concrete portfolio to narrate.
    keep: list[dict] = []
    for s in parsed.get("suggestions", []):
        tk = (s.get("ticker") or "").upper().strip()
        entry = find_ticker(tk)
        if entry is None:
            continue
        keep.append({
            "ticker": entry["ticker"],
            "name": entry["name"],
            "theme": s.get("theme") or entry.get("theme", ""),
            "reason": s.get("reason", ""),
        })

    if not keep:
        return ToolResult(
            summary_for_model="The mapping didn't yield any valid tickers. Try a more specific thesis or naming sectors directly.",
            is_error=True,
        )

    n = len(keep)
    equal_w = round(1.0 / n, 4)
    suggested_holdings = [{"ticker": s["ticker"], "weight": equal_w} for s in keep]

    holdings_line = ", ".join(f"{h['ticker']} {h['weight'] * 100:.0f}%" for h in suggested_holdings)
    themes_line = ", ".join(parsed.get("themes", [])[:5]) or "—"
    suggestions_detail = "\n".join(
        f"  • {s['ticker']} ({s['theme']}) — {s['reason']}" for s in keep
    )
    summary = (
        f"Mapped thesis ({risk_tolerance}) → {n} suggested holdings:\n"
        f"{holdings_line}\n\n"
        f"Themes: {themes_line}\n"
        f"Detail:\n{suggestions_detail}\n\n"
        f"Summary: {parsed.get('summary', '')}"
    )
    return ToolResult(
        summary_for_model=summary,
        ui_payload={
            "type": "thesis_result",
            "thesis": thesis,
            "risk_tolerance": risk_tolerance,
            "themes": parsed.get("themes", []),
            "suggestions": keep,
            "suggested_holdings": suggested_holdings,
        },
    )


# ── optimize ────────────────────────────────────────────────────────────
def _exec_optimize(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    from risk.improvement import generate_paths
    from risk.calculator import run_analysis as _run

    constraint = (tool_input.get("constraint") or "").strip()
    if constraint not in CONSTRAINT_TO_PATH_NAME:
        return ToolResult(
            summary_for_model=f"Unknown constraint '{constraint}'. Pick preserve_sharpe, max_diversification, or reduce_drawdown.",
            is_error=True,
        )

    holdings, err = _resolve_holdings(tool_input, saved_payload)
    if err:
        return ToolResult(summary_for_model=err, is_error=True)

    try:
        payload = _build_payload_request(holdings, saved_payload)
        current = _run(payload)
        paths = generate_paths(current, payload)
    except Exception as exc:
        log.exception("optimize tool failed")
        return ToolResult(
            summary_for_model=f"Optimization failed: {exc}.",
            is_error=True,
        )

    if not paths:
        return ToolResult(
            summary_for_model="No improvement paths were generated. Your portfolio may already be well-balanced, or the data window is too short to optimize over.",
            is_error=True,
        )

    target_name = CONSTRAINT_TO_PATH_NAME[constraint]
    chosen = next((p for p in paths if p.get("name") == target_name), None)
    fallback_used = False
    if chosen is None:
        # Soft fallbacks: closest sibling path for that intent. We track
        # whether a fallback fired so the model can narrate it accurately
        # — otherwise it'll claim it optimized for the user's requested
        # objective when it actually optimized for an adjacent one.
        fallback_used = True
        if constraint == "reduce_drawdown":
            chosen = next((p for p in paths if p.get("name") in ("Optimized Hedge", "Lower Risk")), None)
        elif constraint == "max_diversification":
            chosen = next((p for p in paths if p.get("name") in ("Better Diversified",)), None)
        elif constraint == "preserve_sharpe":
            chosen = next((p for p in paths if p.get("name") in ("Lower Volatility",)), None)
        if chosen is None:
            chosen = paths[0]

    new_holdings = chosen.get("holdings", [])
    new_results = chosen.get("results") or {}
    cur_panko = round(max(0.0, 10.0 - float(current.get("risk_score", 5.0))) * 10)
    new_panko = round(max(0.0, 10.0 - float(new_results.get("risk_score", 5.0))) * 10) if new_results else None

    new_holdings_line = ", ".join(
        f"{h['ticker']} {h['weight'] * 100:.0f}%" for h in new_holdings[:10]
    )
    diff_lines = [
        f"  Sharpe: {current.get('sharpe_ratio', 0):.2f} → {new_results.get('sharpe_ratio', 0):.2f}",
        f"  Volatility: {current.get('annualized_volatility', 0):.1%} → {new_results.get('annualized_volatility', 0):.1%}",
        f"  Max drawdown: {current.get('max_drawdown', 0):.1%} → {new_results.get('max_drawdown', 0):.1%}",
        f"  Downside capture: {current.get('downside_capture', 0):.2f}x → {new_results.get('downside_capture', 0):.2f}x",
    ] if new_results else ["  (delta metrics unavailable — new portfolio analysis failed)"]

    fallback_note = ""
    if fallback_used:
        fallback_note = (
            f"NOTE: The exact path for constraint '{constraint}' wasn't available for this portfolio "
            f"(weakness detection didn't surface it). Fell back to '{chosen.get('name', '—')}', which "
            f"targets a related but not identical objective. Narrate this honestly to the user — say "
            f"you couldn't optimize specifically for {constraint.replace('_', ' ')} and that you "
            f"optimized for the closest available objective instead, so they can decide if it's "
            f"close enough to what they asked for.\n\n"
        )

    summary = (
        fallback_note +
        f"Suggested path ({chosen.get('name', '—')}, constraint={constraint}):\n"
        f"{chosen.get('description', '')}\n\n"
        f"New holdings: {new_holdings_line}\n"
        f"Panko Score: {cur_panko}/100 → {new_panko if new_panko is not None else '?'}/100\n"
        "Deltas:\n" + "\n".join(diff_lines) + "\n\n"
        f"Trade-off — gain: {chosen.get('tradeoff', {}).get('gain', '—')}\n"
        f"Trade-off — give up: {chosen.get('tradeoff', {}).get('give_up', '—')}"
    )

    return ToolResult(
        summary_for_model=summary,
        ui_payload={
            "type": "optimize_result",
            "path_name": chosen.get("name"),
            "constraint": constraint,
            "holdings": new_holdings,
            "panko_score_before": cur_panko,
            "panko_score_after": new_panko,
        },
    )


# ── suggest_lesson ──────────────────────────────────────────────────────
def _exec_suggest_lesson(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    topic = (tool_input.get("topic") or "").strip().lower()
    reason = (tool_input.get("reason_shown_to_user") or "").strip()
    lesson_id = LESSON_ID_MAP.get(topic)
    if not lesson_id:
        return ToolResult(
            summary_for_model=f"Unknown lesson topic '{topic}'.",
            is_error=True,
        )

    title = LESSON_TITLES.get(lesson_id, topic.title())
    deep_link_path = f"/practice#{lesson_id}"
    summary = (
        f"Suggested lesson surfaced to user: '{title}'. "
        f"Reason shown: {reason or '(none provided)'}. "
        "The lesson card is rendered in the chat. Do not re-describe it in detail — "
        "the user can click through. You may briefly mention you're surfacing the lesson."
    )
    return ToolResult(
        summary_for_model=summary,
        ui_payload={
            "type": "lesson_card",
            "topic": topic,
            "lesson_id": lesson_id,
            "title": title,
            "reason": reason,
            "deep_link_path": deep_link_path,
        },
    )


# ── save_snapshot ───────────────────────────────────────────────────────
def _exec_save_snapshot(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    label = (tool_input.get("label") or "").strip()
    note = (tool_input.get("note") or "").strip()
    if not label:
        return ToolResult(
            summary_for_model="A snapshot needs a label. Pick a short one — e.g. 'Initial diagnostic' or 'After rebalance'.",
            is_error=True,
        )
    if not saved_payload:
        return ToolResult(
            summary_for_model="There's no analyzed portfolio in this session yet — nothing to snapshot. Run an analysis first.",
            is_error=True,
        )

    # The actual write to localStorage happens on the frontend. The backend
    # confirms intent and ships the label+note to the UI via SSE.
    summary = f"Snapshot saved with label '{label}'."
    return ToolResult(
        summary_for_model=summary,
        ui_payload={
            "type": "snapshot_card",
            "label": label,
            "note": note,
        },
    )


# ── remember_about_user ─────────────────────────────────────────────────
def _exec_remember_about_user(tool_input: dict, saved_payload: dict | None) -> ToolResult:
    """Phase-3 cross-session memory. The backend doesn't persist anything;
    the frontend writes the payload to localStorage when it sees the ui_payload
    event. Privacy stance: nothing on Panko's servers."""
    category = (tool_input.get("category") or "").strip().lower()
    value = (tool_input.get("value") or "").strip()
    if category not in ("risk_tolerance", "goal", "fact"):
        return ToolResult(
            summary_for_model=f"Unknown remember category '{category}'. Use risk_tolerance, goal, or fact.",
            is_error=True,
        )
    if not value:
        return ToolResult(
            summary_for_model="remember_about_user needs a non-empty value.",
            is_error=True,
        )
    # Cap value length so the model can't blow up the context block.
    value = value[:240]
    return ToolResult(
        summary_for_model=(
            f"Remembered ({category}): {value}. This will appear in your context "
            f"block in future conversations with this user. Do not acknowledge "
            f"the save out loud — keep talking."
        ),
        ui_payload={
            "type": "memory_write",
            "category": category,
            "value": value,
        },
    )


# ── dispatcher entrypoint ───────────────────────────────────────────────
_HANDLERS = {
    "run_analysis":            _exec_run_analysis,
    "map_thesis_to_portfolio": _exec_thesis,
    "optimize":                _exec_optimize,
    "suggest_lesson":          _exec_suggest_lesson,
    "save_snapshot":           _exec_save_snapshot,
    "remember_about_user":     _exec_remember_about_user,
}


def execute_tool(name: str, tool_input: dict, saved_payload: dict | None) -> ToolResult:
    """Route a single tool_use to its handler. Never raises — failures come
    back as ToolResult(is_error=True) so the model can narrate gracefully."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return ToolResult(
            summary_for_model=f"Unknown tool '{name}'.",
            is_error=True,
        )
    try:
        return handler(tool_input or {}, saved_payload)
    except Exception as exc:
        log.exception("tool %s raised", name)
        return ToolResult(
            summary_for_model=f"Tool '{name}' failed: {exc}.",
            is_error=True,
        )
