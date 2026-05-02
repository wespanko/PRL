"""
Curated ticker universe for the Thesis tab.

Every suggestion the Thesis engine returns must come from this list — the LLM
is told to pick from these specific tickers, not to invent its own. That's
how we avoid the "fancy chatbot" problem: the universe is product, the LLM
is just routing.
"""

UNIVERSE = [
    # ── Mega-cap & broad equity ──
    {"ticker": "SPY",  "name": "S&P 500 ETF",                    "theme": "Broad US Equity",   "role": "Core US large-cap exposure"},
    {"ticker": "QQQ",  "name": "Nasdaq-100 ETF",                 "theme": "US Large-Cap Tech",  "role": "Tech-heavy growth core"},
    {"ticker": "IWM",  "name": "Russell 2000 ETF",               "theme": "US Small-Cap",       "role": "Small-cap exposure, higher beta"},
    {"ticker": "VTI",  "name": "Total US Stock Market",          "theme": "Broad US Equity",   "role": "Total-market US core"},

    # ── International ──
    {"ticker": "EFA",  "name": "Developed International",        "theme": "Developed Intl",     "role": "Diversification outside US"},
    {"ticker": "VXUS", "name": "Total International ex-US",      "theme": "Global ex-US",       "role": "Broad international diversification"},
    {"ticker": "EEM",  "name": "Emerging Markets",               "theme": "Emerging Markets",   "role": "EM growth exposure"},
    {"ticker": "FXI",  "name": "China Large-Cap",                "theme": "China",              "role": "Direct China exposure (volatile)"},

    # ── Bonds & rates ──
    {"ticker": "AGG",  "name": "Aggregate US Bonds",             "theme": "Bonds",              "role": "Broad investment-grade bond exposure"},
    {"ticker": "BND",  "name": "Total Bond Market",              "theme": "Bonds",              "role": "Broad bond diversifier"},
    {"ticker": "TLT",  "name": "20+ Year Treasuries",            "theme": "Long-Duration Treasuries", "role": "Strong recession / deflation hedge"},
    {"ticker": "IEF",  "name": "7-10 Year Treasuries",           "theme": "Mid-Duration Treasuries",  "role": "Balanced rate exposure"},
    {"ticker": "SHY",  "name": "1-3 Year Treasuries",            "theme": "Short Treasuries",   "role": "Cash-equivalent low risk"},
    {"ticker": "TIP",  "name": "Inflation-Protected Bonds",      "theme": "Inflation Hedge",    "role": "Real-yield protection vs inflation"},
    {"ticker": "BNDX", "name": "International Bonds",            "theme": "International Bonds", "role": "Non-US fixed-income diversifier"},

    # ── Commodities & alternatives ──
    {"ticker": "GLD",  "name": "Gold",                            "theme": "Gold",               "role": "Crisis / inflation hedge, low correlation"},
    {"ticker": "IAU",  "name": "Gold (lower fee)",                "theme": "Gold",               "role": "Gold exposure, alternative to GLD"},
    {"ticker": "DBC",  "name": "Broad Commodities",               "theme": "Commodities",        "role": "Multi-commodity inflation play"},
    {"ticker": "USO",  "name": "Oil",                             "theme": "Energy",             "role": "Direct oil exposure"},
    {"ticker": "VNQ",  "name": "US Real Estate (REITs)",         "theme": "Real Estate",        "role": "Real-asset income, rate-sensitive"},

    # ── Sectors ──
    {"ticker": "XLK",  "name": "Technology Sector",               "theme": "US Tech",            "role": "Concentrated tech bet"},
    {"ticker": "XLF",  "name": "Financials Sector",              "theme": "Financials",         "role": "Banks, insurance, financial services"},
    {"ticker": "XLE",  "name": "Energy Sector",                   "theme": "Energy",             "role": "Oil/gas major exposure"},
    {"ticker": "XLV",  "name": "Health Care Sector",              "theme": "Health Care",        "role": "Defensive growth, demographics-driven"},
    {"ticker": "XLP",  "name": "Consumer Staples",                "theme": "Defensive Consumer", "role": "Recession-resilient consumer brands"},
    {"ticker": "XLU",  "name": "Utilities",                       "theme": "Defensive Utilities","role": "Bond-proxy defensive equity"},
    {"ticker": "XLI",  "name": "Industrials",                     "theme": "Industrials",        "role": "Cyclical industrial exposure"},
    {"ticker": "XLY",  "name": "Consumer Discretionary",          "theme": "Cyclical Consumer",  "role": "Pro-cyclical consumer spending"},
    {"ticker": "SMH",  "name": "Semiconductors",                  "theme": "AI Semis",           "role": "AI / semi cycle play, high beta"},
    {"ticker": "SOXX", "name": "Semiconductors (alt)",            "theme": "AI Semis",           "role": "Semi exposure, alternative to SMH"},
    {"ticker": "ITA",  "name": "Aerospace & Defense",             "theme": "Defense",            "role": "Defense / geopolitical-risk hedge"},

    # ── AI / mega-cap individual names ──
    {"ticker": "NVDA", "name": "Nvidia",                          "theme": "AI Semis",           "role": "AI infrastructure leader, high concentration risk"},
    {"ticker": "MSFT", "name": "Microsoft",                       "theme": "Mega-Cap Tech",      "role": "Cloud + AI, megacap quality"},
    {"ticker": "GOOGL","name": "Alphabet",                        "theme": "Mega-Cap Tech",      "role": "Search + AI + cloud"},
    {"ticker": "AMZN", "name": "Amazon",                          "theme": "Mega-Cap Tech",      "role": "E-commerce + AWS"},
    {"ticker": "META", "name": "Meta",                            "theme": "Mega-Cap Tech",      "role": "Social + AI infrastructure"},
    {"ticker": "AAPL", "name": "Apple",                           "theme": "Mega-Cap Tech",      "role": "Consumer hardware + services"},
    {"ticker": "TSLA", "name": "Tesla",                           "theme": "EV / Auto",          "role": "EV leader, very high beta"},

    # ── Defensive blue chips ──
    {"ticker": "JNJ",  "name": "Johnson & Johnson",               "theme": "Health Care",        "role": "Defensive healthcare blue-chip"},
    {"ticker": "PG",   "name": "Procter & Gamble",                "theme": "Defensive Consumer", "role": "Consumer staples blue-chip"},
    {"ticker": "KO",   "name": "Coca-Cola",                       "theme": "Defensive Consumer", "role": "Defensive beverage staple"},
    {"ticker": "BRK.B","name": "Berkshire Hathaway",              "theme": "Diversified Holding","role": "Conglomerate, defensive growth"},

    # ── Crypto & speculative ──
    {"ticker": "BITO", "name": "Bitcoin Strategy ETF",            "theme": "Crypto",             "role": "BTC futures exposure"},
    {"ticker": "IBIT", "name": "iShares Bitcoin Trust",           "theme": "Crypto",             "role": "Spot BTC exposure"},
    {"ticker": "ETHA", "name": "iShares Ethereum Trust",          "theme": "Crypto",             "role": "Spot ETH exposure"},

    # ── Factor / smart-beta ──
    {"ticker": "MTUM", "name": "Momentum Factor",                 "theme": "Momentum Factor",    "role": "Trending winners exposure"},
    {"ticker": "VLUE", "name": "Value Factor",                    "theme": "Value Factor",       "role": "Cheap-relative-to-fundamentals tilt"},
    {"ticker": "QUAL", "name": "Quality Factor",                  "theme": "Quality Factor",     "role": "Strong balance-sheet companies"},
    {"ticker": "USMV", "name": "Min-Volatility US",               "theme": "Low Vol",            "role": "Lower-vol equity exposure"},
    {"ticker": "DVY",  "name": "High Dividend Yield",             "theme": "Dividend",           "role": "Income-focused equity tilt"},

    # ── Thematic ──
    {"ticker": "ICLN", "name": "Clean Energy",                    "theme": "Clean Energy",       "role": "Renewables theme"},
    {"ticker": "ARKK", "name": "Disruptive Innovation",           "theme": "Disruptive Tech",    "role": "Aggressive growth, very high vol"},
    {"ticker": "ROBO", "name": "Robotics & AI",                   "theme": "Robotics / AI",      "role": "Diversified AI/robotics theme"},
    {"ticker": "LIT",  "name": "Lithium & Battery",               "theme": "Battery / EV Supply","role": "EV supply chain"},
    {"ticker": "URA",  "name": "Uranium",                         "theme": "Uranium",            "role": "Nuclear / energy theme"},
]


def find_ticker(ticker: str) -> dict | None:
    t = ticker.upper().strip()
    for entry in UNIVERSE:
        if entry["ticker"] == t:
            return entry
    return None


def universe_for_prompt() -> str:
    """Compact representation of the universe to inject into the LLM prompt."""
    return "\n".join(
        f"{e['ticker']}: {e['name']} ({e['theme']}) — {e['role']}"
        for e in UNIVERSE
    )
