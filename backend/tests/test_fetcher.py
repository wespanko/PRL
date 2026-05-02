import numpy as np
import pandas as pd
import pytest
from fastapi import HTTPException
from unittest.mock import patch

from data.fetcher import fetch_prices

PATCH = "data.fetcher.yf.download"


def _make_mock_raw(tickers_data: dict[str, list[float]], start: str = "2022-01-03") -> pd.DataFrame:
    """Build a yfinance-style MultiIndex DataFrame without hitting the network."""
    n = len(next(iter(tickers_data.values())))
    dates = pd.bdate_range(start, periods=n)
    close_df = pd.DataFrame(tickers_data, index=dates)
    return pd.concat({"Close": close_df}, axis=1)


# ── happy path ───────────────────────────────────────────────────────────────

def test_fetch_prices_returns_clean_dataframe():
    mock_raw = _make_mock_raw({"AAPL": [150.0, 152.0, 148.0], "SPY": [400.0, 402.0, 398.0]})
    with patch(PATCH, return_value=mock_raw):
        prices, limited = fetch_prices(["AAPL", "SPY"], "2022-01-01", "2022-12-31")
    assert list(prices.columns) == ["AAPL", "SPY"]
    assert len(prices) == 3
    assert not prices.isna().any().any()
    assert limited == []


def test_fetch_prices_preserves_column_order():
    mock_raw = _make_mock_raw({"SPY": [400.0, 402.0], "AAPL": [150.0, 152.0]})
    with patch(PATCH, return_value=mock_raw):
        prices, _ = fetch_prices(["SPY", "AAPL"], "2022-01-01", "2022-12-31")
    assert list(prices.columns) == ["SPY", "AAPL"]


def test_fetch_prices_drops_partial_nan_rows():
    # One row has NaN for one ticker (e.g., staggered listing date); that row is dropped
    mock_raw = _make_mock_raw({
        "AAPL": [150.0, np.nan, 148.0],
        "SPY":  [400.0, 402.0,  398.0],
    })
    with patch(PATCH, return_value=mock_raw):
        prices, limited = fetch_prices(["AAPL", "SPY"], "2022-01-01", "2022-12-31")
    assert len(prices) == 2
    assert not prices.isna().any().any()


def test_fetch_prices_detects_limited_history_ticker():
    # SPY has full history; IBIT has NaN for the first 40 days (simulates late listing)
    dates = pd.bdate_range("2022-01-03", periods=60)
    spy_vals  = [400.0 + i for i in range(60)]
    ibit_vals = [np.nan] * 40 + [50.0 + i for i in range(20)]
    close_df = pd.DataFrame({"IBIT": ibit_vals, "SPY": spy_vals}, index=dates)
    mock_raw = pd.concat({"Close": close_df}, axis=1)

    with patch(PATCH, return_value=mock_raw):
        _, limited = fetch_prices(["IBIT", "SPY"], "2022-01-01", "2022-12-31")
    assert "IBIT" in limited
    assert "SPY" not in limited


# ── error cases ──────────────────────────────────────────────────────────────

def test_fetch_prices_invalid_ticker_raises_422():
    mock_raw = _make_mock_raw({"AAPL": [150.0, 152.0], "ZZZNOTREAL": [np.nan, np.nan]})
    with patch(PATCH, return_value=mock_raw):
        with pytest.raises(HTTPException) as exc_info:
            fetch_prices(["AAPL", "ZZZNOTREAL"], "2022-01-01", "2022-12-31")
    assert exc_info.value.status_code == 422
    assert "ZZZNOTREAL" in exc_info.value.detail


def test_fetch_prices_empty_response_raises_422():
    with patch(PATCH, return_value=pd.DataFrame()):
        with pytest.raises(HTTPException) as exc_info:
            fetch_prices(["AAPL"], "2099-01-01", "2099-12-31")
    assert exc_info.value.status_code == 422


def test_fetch_prices_all_gaps_after_dropna_raises_422():
    # Every row has a NaN in at least one column → dropna() empties the frame
    mock_raw = _make_mock_raw({
        "AAPL": [150.0,   np.nan],
        "SPY":  [np.nan,  402.0],
    })
    with patch(PATCH, return_value=mock_raw):
        with pytest.raises(HTTPException) as exc_info:
            fetch_prices(["AAPL", "SPY"], "2022-01-01", "2022-12-31")
    assert exc_info.value.status_code == 422
