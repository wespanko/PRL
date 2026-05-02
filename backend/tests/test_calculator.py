import numpy as np
import pandas as pd
import pytest

from risk.calculator import (
    compute_annualized_return,
    compute_annualized_volatility,
    compute_beta,
    compute_correlation_matrix,
    compute_daily_returns,
    compute_drawdown_series,
    compute_max_drawdown,
    compute_portfolio_returns,
    compute_sharpe,
)


# ── compute_daily_returns ────────────────────────────────────────────────────

def test_daily_returns_values():
    prices = pd.DataFrame({"A": [100.0, 105.0, 102.0, 108.0, 104.0]})
    r = compute_daily_returns(prices)
    assert len(r) == 4
    assert r["A"].iloc[0] == pytest.approx(0.05)
    assert r["A"].iloc[1] == pytest.approx(-3 / 105)
    assert r["A"].iloc[2] == pytest.approx(6 / 102)
    assert r["A"].iloc[3] == pytest.approx(-4 / 108)


def test_daily_returns_drops_first_row():
    prices = pd.DataFrame({"A": [10.0, 12.0, 11.0]})
    assert len(compute_daily_returns(prices)) == 2


# ── compute_portfolio_returns ────────────────────────────────────────────────

def test_portfolio_returns_single_ticker_equals_asset_return():
    # Weight of 1.0 → portfolio return must equal the asset return exactly
    daily_returns = pd.DataFrame({"A": [0.10, -9 / 110]})
    portfolio = compute_portfolio_returns(daily_returns, [1.0])
    assert portfolio.iloc[0] == pytest.approx(0.10)
    assert portfolio.iloc[1] == pytest.approx(-9 / 110)


def test_portfolio_returns_two_tickers_equal_weights():
    daily_returns = pd.DataFrame({
        "A": [0.10, -0.05],
        "B": [0.02,  0.08],
    })
    portfolio = compute_portfolio_returns(daily_returns, [0.5, 0.5])
    assert portfolio.iloc[0] == pytest.approx(0.06)   # 0.5*0.10 + 0.5*0.02
    assert portfolio.iloc[1] == pytest.approx(0.015)  # 0.5*(-0.05) + 0.5*0.08


# ── compute_annualized_volatility ────────────────────────────────────────────

def test_volatility_constant_returns_is_zero():
    assert compute_annualized_volatility(pd.Series([0.01] * 100)) == pytest.approx(0.0)


def test_volatility_scales_by_sqrt_252():
    rng = np.random.default_rng(42)
    returns = pd.Series(rng.normal(0, 0.01, 500))
    expected = returns.std(ddof=1) * np.sqrt(252)
    assert compute_annualized_volatility(returns) == pytest.approx(expected)


# ── compute_annualized_return ────────────────────────────────────────────────

def test_annualized_return_constant_daily():
    returns = pd.Series([0.01] * 252)
    expected = (1.01 ** 252) - 1
    assert compute_annualized_return(returns) == pytest.approx(expected)


# ── compute_sharpe ───────────────────────────────────────────────────────────

def test_sharpe_ratio_basic():
    assert compute_sharpe(0.12, 0.20, 0.04) == pytest.approx(0.40)


def test_sharpe_ratio_zero_excess_return():
    assert compute_sharpe(0.04, 0.20, 0.04) == pytest.approx(0.0)


def test_sharpe_ratio_zero_volatility_returns_zero():
    # Undefined mathematically; convention is 0.0 to avoid ZeroDivisionError
    assert compute_sharpe(0.10, 0.0, 0.04) == pytest.approx(0.0)


# ── compute_beta ─────────────────────────────────────────────────────────────

def test_beta_portfolio_equals_benchmark():
    returns = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02])
    assert compute_beta(returns, returns) == pytest.approx(1.0)


def test_beta_double_benchmark():
    # Portfolio = 2× benchmark → Cov(2B, B) / Var(B) = 2
    benchmark = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02])
    assert compute_beta(benchmark * 2, benchmark) == pytest.approx(2.0)


# ── compute_max_drawdown ─────────────────────────────────────────────────────

def test_max_drawdown_always_increasing():
    # Prices never fall → drawdown = 0
    returns = pd.Series([0.01, 0.02, 0.005, 0.01])
    assert compute_max_drawdown(returns) == pytest.approx(0.0)


def test_max_drawdown_fifty_percent_drop():
    # 100 → 50: peak=100, trough=50, drawdown=-50%
    returns = pd.Series([-0.50, 1.0])
    assert compute_max_drawdown(returns) == pytest.approx(-0.50)


def test_max_drawdown_takes_larger_of_two_drawdowns():
    # Prices: 100 → 80 (-20%) → 120 (new high) → 84 (-30% from 120)
    # Max drawdown should be -30%, not -20%
    returns = pd.Series([-0.20, 0.50, -0.30])
    assert compute_max_drawdown(returns) == pytest.approx(-0.30)


def test_max_drawdown_no_recovery():
    # Prices: 100 → 50 → 40, measured from starting value of 100
    # Total loss = -60%
    returns = pd.Series([-0.50, -0.20])
    assert compute_max_drawdown(returns) == pytest.approx(-0.60)


# ── compute_drawdown_series ──────────────────────────────────────────────────

def test_drawdown_series_length_matches_returns():
    returns = pd.Series([0.05, -0.10, 0.03, -0.02])
    series = compute_drawdown_series(returns)
    assert len(series) == len(returns)


def test_drawdown_series_min_equals_max_drawdown():
    returns = pd.Series([-0.20, 0.50, -0.30])
    series = compute_drawdown_series(returns)
    assert series.min() == pytest.approx(compute_max_drawdown(returns))


# ── compute_correlation_matrix ───────────────────────────────────────────────

def test_correlation_matrix_diagonal_is_one():
    returns = pd.DataFrame({
        "A": [0.01, -0.02, 0.03, 0.01],
        "B": [0.02, -0.01, 0.01, -0.02],
    })
    corr = compute_correlation_matrix(returns)
    assert corr["A"]["A"] == pytest.approx(1.0)
    assert corr["B"]["B"] == pytest.approx(1.0)


def test_correlation_matrix_is_symmetric():
    returns = pd.DataFrame({
        "A": [0.01, -0.02, 0.03, 0.01],
        "B": [0.02, -0.01, 0.01, -0.02],
    })
    corr = compute_correlation_matrix(returns)
    assert corr["A"]["B"] == pytest.approx(corr["B"]["A"])
