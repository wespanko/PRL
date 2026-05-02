"""
Rules-based portfolio improvement path generator.

Instruments added by paths are drawn exclusively from this curated list:
  SPY, AGG, GLD, TLT, EFA, VNQ, QQQ, BND, BNDX, VT
No individual stocks are ever added — only the user's existing positions are resized.
"""

_CURATED_SAFE_HAVENS = ["AGG", "GLD", "TLT", "BND"]
_CURATED_DIVERSIFIERS = ["EFA", "VNQ", "BNDX", "VT"]


def _normalize(holdings: list[dict]) -> list[dict]:
    """Normalize weights to sum exactly to 1.0."""
    total = sum(h["weight"] for h in holdings)
    if total == 0:
        return holdings
    result = [{"ticker": h["ticker"], "weight": h["weight"] / total} for h in holdings]
    # Fix floating-point drift
    drift = 1.0 - sum(r["weight"] for r in result)
    if abs(drift) > 1e-12:
        max_idx = max(range(len(result)), key=lambda i: result[i]["weight"])
        result[max_idx]["weight"] += drift
    return result


def _merge_add(holdings: list[dict], ticker: str, weight: float) -> list[dict]:
    """Add `weight` to an existing ticker, or append a new one."""
    for h in holdings:
        if h["ticker"] == ticker:
            return [
                {"ticker": h2["ticker"], "weight": h2["weight"] + (weight if h2["ticker"] == ticker else 0)}
                for h2 in holdings
            ]
    return holdings + [{"ticker": ticker, "weight": weight}]


def _first_absent(holdings: list[dict], candidates: list[str]) -> str:
    """Return the first candidate ticker not already in holdings."""
    tickers = {h["ticker"] for h in holdings}
    for c in candidates:
        if c not in tickers:
            return c
    return candidates[0]  # fall back to first even if present


def _build_lower_risk_path(holdings: list[dict], results: dict) -> dict | None:
    """Cap the largest position and add bond ballast (AGG)."""
    if not holdings:
        return None

    tickers = [h["ticker"] for h in holdings]
    weights = [h["weight"] for h in holdings]

    max_idx = max(range(len(weights)), key=lambda i: weights[i])
    orig_w = weights[max_idx]
    capped_w = max(orig_w - 0.15, 0.10)

    new_holdings = [{"ticker": t, "weight": w} for t, w in zip(tickers, weights)]
    new_holdings[max_idx]["weight"] = capped_w

    # For a single holding, add SPY too as core equity replacement
    if len(holdings) == 1:
        new_holdings = _merge_add(new_holdings, "SPY", 0.15)

    ballast = _first_absent(new_holdings, ["AGG", "BND"])
    new_holdings = _merge_add(new_holdings, ballast, 0.20)
    new_holdings = _normalize(new_holdings)

    return {
        "name": "Lower Risk",
        "description": (
            f"Trims {tickers[max_idx]} and adds {ballast} (broad bonds) "
            "to reduce tail risk and smooth volatility."
        ),
        "tradeoff": {
            "gain": "Lower drawdown, lower volatility, more stable month-to-month returns",
            "give_up": "Some upside if your current holdings continue to outperform",
        },
        "holdings": new_holdings,
    }


def _build_diversified_path(holdings: list[dict], results: dict) -> dict | None:
    """Trim top-theme positions 20% and add international diversifier (EFA)."""
    exposures = results.get("exposures", {})
    themes = exposures.get("themes", {})
    classified = exposures.get("classified_tickers", {})

    if not themes or not holdings:
        return None

    top_theme = max(themes.items(), key=lambda x: x[1])[0]
    tickers = [h["ticker"] for h in holdings]
    weights = [h["weight"] for h in holdings]

    freed = 0.0
    new_weights = []
    for ticker, weight in zip(tickers, weights):
        ticker_theme = classified.get(ticker, {}).get("theme", "")
        if ticker_theme == top_theme:
            trim = weight * 0.20
            freed += trim
            new_weights.append(weight - trim)
        else:
            new_weights.append(weight)

    if freed < 0.02:
        return None

    new_holdings = [{"ticker": t, "weight": w} for t, w in zip(tickers, new_weights)]
    diversifier = _first_absent(new_holdings, ["EFA", "VNQ", "BNDX"])
    new_holdings = _merge_add(new_holdings, diversifier, freed)
    new_holdings = _normalize(new_holdings)

    return {
        "name": "Better Diversified",
        "description": (
            f"Trims {top_theme} holdings by 20% and adds {diversifier} "
            "(international developed markets) to reduce thematic concentration."
        ),
        "tradeoff": {
            "gain": "Higher real diversification, lower theme correlation, reduced hidden concentration",
            "give_up": "Less concentrated upside if the current theme continues to outperform",
        },
        "holdings": new_holdings,
    }


def _build_lower_drawdown_path(holdings: list[dict]) -> dict | None:
    """Add GLD + AGG ballast (25% total) to cushion equity selloffs."""
    if not holdings:
        return None

    # Scale existing positions to 75%
    new_holdings = [{"ticker": h["ticker"], "weight": h["weight"] * 0.75} for h in holdings]

    gold = _first_absent(new_holdings, ["GLD", "IAU"])
    bonds = _first_absent(new_holdings, ["AGG", "BND", "TLT"])

    new_holdings = _merge_add(new_holdings, gold, 0.15)
    new_holdings = _merge_add(new_holdings, bonds, 0.10)
    new_holdings = _normalize(new_holdings)

    return {
        "name": "Lower Drawdown",
        "description": (
            f"Adds {gold} (gold) and {bonds} (bonds) to cushion equity selloffs "
            "while keeping your core holdings intact."
        ),
        "tradeoff": {
            "gain": "Smaller worst-case drawdowns, lower tail risk, crisis cushion from uncorrelated assets",
            "give_up": "Lower returns in sustained bull markets — 25% allocated to low-return defensive assets",
        },
        "holdings": new_holdings,
    }


