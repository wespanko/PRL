"""
Panko Score — branded 0-100 composite of five pillars (each 20 pts).

Same underlying math as the legacy Health Score, but explicitly broken into
5 named dimensions so users can see *why* their score is what it is.
"""

from __future__ import annotations


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _diversification_pillar(enp_risk: float | None) -> float:
    """ENP_risk of 1 → 0 pts; 5+ → 20 pts. Linear in between."""
    if enp_risk is None:
        return 10.0
    return _clamp((enp_risk - 1.0) / (5.0 - 1.0)) * 20.0


def _risk_adjusted_return_pillar(sharpe: float | None) -> float:
    """Sharpe of 0 → 0 pts; 1.5+ → 20 pts. Negative Sharpe → 0."""
    if sharpe is None:
        return 10.0
    return _clamp(sharpe / 1.5) * 20.0


def _drawdown_resilience_pillar(max_dd: float | None) -> float:
    """Max DD of 0 → 20 pts; -50% or worse → 0 pts. Linear."""
    if max_dd is None:
        return 10.0
    abs_dd = abs(max_dd)
    return (1.0 - _clamp(abs_dd / 0.50)) * 20.0


def _macro_resilience_pillar(stress_scenarios: dict | None, beta: float | None) -> float:
    """
    Combine the worst-case stress scenario with beta to produce a single
    "macro resilience" score. Worst stress better than -10% → 20 pts;
    worse than -40% → 0 pts. Beta penalty: |β−1| > 0.5 docks up to 5 pts.
    """
    base = 10.0
    if stress_scenarios:
        worst = min(stress_scenarios.values())
        # worst is typically negative; map -0.10 → 20 pts, -0.40 → 0 pts
        normalized = _clamp((-worst - 0.10) / (0.40 - 0.10))
        base = (1.0 - normalized) * 20.0

    if beta is not None:
        beta_dev = abs(beta - 1.0)
        beta_penalty = _clamp(beta_dev / 0.5) * 5.0
        base = max(0.0, base - beta_penalty)

    return base


def _allocation_efficiency_pillar(risk_contributions: list[dict] | None) -> float:
    """
    Drift between capital weights and risk shares. Perfect alignment
    (PRC == weight for every position) = 20 pts.

    Aggregate drift = Σ |PRC_i − w_i|. Drift of 0 → 20 pts; drift of
    ≥0.6 → 0 pts (heavy concentration mismatch).
    """
    if not risk_contributions:
        return 10.0
    drift = sum(abs(rc.get("pct_risk", 0) - rc.get("weight", 0)) for rc in risk_contributions)
    return (1.0 - _clamp(drift / 0.6)) * 20.0


def _band(score: float) -> dict:
    if score >= 80:
        return {"label": "Strong", "tone": "good"}
    if score >= 60:
        return {"label": "Moderate", "tone": "ok"}
    if score >= 40:
        return {"label": "Elevated risk", "tone": "warn"}
    return {"label": "High risk", "tone": "bad"}


def compute_panko_score(results: dict) -> dict:
    """
    Compute the Panko Score (0-100) from analysis results.

    Returns a dict with the total score, band, and per-pillar breakdown:
        {
          "total": 74,
          "band": {"label": "Moderate", "tone": "ok"},
          "pillars": [
              {"id": "diversification",        "label": "Diversification",        "value": 14.2, "max": 20, "raw": 4.55, "raw_label": "ENP 4.6"},
              ...
          ],
        }
    """
    sharpe = results.get("sharpe_ratio")
    max_dd = results.get("max_drawdown")
    beta = results.get("beta")
    enp_risk = results.get("concentration", {}).get("enp_risk")
    stress = results.get("stress_scenarios") or {}
    risk_contribs = results.get("risk_contributions") or []

    p_div = _diversification_pillar(enp_risk)
    p_rar = _risk_adjusted_return_pillar(sharpe)
    p_dd = _drawdown_resilience_pillar(max_dd)
    p_mac = _macro_resilience_pillar(stress, beta)
    p_alloc = _allocation_efficiency_pillar(risk_contribs)

    total = round(p_div + p_rar + p_dd + p_mac + p_alloc)
    total = max(0, min(100, total))

    worst_stress_value = min(stress.values()) if stress else None
    worst_stress_name = (
        min(stress.items(), key=lambda x: x[1])[0] if stress else None
    )

    pillars = [
        {
            "id": "diversification",
            "label": "Diversification",
            "value": round(p_div, 1),
            "max": 20,
            "raw": round(enp_risk, 2) if enp_risk is not None else None,
            "raw_label": f"ENP {enp_risk:.1f}" if enp_risk is not None else "—",
            "description": "How many independent risk bets you actually have.",
        },
        {
            "id": "risk_adjusted_return",
            "label": "Risk-Adjusted Return",
            "value": round(p_rar, 1),
            "max": 20,
            "raw": round(sharpe, 2) if sharpe is not None else None,
            "raw_label": f"Sharpe {sharpe:.2f}" if sharpe is not None else "—",
            "description": "Excess return earned per unit of volatility.",
        },
        {
            "id": "drawdown_resilience",
            "label": "Drawdown Resilience",
            "value": round(p_dd, 1),
            "max": 20,
            "raw": round(max_dd, 4) if max_dd is not None else None,
            "raw_label": f"Max DD {max_dd * 100:.1f}%" if max_dd is not None else "—",
            "description": "How well you held up at the worst observed point.",
        },
        {
            "id": "macro_resilience",
            "label": "Macro Resilience",
            "value": round(p_mac, 1),
            "max": 20,
            "raw": round(worst_stress_value, 4) if worst_stress_value is not None else None,
            "raw_label": (
                f"Worst stress {worst_stress_value * 100:.1f}%"
                if worst_stress_value is not None else "—"
            ),
            "description": (
                f"Performance under the worst stress scenario "
                f"({worst_stress_name})." if worst_stress_name else
                "Performance under stress scenarios."
            ),
        },
        {
            "id": "allocation_efficiency",
            "label": "Allocation Efficiency",
            "value": round(p_alloc, 1),
            "max": 20,
            "raw": None,
            "raw_label": (
                "Capital-risk aligned"
                if p_alloc >= 14 else "Hidden risk concentration"
            ),
            "description": "Whether your capital weights match your risk shares.",
        },
    ]

    return {
        "total": total,
        "band": _band(total),
        "pillars": pillars,
    }
