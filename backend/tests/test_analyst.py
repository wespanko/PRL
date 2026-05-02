import pytest
from ai.analyst import generate_summary


def _base_results(**overrides) -> dict:
    base = {
        "tickers": ["AAPL", "MSFT"],
        "weights": [0.6, 0.4],
        "sharpe_ratio": 0.75,
        "max_drawdown": -0.18,
        "var_95": -0.06,
        "upside_capture": 1.10,
        "downside_capture": 0.92,
        "risk_contributions": [
            {"ticker": "AAPL", "weight": 0.6, "pct_risk": 0.55},
            {"ticker": "MSFT", "weight": 0.4, "pct_risk": 0.45},
        ],
        "concentration": {
            "hhi": 0.52,
            "effective_n": 1.92,
            "top1_weight": 0.6,
            "top3_weight": 1.0,
            "top5_weight": 1.0,
        },
        "correlation_matrix": {"AAPL": {"AAPL": 1.0, "MSFT": 0.75}, "MSFT": {"AAPL": 0.75, "MSFT": 1.0}},
        "exposures": {
            "themes": {"Mega-Cap Tech": 1.0},
            "sectors": {"Technology": 0.6, "Comm. Services": 0.4},
            "asset_classes": {"equity": 1.0},
            "classified_tickers": {
                "AAPL": {"sector": "Technology", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Consumer hardware"},
                "MSFT": {"sector": "Technology", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Enterprise software"},
            },
        },
    }
    base.update(overrides)
    return base


# ── structure ─────────────────────────────────────────────────────────────────

def test_summary_has_required_keys():
    summary = generate_summary(_base_results())
    assert {"headline", "paragraphs", "risks", "strengths", "watch_list"} <= summary.keys()


def test_summary_paragraphs_is_list_of_strings():
    summary = generate_summary(_base_results())
    assert isinstance(summary["paragraphs"], list)
    for p in summary["paragraphs"]:
        assert isinstance(p, str) and len(p) > 20


def test_summary_paragraphs_mention_portfolio_character():
    summary = generate_summary(_base_results())
    full_text = " ".join(summary["paragraphs"]).lower()
    assert any(word in full_text for word in ("tech", "concentrated", "portfolio", "theme", "exposure"))


def test_summary_headline_is_string():
    summary = generate_summary(_base_results())
    assert isinstance(summary["headline"], str)
    assert len(summary["headline"]) > 0


def test_summary_risks_is_list_of_strings():
    summary = generate_summary(_base_results())
    assert isinstance(summary["risks"], list)
    for r in summary["risks"]:
        assert isinstance(r, str)


def test_summary_strengths_is_list_of_strings():
    summary = generate_summary(_base_results())
    assert isinstance(summary["strengths"], list)
    for s in summary["strengths"]:
        assert isinstance(s, str)


def test_summary_watch_list_is_list_of_strings():
    summary = generate_summary(_base_results())
    assert isinstance(summary["watch_list"], list)
    for w in summary["watch_list"]:
        assert isinstance(w, str)


# ── headline content ──────────────────────────────────────────────────────────

def test_headline_mentions_single_name_or_concentrated_when_enp_low():
    results = _base_results()
    results["concentration"]["effective_n"] = 1.3
    results["risk_contributions"][0]["pct_risk"] = 0.85
    results["risk_contributions"][1]["pct_risk"] = 0.15
    headline = generate_summary(results)["headline"]
    assert any(w in headline.lower() for w in ("concentrated", "single-name", "dominated"))


def test_headline_mentions_diversified_when_enp_high():
    results = _base_results()
    results["concentration"]["effective_n"] = 8.0
    headline = generate_summary(results)["headline"]
    assert "diversified" in headline.lower()


def test_headline_positive_when_high_sharpe():
    results = _base_results(sharpe_ratio=1.5)
    headline = generate_summary(results)["headline"]
    assert "strong" in headline.lower()


def test_headline_negative_when_negative_sharpe():
    results = _base_results(sharpe_ratio=-0.3)
    headline = generate_summary(results)["headline"]
    assert "negative" in headline.lower()


# ── risks content ─────────────────────────────────────────────────────────────

def test_risks_flags_dominant_single_name():
    results = _base_results()
    results["risk_contributions"] = [
        {"ticker": "NVDA", "weight": 0.5, "pct_risk": 0.75},
        {"ticker": "SPY",  "weight": 0.5, "pct_risk": 0.25},
    ]
    risks = generate_summary(results)["risks"]
    assert any("NVDA" in r for r in risks)
    assert any("75%" in r for r in risks)


def test_risks_flags_severe_drawdown():
    results = _base_results(max_drawdown=-0.45)
    risks = generate_summary(results)["risks"]
    assert any("drawdown" in r.lower() for r in risks)
    assert any("severe" in r.lower() or "recovery" in r.lower() for r in risks)


def test_risks_flags_high_downside_capture():
    results = _base_results(downside_capture=1.25)
    risks = generate_summary(results)["risks"]
    assert any("downside capture" in r.lower() for r in risks)


def test_risks_capped_at_four():
    results = _base_results(
        max_drawdown=-0.50,
        downside_capture=1.30,
        var_95=-0.12,
    )
    results["risk_contributions"] = [
        {"ticker": "NVDA", "weight": 0.9, "pct_risk": 0.95},
        {"ticker": "SPY",  "weight": 0.1, "pct_risk": 0.05},
    ]
    results["concentration"]["effective_n"] = 1.1
    risks = generate_summary(results)["risks"]
    assert len(risks) <= 4


# ── strengths content ─────────────────────────────────────────────────────────

def test_strengths_flags_high_sharpe():
    results = _base_results(sharpe_ratio=1.4)
    strengths = generate_summary(results)["strengths"]
    assert any("1.40" in s for s in strengths)


def test_strengths_flags_good_upside_capture():
    results = _base_results(upside_capture=1.20)
    strengths = generate_summary(results)["strengths"]
    assert any("upside" in s.lower() for s in strengths)


def test_strengths_flags_low_downside_capture():
    results = _base_results(downside_capture=0.75)
    strengths = generate_summary(results)["strengths"]
    assert any("downside" in s.lower() for s in strengths)


def test_strengths_capped_at_three():
    results = _base_results(
        sharpe_ratio=1.8,
        upside_capture=1.30,
        downside_capture=0.65,
        max_drawdown=-0.03,
    )
    results["concentration"]["effective_n"] = 9.0
    strengths = generate_summary(results)["strengths"]
    assert len(strengths) <= 3


# ── watch list ────────────────────────────────────────────────────────────────

def test_watch_list_names_top_risk_driver():
    results = _base_results()
    results["risk_contributions"] = [
        {"ticker": "TSLA", "weight": 0.4, "pct_risk": 0.70},
        {"ticker": "GLD",  "weight": 0.6, "pct_risk": 0.30},
    ]
    watch = generate_summary(results)["watch_list"]
    assert any("TSLA" in w for w in watch)


def test_watch_list_flags_unfavourable_capture_asymmetry():
    results = _base_results(upside_capture=0.80, downside_capture=1.20)
    watch = generate_summary(results)["watch_list"]
    assert any("downside" in w.lower() for w in watch)


def test_watch_list_capped_at_three():
    watch = generate_summary(_base_results())["watch_list"]
    assert len(watch) <= 3
