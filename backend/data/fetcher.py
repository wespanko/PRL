import io
import logging
import time
from contextlib import redirect_stderr

import pandas as pd
import yfinance as yf
from fastapi import HTTPException

_CACHE: dict[tuple, tuple] = {}  # key → (prices_df, limited_tickers, timestamp)
_TTL = 3600


def _clear_cache() -> None:
    _CACHE.clear()


def _is_rate_limit_text(text: str) -> bool:
    t = (text or "").lower()
    return "ratelimit" in t or "too many requests" in t or "rate limited" in t


def _superset_cache_lookup(
    unique_tickers: list[str], start_date: str, end_date: str
) -> tuple[pd.DataFrame, list[str]] | None:
    """Find a cached entry whose ticker set is a superset of the request and
    whose date range matches. Lets a small subset request piggy-back on a
    larger cached fetch (huge win for Improve, which fetches hedge candidates
    once and then runs per-path analysis on subsets)."""
    needed = set(unique_tickers)
    now = time.time()
    for (cached_tickers, cs, ce), (df, limited, ts) in _CACHE.items():
        if cs != start_date or ce != end_date:
            continue
        if now - ts >= _TTL:
            continue
        if needed.issubset(cached_tickers):
            try:
                return df[unique_tickers], [t for t in limited if t in needed]
            except KeyError:
                continue
    return None


def fetch_prices(
    tickers: list[str], start_date: str, end_date: str
) -> tuple[pd.DataFrame, list[str]]:
    """Returns (prices_df, limited_history_tickers).

    limited_history_tickers lists any ticker whose first valid data point is
    more than 10 calendar days after the requested start_date.
    """
    unique_tickers = list(dict.fromkeys(tickers))
    cache_key = (tuple(sorted(unique_tickers)), start_date, end_date)

    if cache_key in _CACHE:
        cached_df, cached_limited, ts = _CACHE[cache_key]
        if time.time() - ts < _TTL:
            return cached_df[unique_tickers], cached_limited

    # Subset-of-cached-superset: avoids re-hitting yfinance for the inner
    # per-path analyses that follow an Improve optimizer fetch.
    superset = _superset_cache_lookup(unique_tickers, start_date, end_date)
    if superset is not None:
        return superset

    # yfinance writes 'Failed downloads' / rate-limit notices to stderr without
    # raising. Capture stderr so we can detect rate limits and turn them into
    # a clear 503 instead of a misleading 422 "No data returned".
    captured = io.StringIO()
    try:
        with redirect_stderr(captured):
            raw = yf.download(
                unique_tickers, start=start_date, end=end_date,
                auto_adjust=True, progress=False, threads=False,
            )
    except Exception as exc:  # network or library-internal errors
        msg = str(exc)
        if _is_rate_limit_text(msg) or _is_rate_limit_text(captured.getvalue()):
            raise HTTPException(
                status_code=503,
                detail="Yahoo Finance rate-limited the request. Wait 1–2 minutes and try again.",
            )
        raise HTTPException(status_code=502, detail=f"Price provider error: {msg}")

    stderr_text = captured.getvalue()
    if _is_rate_limit_text(stderr_text):
        raise HTTPException(
            status_code=503,
            detail=(
                "Yahoo Finance rate-limited the request. "
                "Wait 1–2 minutes before trying again — repeated analyses on a fresh ticker set "
                "(especially Improve, which fetches hedge candidates) can trip this. "
                "Cached tickers/date ranges still work instantly."
            ),
        )

    if raw.empty:
        raise HTTPException(status_code=422, detail="No data returned for the given tickers and date range")

    if isinstance(raw.columns, pd.MultiIndex):
        prices = raw["Close"].copy()
    else:
        prices = raw[["Close"]].copy()
        prices.columns = unique_tickers

    missing = [t for t in unique_tickers if t not in prices.columns or prices[t].isna().all()]
    if missing:
        raise HTTPException(status_code=422, detail=f"No data found for ticker(s): {missing}")

    # Detect limited-history tickers BEFORE dropping NaN rows
    requested_dt = pd.Timestamp(start_date)
    limited_tickers = [
        t for t in unique_tickers
        if prices[t].first_valid_index() is not None
        and prices[t].first_valid_index() > requested_dt + pd.Timedelta(days=10)
    ]

    prices = prices.dropna()

    if prices.empty:
        raise HTTPException(
            status_code=422,
            detail="No overlapping trading days found for the given tickers and date range",
        )

    result = prices[unique_tickers]
    _CACHE[cache_key] = (result, limited_tickers, time.time())
    return result, limited_tickers
