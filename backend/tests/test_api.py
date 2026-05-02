import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from main import app

client = TestClient(app)
PATCH = "data.fetcher.yf.download"


def _make_mock_raw(tickers_data: dict[str, list[float]]) -> pd.DataFrame:
    n = len(next(iter(tickers_data.values())))
    dates = pd.bdate_range("2022-01-03", periods=n)
    close_df = pd.DataFrame(tickers_data, index=dates)
    return pd.concat({"Close": close_df}, axis=1)


def _random_walk(start: float, n: int, seed: int) -> list[float]:
    rng = np.random.default_rng(seed)
    prices = [start]
    for r in rng.normal(0.001, 0.01, n - 1):
        prices.append(round(prices[-1] * (1 + r), 2))
    return prices


N = 35  # enough to clear the 30-day minimum in run_analysis

MOCK_PRICES = _make_mock_raw({
    "AAPL": _random_walk(150.0, N, seed=1),
    "MSFT": _random_walk(300.0, N, seed=2),
    "SPY":  _random_walk(400.0, N, seed=3),
})

VALID_PAYLOAD = {
    "holdings": [
        {"ticker": "AAPL", "weight": 0.6},
        {"ticker": "MSFT", "weight": 0.4},
    ],
    "start_date": "2022-01-01",
    "end_date": "2022-12-31",
    "benchmark": "SPY",
    "risk_free_rate": 0.045,
}


# ── /api/health ──────────────────────────────────────────────────────────────

def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── /api/analyze — happy path ─────────────────────────────────────────────────

def test_analyze_valid_payload_returns_200():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/analyze", json=VALID_PAYLOAD)
    assert response.status_code == 200


def test_analyze_response_contains_all_keys():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/analyze", json=VALID_PAYLOAD)
    body = response.json()
    expected = {
        "tickers", "weights", "annualized_return", "annualized_volatility",
        "sharpe_ratio", "beta", "max_drawdown", "correlation_matrix",
        "drawdown_series", "stress_scenarios", "period",
        "var_95", "cvar_95", "upside_capture", "downside_capture",
        "risk_contributions", "concentration", "worst_periods", "best_periods",
        "exposures", "analyst_summary",
    }
    assert expected <= body.keys()


def test_analyze_response_reflects_portfolio():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/analyze", json=VALID_PAYLOAD)
    body = response.json()
    assert body["tickers"] == ["AAPL", "MSFT"]
    assert body["weights"] == [0.6, 0.4]
    assert body["period"] == {"start": "2022-01-01", "end": "2022-12-31"}


def test_analyze_numeric_fields_have_sensible_values():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/analyze", json=VALID_PAYLOAD)
    body = response.json()
    assert isinstance(body["annualized_return"], float)
    assert isinstance(body["annualized_volatility"], float)
    assert body["annualized_volatility"] > 0
    assert body["max_drawdown"] <= 0


def test_analyze_stress_scenarios_all_present():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/analyze", json=VALID_PAYLOAD)
    stress = response.json()["stress_scenarios"]
    expected = {
        "2008 GFC", "2020 COVID Crash", "2022 Rate Shock",
        "AI Bubble Unwind", "Semiconductor Downturn",
        "Rate Shock (+150 bps)", "China / Geopolitical Risk",
        "Consumer Slowdown", "Mild Recession",
    }
    assert expected == stress.keys()


# ── /api/analyze — validation errors ─────────────────────────────────────────

def test_analyze_weights_not_summing_to_one_returns_422():
    payload = {**VALID_PAYLOAD, "holdings": [
        {"ticker": "AAPL", "weight": 0.6},
        {"ticker": "MSFT", "weight": 0.6},
    ]}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_start_date_after_end_date_returns_422():
    payload = {**VALID_PAYLOAD, "start_date": "2023-01-01", "end_date": "2022-01-01"}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_invalid_ticker_returns_422():
    mock = _make_mock_raw({
        "AAPL":       [150.0, 153.0, 149.0],
        "ZZZNOTREAL": [np.nan, np.nan, np.nan],
        "SPY":        [400.0, 404.0, 398.0],
    })
    payload = {**VALID_PAYLOAD, "holdings": [
        {"ticker": "AAPL",       "weight": 0.5},
        {"ticker": "ZZZNOTREAL", "weight": 0.5},
    ]}
    with patch(PATCH, return_value=mock):
        response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422
