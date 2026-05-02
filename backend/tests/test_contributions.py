import numpy as np
import pandas as pd
import pytest

from risk.contributions import compute_concentration, compute_risk_contributions
from risk.periods import compute_best_periods, compute_worst_periods
from risk.calculator import compute_capture_ratios, compute_var_cvar


# ── compute_risk_contributions ────────────────────────────────────────────────

def _returns(data: dict, n: int = 50) -> pd.DataFrame:
    rng = np.random.default_rng(0)
    dates = pd.bdate_range("2023-01-01", periods=n)
    df = pd.DataFrame(
        {k: rng.normal(v[0], v[1], n) for k, v in data.items()},
        index=dates,
    )
    return df


def test_risk_contributions_single_ticker_prc_is_one():
    returns = _returns({"A": (0.001, 0.01)})
    result = compute_risk_contributions(returns, [1.0])
    assert len(result) == 1
    assert result[0]["pct_risk"] == pytest.approx(1.0, abs=1e-6)


def test_risk_contributions_sum_to_one():
    returns = _returns({"A": (0.001, 0.01), "B": (0.0005, 0.015), "C": (0.002, 0.008)})
    result = compute_risk_contributions(returns, [0.5, 0.3, 0.2])
    total = sum(r["pct_risk"] for r in result)
    assert total == pytest.approx(1.0, abs=1e-5)


def test_risk_contributions_perfectly_correlated_equal_weights_split_evenly():
    # Both assets are identical → equal PRC of 0.5 each
    n = 50
    dates = pd.bdate_range("2023-01-01", periods=n)
    shared = pd.Series(np.random.default_rng(1).normal(0.001, 0.01, n), index=dates)
    returns = pd.DataFrame({"A": shared, "B": shared}, index=dates)
    result = compute_risk_contributions(returns, [0.5, 0.5])
    assert result[0]["pct_risk"] == pytest.approx(0.5, abs=1e-5)
    assert result[1]["pct_risk"] == pytest.approx(0.5, abs=1e-5)


def test_risk_contributions_high_vol_asset_drives_more_risk():
    # B has 5× the volatility of A; with equal weights B should dominate risk
    returns = _returns({"A": (0.001, 0.002), "B": (0.001, 0.010)})
    result = compute_risk_contributions(returns, [0.5, 0.5])
    prc_b = next(r["pct_risk"] for r in result if r["ticker"] == "B")
    prc_a = next(r["pct_risk"] for r in result if r["ticker"] == "A")
    assert prc_b > prc_a


def test_risk_contributions_weight_field_matches_input():
    returns = _returns({"X": (0.001, 0.01), "Y": (0.001, 0.01)})
    result = compute_risk_contributions(returns, [0.7, 0.3])
    assert result[0]["weight"] == pytest.approx(0.7, abs=1e-6)
    assert result[1]["weight"] == pytest.approx(0.3, abs=1e-6)


# ── compute_concentration ─────────────────────────────────────────────────────

def test_concentration_single_position():
    c = compute_concentration([1.0])
    assert c["hhi"] == pytest.approx(1.0)
    assert c["effective_n"] == pytest.approx(1.0)
    assert c["top1_weight"] == pytest.approx(1.0)


def test_concentration_equal_weights_four_positions():
    c = compute_concentration([0.25, 0.25, 0.25, 0.25])
    assert c["hhi"] == pytest.approx(0.25)
    assert c["effective_n"] == pytest.approx(4.0)


def test_concentration_top3_weight_sums_correctly():
    c = compute_concentration([0.4, 0.3, 0.2, 0.1])
    assert c["top1_weight"] == pytest.approx(0.4)
    assert c["top3_weight"] == pytest.approx(0.9)
    assert c["top5_weight"] == pytest.approx(1.0)  # only 4 weights, all included


def test_concentration_top5_capped_at_all_weights():
    # Fewer than 5 positions → top5 is the total of all weights
    c = compute_concentration([0.6, 0.4])
    assert c["top5_weight"] == pytest.approx(1.0)


def test_concentration_hhi_range():
    # HHI always between 1/N and 1
    weights = [0.5, 0.3, 0.2]
    c = compute_concentration(weights)
    n = len(weights)
    assert 1 / n <= c["hhi"] <= 1.0


# ── compute_var_cvar ──────────────────────────────────────────────────────────

def _portfolio_returns(n: int = 252, seed: int = 42) -> pd.Series:
    rng = np.random.default_rng(seed)
    return pd.Series(rng.normal(0.001, 0.01, n))


def test_var_is_negative():
    var, _ = compute_var_cvar(_portfolio_returns())
    assert var < 0


def test_cvar_is_at_least_as_negative_as_var():
    var, cvar = compute_var_cvar(_portfolio_returns())
    assert cvar <= var


def test_var_cvar_monthly_scaling():
    # Daily 5th-percentile × √22 should match the returned var
    returns = _portfolio_returns()
    daily_var = float(returns.sort_values().quantile(0.05))
    expected_var = round(daily_var * np.sqrt(22), 6)
    var, _ = compute_var_cvar(returns)
    assert var == pytest.approx(expected_var)


# ── compute_capture_ratios ────────────────────────────────────────────────────

def test_capture_ratio_perfect_tracking():
    returns = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02])
    up, down = compute_capture_ratios(returns, returns)
    assert up == pytest.approx(1.0)
    assert down == pytest.approx(1.0)


def test_capture_ratio_double_benchmark():
    bench = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02])
    up, down = compute_capture_ratios(bench * 2, bench)
    assert up == pytest.approx(2.0)
    assert down == pytest.approx(2.0)


def test_capture_ratio_cash_portfolio():
    bench = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02])
    zero = pd.Series([0.0] * 5)
    up, down = compute_capture_ratios(zero, bench)
    assert up == pytest.approx(0.0)
    assert down == pytest.approx(0.0)


# ── compute_worst_periods / compute_best_periods ──────────────────────────────

def _dated_returns(n: int = 100, seed: int = 7) -> pd.Series:
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2023-01-01", periods=n)
    return pd.Series(rng.normal(0.001, 0.015, n), index=dates)


def test_worst_periods_returns_n_results():
    returns = _dated_returns()
    worst = compute_worst_periods(returns, n=3)
    assert len(worst) == 3


def test_worst_periods_are_negative():
    returns = _dated_returns()
    worst = compute_worst_periods(returns, n=3)
    for period in worst:
        assert period["return"] < 0


def test_worst_periods_are_ordered_worst_first():
    returns = _dated_returns()
    worst = compute_worst_periods(returns, n=3)
    returns_list = [p["return"] for p in worst]
    assert returns_list == sorted(returns_list)


def test_best_periods_returns_n_results():
    returns = _dated_returns()
    best = compute_best_periods(returns, n=3)
    assert len(best) == 3


def test_best_periods_are_positive():
    returns = _dated_returns()
    best = compute_best_periods(returns, n=3)
    for period in best:
        assert period["return"] > 0


def test_periods_have_required_keys():
    returns = _dated_returns()
    period = compute_worst_periods(returns, n=1)[0]
    assert {"start", "end", "return", "label"} <= period.keys()


def test_worst_less_than_best():
    returns = _dated_returns()
    worst = compute_worst_periods(returns, n=1)[0]["return"]
    best = compute_best_periods(returns, n=1)[0]["return"]
    assert worst < best
