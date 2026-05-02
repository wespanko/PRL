"""
Constrained optimizer for portfolio improvements.

Searches over (hedge_ticker × hedge_weight) candidate trades, scores each
on a battery of metrics, and returns the trade that best satisfies a given
(objective, constraint) pair.

Three optimization recipes are exposed:
  - optimize_downside_hedge:    min downside_capture s.t. sharpe stays
  - optimize_lower_volatility:  min annualized_volatility s.t. ann_return stays
  - optimize_max_health:        max health_score s.t. ann_return stays

Each uses the same generic grid-search core (~50 candidates, ~10ms each).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

_DEFAULT_HEDGES = ["TLT", "IEF", "AGG", "BND", "BNDX", "GLD", "SHY", "TIP"]
_DEFAULT_WEIGHTS = [0.05, 0.08, 0.12, 0.16, 0.20, 0.25, 0.30]


@dataclass
class _CandidateMetrics:
    hedge: str
    weight: float  # hedge sleeve weight
    sharpe: float
    annualized_return: float
    annualized_volatility: float
    downside_capture: float
    upside_capture: float
    max_drawdown: float
    beta: float
    enp_risk: float
    health_score: float  # 10 - risk_score
    meets_constraint: bool = False


def _scale_and_add_returns(
    base_returns: pd.DataFrame,
    base_weights: list[float],
    hedge_returns: pd.Series,
    hedge_weight: float,
    hedge_in_base: int | None,
) -> pd.Series:
    scaled = [w * (1 - hedge_weight) for w in base_weights]
    if hedge_in_base is not None:
        scaled[hedge_in_base] += hedge_weight
        return base_returns.dot(scaled)
    return base_returns.dot(scaled) + hedge_returns * hedge_weight


def _build_holdings(
    user_tickers: list[str],
    user_weights: list[float],
    hedge: str,
    hedge_weight: float,
) -> list[dict]:
    if hedge in user_tickers:
        idx = user_tickers.index(hedge)
        new_w = [w * (1 - hedge_weight) for w in user_weights]
        new_w[idx] += hedge_weight
        return [{"ticker": t, "weight": round(w, 6)} for t, w in zip(user_tickers, new_w)]
    new = [
        {"ticker": t, "weight": round(w * (1 - hedge_weight), 6)}
        for t, w in zip(user_tickers, user_weights)
    ]
    new.append({"ticker": hedge, "weight": round(hedge_weight, 6)})
    return new


def _compute_health_score(sharpe: float, max_dd: float, enp_risk: float, beta: float) -> float:
    """Mirrors risk.calculator.compute_risk_score, returns 10 - risk_score (so higher = healthier)."""
    sharpe_c = max(0.0, 1.0 - sharpe) * 2.0
    dd_c = min(abs(max_dd) / 0.5, 1.0) * 3.0
    conc_c = max(0.0, 1.0 - enp_risk / 5.0) * 2.5
    beta_c = min(abs(beta) / 2.0, 1.0) * 2.5
    risk_score = min(sharpe_c + dd_c + conc_c + beta_c, 10.0)
    return round(10.0 - risk_score, 4)


def _score_candidate(
    user_tickers: list[str],
    user_weights: list[float],
    user_returns_df: pd.DataFrame,
    hedge: str,
    hedge_weight: float,
    hedge_returns: pd.Series,
    benchmark_returns: pd.Series,
    cov_full_annual: pd.DataFrame,
    rf: float,
) -> _CandidateMetrics:
    from risk.calculator import (
        compute_annualized_return,
        compute_annualized_volatility,
        compute_sharpe,
        compute_capture_ratios,
        compute_max_drawdown,
        compute_beta,
    )

    hedge_in_base = user_tickers.index(hedge) if hedge in user_tickers else None
    new_returns = _scale_and_add_returns(
        user_returns_df, user_weights, hedge_returns, hedge_weight, hedge_in_base
    )

    ann_ret = compute_annualized_return(new_returns)
    ann_vol = compute_annualized_volatility(new_returns)
    sharpe = compute_sharpe(ann_ret, ann_vol, rf)
    up, dc = compute_capture_ratios(new_returns, benchmark_returns)
    dd = compute_max_drawdown(new_returns)
    beta = compute_beta(new_returns, benchmark_returns)

    # ENP_risk via covariance slice — reuse precomputed full cov
    if hedge_in_base is not None:
        slice_tickers = list(user_tickers)
        slice_weights = [w * (1 - hedge_weight) for w in user_weights]
        slice_weights[hedge_in_base] += hedge_weight
    else:
        slice_tickers = list(user_tickers) + [hedge]
        slice_weights = [w * (1 - hedge_weight) for w in user_weights] + [hedge_weight]

    w_arr = np.array(slice_weights, dtype=float)
    cov_slice = cov_full_annual.loc[slice_tickers, slice_tickers].values
    port_var = float(w_arr @ cov_slice @ w_arr)
    if port_var > 0:
        port_vol = np.sqrt(port_var)
        mcr = cov_slice @ w_arr / port_vol
        component_risk = w_arr * mcr
        pct_risk = component_risk / port_vol
        hhi_risk = float(np.sum(pct_risk ** 2))
        enp_risk = 1.0 / hhi_risk if hhi_risk > 0 else float(len(slice_tickers))
    else:
        enp_risk = float(len(slice_tickers))

    health = _compute_health_score(sharpe, dd, enp_risk, beta)

    return _CandidateMetrics(
        hedge=hedge,
        weight=hedge_weight,
        sharpe=round(sharpe, 4),
        annualized_return=round(ann_ret, 4),
        annualized_volatility=round(ann_vol, 4),
        downside_capture=round(dc, 4),
        upside_capture=round(up, 4),
        max_drawdown=round(dd, 4),
        beta=round(beta, 4),
        enp_risk=round(enp_risk, 4),
        health_score=health,
    )


def _candidate_to_dict(c: _CandidateMetrics) -> dict:
    return {
        "hedge": c.hedge,
        "weight": c.weight,
        "sharpe": c.sharpe,
        "downside_capture": c.downside_capture,
        "upside_capture": c.upside_capture,
        "annualized_return": c.annualized_return,
        "annualized_volatility": c.annualized_volatility,
        "max_drawdown": c.max_drawdown,
        "beta": c.beta,
        "enp_risk": c.enp_risk,
        "health_score": c.health_score,
    }


def _optimize_generic(
    payload,
    *,
    objective_attr: str,
    direction: str,  # "min" or "max"
    constraint_attr: str,
    constraint_drop_pct: float,
    name: str,
    description_template: str,
    objective_label: str,
    constraint_label: str,
    objective_fmt: callable,
    candidates: list[str] | None = None,
    weight_grid: list[float] | None = None,
) -> dict | None:
    """
    Generic grid-search optimizer.
    Returns a path dict (compatible with generate_paths) with a `math` block,
    or None if no candidate beats the baseline within the constraint.
    """
    from data.fetcher import fetch_prices
    from risk.calculator import (
        compute_daily_returns,
        compute_portfolio_returns,
        compute_annualized_return,
        compute_annualized_volatility,
        compute_sharpe,
        compute_capture_ratios,
        compute_max_drawdown,
        compute_beta,
    )

    candidates = list(candidates or _DEFAULT_HEDGES)
    weight_grid = list(weight_grid or _DEFAULT_WEIGHTS)

    user_tickers = [h.ticker for h in payload.holdings]
    user_weights = [h.weight for h in payload.holdings]
    benchmark = payload.benchmark
    rf = payload.risk_free_rate

    fetch_list = list(dict.fromkeys(user_tickers + [benchmark] + candidates))
    try:
        prices, _ = fetch_prices(fetch_list, payload.start_date, payload.end_date)
    except Exception:
        return None

    available = [c for c in candidates if c in prices.columns and not prices[c].isna().all()]
    if not available:
        return None

    returns = compute_daily_returns(prices)
    if len(returns) < 30:
        return None

    benchmark_returns = returns[benchmark]
    user_returns_df = returns[user_tickers]
    cov_full_annual = returns.cov() * 252

    # Baseline on the same window
    baseline_port_returns = compute_portfolio_returns(user_returns_df, user_weights)
    bl_ann_ret = compute_annualized_return(baseline_port_returns)
    bl_ann_vol = compute_annualized_volatility(baseline_port_returns)
    bl_sharpe = compute_sharpe(bl_ann_ret, bl_ann_vol, rf)
    bl_up, bl_dc = compute_capture_ratios(baseline_port_returns, benchmark_returns)
    bl_dd = compute_max_drawdown(baseline_port_returns)
    bl_beta = compute_beta(baseline_port_returns, benchmark_returns)

    # Baseline ENP_risk
    w_arr = np.array(user_weights, dtype=float)
    cov_user = cov_full_annual.loc[user_tickers, user_tickers].values
    bl_port_var = float(w_arr @ cov_user @ w_arr)
    if bl_port_var > 0:
        bl_port_vol = np.sqrt(bl_port_var)
        mcr = cov_user @ w_arr / bl_port_vol
        cr = w_arr * mcr
        pr = cr / bl_port_vol
        bl_enp = 1.0 / float(np.sum(pr ** 2))
    else:
        bl_enp = float(len(user_tickers))

    bl_health = _compute_health_score(bl_sharpe, bl_dd, bl_enp, bl_beta)

    baseline = _CandidateMetrics(
        hedge="(current)",
        weight=0.0,
        sharpe=round(bl_sharpe, 4),
        annualized_return=round(bl_ann_ret, 4),
        annualized_volatility=round(bl_ann_vol, 4),
        downside_capture=round(bl_dc, 4),
        upside_capture=round(bl_up, 4),
        max_drawdown=round(bl_dd, 4),
        beta=round(bl_beta, 4),
        enp_risk=round(bl_enp, 4),
        health_score=bl_health,
    )

    # Sanity guards: optimizer assumes higher-is-better constraint metric.
    # When the baseline is negative or near-zero, the multiplicative floor
    # inverts and optimization becomes meaningless — fall back to None.
    constraint_baseline = getattr(baseline, constraint_attr)
    if constraint_attr == "sharpe" and constraint_baseline < 0.2:
        return None
    if constraint_attr == "annualized_return" and constraint_baseline < 0.02:
        return None

    constraint_floor = constraint_baseline * (1 - constraint_drop_pct)

    evaluated: list[_CandidateMetrics] = []
    for hedge in available:
        hedge_returns = returns[hedge]
        for w_h in weight_grid:
            c = _score_candidate(
                user_tickers, user_weights, user_returns_df,
                hedge, w_h, hedge_returns, benchmark_returns,
                cov_full_annual, rf,
            )
            c.meets_constraint = getattr(c, constraint_attr) >= constraint_floor
            evaluated.append(c)

    # Filter feasible AND that improve on the objective
    bl_obj = getattr(baseline, objective_attr)
    if direction == "min":
        feasible = [c for c in evaluated if c.meets_constraint and getattr(c, objective_attr) < bl_obj]
        if not feasible:
            return None
        best = min(feasible, key=lambda c: (getattr(c, objective_attr), -c.sharpe))
        frontier = sorted(feasible, key=lambda c: getattr(c, objective_attr))[:5]
    else:  # "max"
        feasible = [c for c in evaluated if c.meets_constraint and getattr(c, objective_attr) > bl_obj]
        if not feasible:
            return None
        best = max(feasible, key=lambda c: (getattr(c, objective_attr), c.sharpe))
        frontier = sorted(feasible, key=lambda c: -getattr(c, objective_attr))[:5]

    from risk.improvement import _normalize  # local import to avoid circular
    new_holdings = _normalize(_build_holdings(user_tickers, user_weights, best.hedge, best.weight))

    bl_obj_v = getattr(baseline, objective_attr)
    new_obj_v = getattr(best, objective_attr)
    obj_pct_change = (new_obj_v - bl_obj_v) / bl_obj_v if bl_obj_v else 0.0

    bl_con_v = getattr(baseline, constraint_attr)
    new_con_v = getattr(best, constraint_attr)
    con_pct_change = (new_con_v - bl_con_v) / bl_con_v if bl_con_v else 0.0

    description = description_template.format(
        n_evaluated=len(evaluated),
        n_hedges=len(available),
        n_levels=len(weight_grid),
        weight_pct=int(round(best.weight * 100)),
        hedge=best.hedge,
        constraint_drop_pct=int(round(constraint_drop_pct * 100)),
    )

    gain_dir = "−" if direction == "min" else "+"
    tradeoff_gain = (
        f"{objective_label} {objective_fmt(bl_obj_v)} → {objective_fmt(new_obj_v)} "
        f"({gain_dir}{abs(obj_pct_change) * 100:.1f}%)"
    )
    tradeoff_give = (
        f"{constraint_label} {bl_con_v:.2f} → {new_con_v:.2f} "
        f"({con_pct_change * 100:+.1f}%) — within constraint"
    )

    return {
        "name": name,
        "description": description,
        "tradeoff": {"gain": tradeoff_gain, "give_up": tradeoff_give},
        "holdings": new_holdings,
        "math": {
            "objective": f"{direction}imize_{objective_attr}",
            "objective_label": objective_label,
            "constraint": (
                f"{constraint_attr} >= baseline * (1 - {constraint_drop_pct:.2f}) "
                f"= {constraint_floor:.4f}"
            ),
            "constraint_label": constraint_label,
            "baseline": _candidate_to_dict(baseline),
            "selected": _candidate_to_dict(best),
            "deltas": {
                "objective_pct_change": round(obj_pct_change, 4),
                "constraint_pct_change": round(con_pct_change, 4),
            },
            "candidates_evaluated": len(evaluated),
            "candidates_feasible": len(feasible),
            "pareto_frontier": [_candidate_to_dict(c) for c in frontier],
            "max_drop_pct": constraint_drop_pct,
            "objective_attr": objective_attr,
            "constraint_attr": constraint_attr,
        },
    }


# ── Public optimizer recipes ──────────────────────────────────────────────

def optimize_downside_hedge(payload, max_sharpe_drop_pct: float = 0.15) -> dict | None:
    return _optimize_generic(
        payload,
        objective_attr="downside_capture",
        direction="min",
        constraint_attr="sharpe",
        constraint_drop_pct=max_sharpe_drop_pct,
        name="Optimized Hedge",
        objective_label="Downside Capture",
        constraint_label="Sharpe",
        objective_fmt=lambda v: f"{v:.2f}×",
        description_template=(
            "Searched {n_evaluated} candidate trades across {n_hedges} hedge instruments "
            "× {n_levels} sizing levels. Selected {weight_pct}% {hedge} as the trade that "
            "reduces downside capture most while keeping Sharpe within {constraint_drop_pct}% "
            "of baseline."
        ),
    )


def optimize_lower_volatility(payload, max_return_drop_pct: float = 0.10) -> dict | None:
    return _optimize_generic(
        payload,
        objective_attr="annualized_volatility",
        direction="min",
        constraint_attr="annualized_return",
        constraint_drop_pct=max_return_drop_pct,
        name="Lower Volatility",
        objective_label="Volatility",
        constraint_label="Ann. Return",
        objective_fmt=lambda v: f"{v * 100:.1f}%",
        description_template=(
            "Searched {n_evaluated} candidate trades for the move that reduces annualized "
            "volatility most while keeping annualized return within {constraint_drop_pct}% "
            "of baseline. Selected {weight_pct}% {hedge}."
        ),
    )


def optimize_max_health(payload, max_return_drop_pct: float = 0.10) -> dict | None:
    return _optimize_generic(
        payload,
        objective_attr="health_score",
        direction="max",
        constraint_attr="annualized_return",
        constraint_drop_pct=max_return_drop_pct,
        name="Maximize Health",
        objective_label="Health Score",
        constraint_label="Ann. Return",
        objective_fmt=lambda v: f"{v:.1f}/10",
        description_template=(
            "Searched {n_evaluated} candidate trades for the move that lifts the composite "
            "Health Score (Sharpe + Drawdown + Diversification + Beta) most, while keeping "
            "annualized return within {constraint_drop_pct}% of baseline. Selected {weight_pct}% {hedge}."
        ),
    )