def _build_benchmark_balanced_path(holdings: list[dict]) -> dict | None:
    """Scale holdings to 60% and add SPY 20% + AGG 20%."""
    if not holdings:
        return None

    new_holdings = [{"ticker": h["ticker"], "weight": h["weight"] * 0.60} for h in holdings]
    new_holdings = _merge_add(new_holdings, "SPY", 0.20)
    new_holdings = _merge_add(new_holdings, "AGG", 0.20)
    new_holdings = _normalize(new_holdings)

    return {
        "name": "Benchmark Balanced",
        "description": (
            "Scales current holdings to 60% and adds SPY + AGG to approximate "
            "a traditional 60/40 risk profile. Shown as a structural baseline."
        ),
        "tradeoff": {
            "gain": "Lower beta, better Sharpe ratio, reduced drawdown — closer to a balanced institutional profile",
            "give_up": "Significantly lower upside in strong equity bull markets",
        },
        "holdings": new_holdings,
    }


def _holdings_fingerprint(holdings: list[dict]) -> tuple:
    return tuple(sorted((h["ticker"], round(h["weight"], 2)) for h in holdings))


def generate_paths(results: dict, payload, max_drop_pct: float = 0.15) -> list[dict]:
    """
    Generate 2-5 improvement paths based on detected weaknesses.
    Each path's holdings are run through run_analysis() for real metrics.

    Path order (most differentiated first):
      1. Maximize Health    (optimizer, when health < 7)
      2. Optimized Hedge    (optimizer, when downside risk is the issue)
      3. Lower Volatility   (optimizer, when volatility is high)
      4. Better Diversified (rule-based, when thematic concentration)
      5. Benchmark Balanced (rule-based, always)
    """
    from risk.weaknesses import detect_weaknesses
    from risk.calculator import run_analysis
    from risk.optimizer import (
        optimize_downside_hedge,
        optimize_lower_volatility,
        optimize_max_health,
    )
    from models.schemas import Holding, PortfolioRequest

    weaknesses = detect_weaknesses(results)
    weakness_ids = {w["id"] for w in weaknesses}
    enp_risk = results.get("concentration", {}).get("enp_risk", 99)
    downside_capture = results.get("downside_capture", 1.0)
    ann_vol = results.get("annualized_volatility", 0.0)
    risk_score = results.get("risk_score", 5.0)
    health_score = max(0.0, 10.0 - risk_score)

    holdings = [{"ticker": h.ticker, "weight": h.weight} for h in payload.holdings]
    raw_paths: list[dict] = []

    def _try(fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception:
            return None

    # 1. Maximize Health — broad target when overall health is low
    if health_score < 7.0:
        opt = _try(optimize_max_health, payload, max_return_drop_pct=max_drop_pct)
        if opt:
            raw_paths.append(opt)

    # 2. Optimized Hedge — surfaces when downside is the dominant problem
    if downside_capture > 1.10 or weakness_ids & {"downside_capture", "var_warning", "no_hedges"}:
        opt = _try(optimize_downside_hedge, payload, max_sharpe_drop_pct=max_drop_pct)
        if opt:
            raw_paths.append(opt)

    # 3. Lower Volatility — when raw volatility is the main pain
    if ann_vol > 0.22 or weakness_ids & {"concentration"}:
        opt = _try(optimize_lower_volatility, payload, max_return_drop_pct=max_drop_pct)
        if opt:
            raw_paths.append(opt)

    # 4. Rule-based: Better Diversified (themes — optimizer doesn't address theme overlap)
    if weakness_ids & {"thematic_overlap", "rate_sensitivity", "concentration"} or enp_risk < 4.0:
        p = _build_diversified_path(holdings, results)
        if p:
            raw_paths.append(p)

    # 5. Rule-based fallback: Lower Risk (cap top + AGG) when no optimizer path ran
    if not any(p.get("math") for p in raw_paths) and ("concentration" in weakness_ids or enp_risk < 4.0):
        p = _build_lower_risk_path(holdings, results)
        if p:
            raw_paths.append(p)

    # 6. Rule-based: Benchmark Balanced — always
    p = _build_benchmark_balanced_path(holdings)
    if p:
        raw_paths.append(p)

    # De-duplicate paths that produce nearly identical portfolios
    seen: set[tuple] = set()
    orig_fp = _holdings_fingerprint(holdings)
    unique_paths: list[dict] = []
    for path in raw_paths:
        fp = _holdings_fingerprint(path["holdings"])
        if fp != orig_fp and fp not in seen:
            seen.add(fp)
            unique_paths.append(path)

    # Run analysis for each path (price cache makes this fast)
    for path in unique_paths:
        try:
            sim_payload = PortfolioRequest(
                holdings=[Holding(ticker=h["ticker"], weight=h["weight"]) for h in path["holdings"]],
                start_date=payload.start_date,
                end_date=payload.end_date,
                benchmark=payload.benchmark,
                risk_free_rate=payload.risk_free_rate,
            )
            path["results"] = run_analysis(sim_payload)
        except Exception as exc:
            path["results"] = None
            path["error"] = str(exc)

    return unique_paths
