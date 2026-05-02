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


N = 35

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
}


def test_pdf_returns_200():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/report/pdf", json=VALID_PAYLOAD)
    assert response.status_code == 200


def test_pdf_content_type():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/report/pdf", json=VALID_PAYLOAD)
    assert response.headers["content-type"] == "application/pdf"


def test_pdf_starts_with_magic_bytes():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/report/pdf", json=VALID_PAYLOAD)
    assert response.content[:4] == b"%PDF"


def test_pdf_non_empty():
    with patch(PATCH, return_value=MOCK_PRICES):
        response = client.post("/api/report/pdf", json=VALID_PAYLOAD)
    assert len(response.content) > 1000


def test_pdf_validation_still_applies():
    # The PDF endpoint uses the same request schema — bad weights should still 422
    payload = {**VALID_PAYLOAD, "holdings": [
        {"ticker": "AAPL", "weight": 0.6},
        {"ticker": "MSFT", "weight": 0.6},
    ]}
    response = client.post("/api/report/pdf", json=payload)
    assert response.status_code == 422
