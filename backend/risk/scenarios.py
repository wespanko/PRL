"""
Stress scenarios with theme-aware shocks.
Resolution order: theme name → asset_class → "equity" fallback.
"""

STRESS_SCENARIOS: dict[str, dict[str, float]] = {
    "2008 GFC": {
        "equity": -0.38, "bond": 0.05, "gold": 0.05, "cash": 0.01, "crypto": -0.50,
    },
    "2020 COVID Crash": {
        "equity": -0.34, "bond": 0.08, "gold": 0.04, "cash": 0.01, "crypto": -0.40,
    },
    "2022 Rate Shock": {
        "equity": -0.19, "bond": -0.15,
        "Long-Duration Bonds": -0.28, "Broad Bonds": -0.13,
        "Short-Duration Bonds": -0.04, "Cash/T-Bills": 0.02,
        "AI Semis": -0.35, "Mega-Cap Tech": -0.35,
        "Growth Tech": -0.45, "Cloud/SaaS": -0.50, "Cybersecurity": -0.35,
        "EV/Auto": -0.65, "Crypto": -0.70,
        "Gold": 0.00, "Energy": 0.40,
        "Defensives": -0.05, "Financials": -0.15, "Healthcare": -0.05,
    },
    "AI Bubble Unwind": {
        "AI Semis": -0.50, "Mega-Cap Tech": -0.35,
        "Growth Tech": -0.45, "Cloud/SaaS": -0.45, "Cybersecurity": -0.30,
        "EV/Auto": -0.40, "Crypto": -0.55,
        "Financials": -0.15, "Consumer": -0.15,
        "Defensives": -0.05, "Healthcare": -0.08,
        "Gold": 0.08, "bond": 0.06, "Long-Duration Bonds": 0.10,
        "Cash/T-Bills": 0.02, "equity": -0.25,
    },
    "Semiconductor Downturn": {
        "AI Semis": -0.38, "Mega-Cap Tech": -0.15,
        "Growth Tech": -0.12, "Cloud/SaaS": -0.08,
        "EV/Auto": -0.20, "Crypto": -0.25,
        "equity": -0.10, "bond": 0.03,
        "Gold": 0.03, "Energy": -0.05, "Defensives": 0.02,
    },
    "Rate Shock (+150 bps)": {
        "equity": -0.22, "bond": -0.18,
        "Long-Duration Bonds": -0.32, "Broad Bonds": -0.16,
        "Short-Duration Bonds": -0.05, "Cash/T-Bills": 0.03,
        "AI Semis": -0.30, "Mega-Cap Tech": -0.28,
        "Growth Tech": -0.38, "Cloud/SaaS": -0.42, "Crypto": -0.40,
        "Gold": 0.02, "Energy": 0.05, "Financials": -0.10,
        "Real Estate": -0.25, "Utilities": -0.18,
        "Defensives": -0.08, "Healthcare": -0.10,
    },
    "China / Geopolitical Risk": {
        "China Tech": -0.45, "AI Semis": -0.25, "Mega-Cap Tech": -0.10,
        "equity": -0.12, "bond": 0.04,
        "Gold": 0.12, "Energy": 0.08,
        "Cash/T-Bills": 0.01, "Crypto": -0.20, "Defensives": -0.04,
    },
    "Consumer Slowdown": {
        "Consumer": -0.28, "EV/Auto": -0.35,
        "Mega-Cap Tech": -0.12, "Growth Tech": -0.15, "Cloud/SaaS": -0.10,
        "Defensives": -0.03, "Healthcare": -0.05,
        "Financials": -0.18, "Energy": -0.08,
        "equity": -0.15, "bond": 0.04, "Gold": 0.05,
    },
    "Mild Recession": {
        "equity": -0.15, "bond": 0.05, "Gold": 0.06, "cash": 0.02,
        "Defensives": 0.02, "Healthcare": 0.00,
        "Consumer": -0.18, "Energy": -0.12,
        "Financials": -0.20, "AI Semis": -0.20, "Crypto": -0.30,
    },
}

BOND_TICKERS: set[str] = {
    "TLT", "BND", "AGG", "IEF", "SHY", "LQD", "HYG", "GOVT",
    "VGIT", "VGLT", "VCSH", "VCIT", "EMB", "JNK", "BNDX", "MUB",
}


def classify_ticker(ticker: str) -> str:
    return "bond" if ticker.upper() in BOND_TICKERS else "equity"


def compute_stress_scenarios(
    tickers: list[str], weights: list[float]
) -> tuple[dict[str, float], dict[str, list[dict]]]:
    """
    Returns (totals, breakdown).
    totals:    {scenario_name: portfolio_return}
    breakdown: {scenario_name: [{ticker, theme, applied_shock, weight, contribution}]}
    """
    from data.classifier import get_ticker_info
    ticker_info = {t: get_ticker_info(t) for t in tickers}
    totals: dict[str, float] = {}
    breakdown: dict[str, list[dict]] = {}

    for name, shocks in STRESS_SCENARIOS.items():
        port_return = 0.0
        rows = []
        for ticker, weight in zip(tickers, weights):
            info = ticker_info[ticker]
            theme = info.get("theme", "")
            asset_class = info.get("asset_class", "equity")
            shock = shocks.get(theme) or shocks.get(asset_class) or shocks.get("equity", 0.0)
            contribution = weight * shock
            port_return += contribution
            rows.append({
                "ticker": ticker,
                "theme": theme or asset_class,
                "applied_shock": round(shock, 4),
                "weight": round(weight, 4),
                "contribution": round(contribution, 4),
            })
        totals[name] = round(port_return, 4)
        breakdown[name] = sorted(rows, key=lambda x: x["contribution"])

    return totals, breakdown
