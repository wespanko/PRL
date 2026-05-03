"""
Guard rail: every ticker referenced anywhere in the app must be in the
classifier DB. Prevents the 'Unclassified (XXX)' bug where a ticker exists
in the universe or a preset but the classifier doesn't know about it.
"""

from data.classifier import _DB, get_ticker_info, _UNKNOWN
from data.preset_portfolios import PRESETS
from data.universe import UNIVERSE


def test_every_universe_ticker_is_classified():
    """Every ticker the Thesis tab can suggest must have a real classification."""
    missing = []
    for entry in UNIVERSE:
        info = get_ticker_info(entry["ticker"])
        if info["sector"] == "Unknown" or info["theme"] == "Other Equity":
            missing.append(entry["ticker"])
    assert not missing, (
        f"{len(missing)} universe tickers fall through to Unclassified: {missing}. "
        "Add them to backend/data/classifier.py — they should never display "
        "as 'Unknown / Other Equity' in the Exposures view."
    )


def test_every_preset_ticker_is_classified():
    """Every ticker in a curated preset portfolio must be classified."""
    referenced = set()
    for preset in PRESETS.values():
        for risk_holdings in preset["holdings_by_risk"].values():
            for h in risk_holdings:
                referenced.add(h["ticker"])

    missing = []
    for ticker in referenced:
        info = get_ticker_info(ticker)
        if info["sector"] == "Unknown" or info["theme"] == "Other Equity":
            missing.append(ticker)
    assert not missing, (
        f"{len(missing)} preset tickers fall through to Unclassified: {missing}."
    )


def test_unknown_ticker_still_returns_a_dict():
    """Tickers not in the DB should still return a usable dict (graceful fallback)."""
    info = get_ticker_info("NOTREAL")
    assert isinstance(info, dict)
    assert info["sector"] == "Unknown"
    assert info["asset_class"] == "equity"
