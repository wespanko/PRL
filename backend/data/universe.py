"""
Curated ticker universe for the Thesis tab.

Every suggestion the Thesis engine returns must come from this list — the LLM
is told to pick from these specific tickers, not to invent its own. That's
how we avoid the "fancy chatbot" problem: the universe is product, the LLM
is just routing.

Each entry has:
  ticker  — the symbol
  name    — display name
  kind    — "stock" (single company) | "etf" (exchange-traded fund) | "trust"
  theme   — high-level grouping
  role    — its job in a portfolio (one phrase)
  blurb   — 1-2 sentence beginner-friendly explanation of what it actually is
"""

UNIVERSE = [
    # ── Mega-cap & broad equity ──
    {"ticker": "SPY",  "name": "S&P 500 ETF",                  "kind": "etf",  "theme": "Broad US Equity",       "role": "Core US large-cap exposure",                "blurb": "Owns the 500 largest US companies in roughly the same proportion they exist in the market. The default 'I own America' fund — cheap, diversified, what most people compare returns to."},
    {"ticker": "QQQ",  "name": "Nasdaq-100 ETF",               "kind": "etf",  "theme": "US Large-Cap Tech",     "role": "Tech-heavy growth core",                    "blurb": "Owns the 100 largest non-financial companies on the Nasdaq — heavy on Apple, Microsoft, Nvidia, Amazon, Meta, Google. More volatile than SPY, historically higher returns."},
    {"ticker": "IWM",  "name": "Russell 2000 ETF",             "kind": "etf",  "theme": "US Small-Cap",          "role": "Small-cap exposure, higher beta",            "blurb": "Owns 2,000 small US companies. Historically beats large-caps over very long periods, but with much bigger drawdowns. Higher risk, higher possible reward."},
    {"ticker": "VTI",  "name": "Total US Stock Market",        "kind": "etf",  "theme": "Broad US Equity",       "role": "Total-market US core",                      "blurb": "Owns essentially every public US stock — large, mid, and small. The most diversified single-fund US equity holding you can buy."},

    # ── International ──
    {"ticker": "EFA",  "name": "Developed International",      "kind": "etf",  "theme": "Developed Intl",        "role": "Diversification outside US",                 "blurb": "Owns large companies in developed countries outside the US — Japan, UK, Germany, France, etc. Diversifies away from US-only risk."},
    {"ticker": "VXUS", "name": "Total International ex-US",    "kind": "etf",  "theme": "Global ex-US",          "role": "Broad international diversification",        "blurb": "Owns essentially every public stock outside the US — developed and emerging markets combined. The 'rest of the world' fund."},
    {"ticker": "EEM",  "name": "Emerging Markets",             "kind": "etf",  "theme": "Emerging Markets",      "role": "EM growth exposure",                         "blurb": "Owns large companies in emerging economies — China, India, Brazil, Taiwan, etc. Higher growth potential, higher volatility, more political risk."},
    {"ticker": "FXI",  "name": "China Large-Cap",              "kind": "etf",  "theme": "China",                 "role": "Direct China exposure (volatile)",           "blurb": "Owns the 50 largest Chinese companies traded in Hong Kong. Concentrated bet on China — can swing 30% in a year on policy news."},

    # ── Bonds & rates ──
    {"ticker": "AGG",  "name": "Aggregate US Bonds",           "kind": "etf",  "theme": "Bonds",                 "role": "Broad investment-grade bond exposure",       "blurb": "Owns a mix of US government, corporate, and mortgage bonds. The 'bond version' of SPY — pays interest, tends to go up when stocks crash. Stabilizer."},
    {"ticker": "BND",  "name": "Total Bond Market",            "kind": "etf",  "theme": "Bonds",                 "role": "Broad bond diversifier",                     "blurb": "Vanguard's version of AGG. Same idea — broad mix of US bonds. Ultra-low fees."},
    {"ticker": "TLT",  "name": "20+ Year Treasuries",          "kind": "etf",  "theme": "Long-Duration Treasuries", "role": "Strong recession / deflation hedge",      "blurb": "Owns 20+ year US government bonds. Goes UP when interest rates drop — best 'recession hedge' in the toolkit. Also volatile when rates rise."},
    {"ticker": "IEF",  "name": "7-10 Year Treasuries",         "kind": "etf",  "theme": "Mid-Duration Treasuries", "role": "Balanced rate exposure",                  "blurb": "Mid-duration government bonds. Less interest-rate sensitive than TLT — middle of the road for safety."},
    {"ticker": "SHY",  "name": "1-3 Year Treasuries",          "kind": "etf",  "theme": "Short Treasuries",      "role": "Cash-equivalent low risk",                   "blurb": "Short-term US treasuries — basically a slightly-better-than-cash fund. Almost no price volatility, pays modest interest."},
    {"ticker": "TIP",  "name": "Inflation-Protected Bonds",    "kind": "etf",  "theme": "Inflation Hedge",       "role": "Real-yield protection vs inflation",         "blurb": "Owns TIPS — government bonds whose principal adjusts with inflation. If prices go up 5%, your principal goes up 5%. Best inflation-hedge in fixed income."},
    {"ticker": "BNDX", "name": "International Bonds",          "kind": "etf",  "theme": "International Bonds",   "role": "Non-US fixed-income diversifier",            "blurb": "Owns government and corporate bonds from developed markets outside the US. Diversifier for fixed-income exposure."},

    # ── Commodities & alternatives ──
    {"ticker": "GLD",  "name": "Gold",                          "kind": "etf",  "theme": "Gold",                  "role": "Crisis / inflation hedge, low correlation",  "blurb": "Owns physical gold bars in a vault. Each share = ~1/10 oz of gold. Tends to go up during crises and high inflation, low correlation to stocks."},
    {"ticker": "IAU",  "name": "Gold (lower fee)",              "kind": "etf",  "theme": "Gold",                  "role": "Gold exposure, alternative to GLD",          "blurb": "Same as GLD but with a slightly lower expense ratio. Pick whichever your brokerage trades cheaper."},
    {"ticker": "DBC",  "name": "Broad Commodities",             "kind": "etf",  "theme": "Commodities",           "role": "Multi-commodity inflation play",             "blurb": "Owns futures contracts on oil, gas, gold, copper, agriculture, etc. Diversified commodity exposure — good inflation hedge but more volatile than gold alone."},
    {"ticker": "USO",  "name": "Oil",                           "kind": "etf",  "theme": "Energy",                "role": "Direct oil exposure",                        "blurb": "Tracks the price of crude oil via futures. Very volatile — oil can move 50% in a year. Speculation, not diversification."},
    {"ticker": "VNQ",  "name": "US Real Estate (REITs)",       "kind": "etf",  "theme": "Real Estate",           "role": "Real-asset income, rate-sensitive",          "blurb": "Owns real estate companies (offices, malls, apartments, data centers) that pay out rent as dividends. Acts like a hybrid of stocks and bonds."},

    # ── Sectors ──
    {"ticker": "XLK",  "name": "Technology Sector",             "kind": "etf",  "theme": "US Tech",               "role": "Concentrated tech bet",                      "blurb": "Owns the tech companies in the S&P 500 — Apple, Microsoft, Nvidia, etc. Like QQQ but only the S&P 500 names."},
    {"ticker": "XLF",  "name": "Financials Sector",             "kind": "etf",  "theme": "Financials",            "role": "Banks, insurance, financial services",       "blurb": "Owns the financial-sector companies — JPMorgan, BofA, Berkshire, Visa, etc. Bets on banking and financial services."},
    {"ticker": "XLE",  "name": "Energy Sector",                 "kind": "etf",  "theme": "Energy",                "role": "Oil/gas major exposure",                     "blurb": "Owns oil and gas companies — ExxonMobil, Chevron, etc. Tied to energy prices and inflation."},
    {"ticker": "XLV",  "name": "Health Care Sector",            "kind": "etf",  "theme": "Health Care",           "role": "Defensive growth, demographics-driven",      "blurb": "Owns healthcare companies — pharma, insurance, devices, biotech. Defensive: people need healthcare in any economy."},
    {"ticker": "XLP",  "name": "Consumer Staples",              "kind": "etf",  "theme": "Defensive Consumer",    "role": "Recession-resilient consumer brands",        "blurb": "Owns companies that make stuff people buy in any economy — food, household goods, beverages (Procter & Gamble, Coca-Cola, Walmart)."},
    {"ticker": "XLU",  "name": "Utilities",                     "kind": "etf",  "theme": "Defensive Utilities",   "role": "Bond-proxy defensive equity",                "blurb": "Owns electric, water, gas utility companies. Slow-growing, stable dividends. Acts like a stock-bond hybrid."},
    {"ticker": "XLI",  "name": "Industrials",                   "kind": "etf",  "theme": "Industrials",           "role": "Cyclical industrial exposure",               "blurb": "Owns industrial companies — Boeing, Caterpillar, Lockheed, Union Pacific. Tied to economic cycles and manufacturing."},
    {"ticker": "XLY",  "name": "Consumer Discretionary",        "kind": "etf",  "theme": "Cyclical Consumer",     "role": "Pro-cyclical consumer spending",             "blurb": "Owns retailers, restaurants, auto, travel — what people spend on when they have extra money. Boom in good economies, hurts in recessions."},
    {"ticker": "SMH",  "name": "Semiconductors",                "kind": "etf",  "theme": "AI Semis",              "role": "AI / semi cycle play, high beta",            "blurb": "Owns semiconductor companies — Nvidia, TSMC, Broadcom, ASML, etc. Pure-play AI infrastructure bet, very volatile."},
    {"ticker": "SOXX", "name": "Semiconductors (alt)",          "kind": "etf",  "theme": "AI Semis",              "role": "Semi exposure, alternative to SMH",          "blurb": "Same idea as SMH — owns the major semiconductor companies. Pick whichever has lower fees in your account."},
    {"ticker": "ITA",  "name": "Aerospace & Defense",           "kind": "etf",  "theme": "Defense",               "role": "Defense / geopolitical-risk hedge",          "blurb": "Owns aerospace and defense companies — Lockheed, RTX, Boeing, Northrop Grumman. Tends to do well during geopolitical tension."},

    # ── Mega-cap individual names ──
    {"ticker": "NVDA", "name": "Nvidia",                        "kind": "stock", "theme": "AI Semis",             "role": "AI infrastructure leader, high concentration risk", "blurb": "Single company. Designs the GPU chips that train and run nearly all modern AI. Massive winner of the AI cycle — but stock can drop 50% if AI spending slows."},
    {"ticker": "MSFT", "name": "Microsoft",                     "kind": "stock", "theme": "Mega-Cap Tech",        "role": "Cloud + AI, megacap quality",                 "blurb": "Single company. Owns Windows, Office, Azure cloud, and a major stake in OpenAI. One of the steadiest mega-cap compounders."},
    {"ticker": "GOOGL","name": "Alphabet",                      "kind": "stock", "theme": "Mega-Cap Tech",        "role": "Search + AI + cloud",                         "blurb": "Single company. Owns Google Search, YouTube, Android, and Google Cloud. Earns most of its money from advertising."},
    {"ticker": "AMZN", "name": "Amazon",                        "kind": "stock", "theme": "Mega-Cap Tech",        "role": "E-commerce + AWS",                            "blurb": "Single company. Owns the dominant US e-commerce site and AWS, the largest cloud computing platform on earth."},
    {"ticker": "META", "name": "Meta",                          "kind": "stock", "theme": "Mega-Cap Tech",        "role": "Social + AI infrastructure",                  "blurb": "Single company. Owns Facebook, Instagram, WhatsApp. Earns from ads. Has been spending heavily on AI infrastructure."},
    {"ticker": "AAPL", "name": "Apple",                         "kind": "stock", "theme": "Mega-Cap Tech",        "role": "Consumer hardware + services",                "blurb": "Single company. Makes the iPhone (~50% of revenue), plus Macs, services, and wearables. Steadiest of the mega-cap names."},
    {"ticker": "TSLA", "name": "Tesla",                         "kind": "stock", "theme": "EV / Auto",            "role": "EV leader, very high beta",                   "blurb": "Single company. Makes electric cars and solar/storage products. Stock is famously volatile — can swing 30% in a month."},
    {"ticker": "AVGO", "name": "Broadcom",                      "kind": "stock", "theme": "AI Semis",             "role": "Custom AI chips + networking",                 "blurb": "Single company. Designs custom AI chips for hyperscalers (Google's TPUs, Meta) and networking silicon. Quieter AI winner than NVDA."},
    {"ticker": "TSM",  "name": "Taiwan Semiconductor",          "kind": "stock", "theme": "AI Semis",             "role": "World's largest chip foundry",                 "blurb": "Single company. Manufactures chips for Apple, Nvidia, AMD — basically every advanced chip that matters. Geopolitical risk: based in Taiwan."},

    # ── Quality dividend / blue chip individual names ──
    {"ticker": "JNJ",  "name": "Johnson & Johnson",             "kind": "stock", "theme": "Health Care",          "role": "Defensive healthcare blue-chip",              "blurb": "Single company. Makes prescription drugs and consumer health products. One of the steadiest dividend payers — has raised its dividend 60+ years in a row."},
    {"ticker": "LLY",  "name": "Eli Lilly",                     "kind": "stock", "theme": "Health Care",          "role": "GLP-1 / obesity drugs leader",                 "blurb": "Single company. Maker of Mounjaro and Zepbound (Ozempic competitors). Stock has been a major recent winner on the obesity-drug boom."},
    {"ticker": "UNH",  "name": "UnitedHealth Group",            "kind": "stock", "theme": "Health Care",          "role": "Largest US health insurer",                    "blurb": "Single company. Largest US health insurance + healthcare services company. Defensive growth stock with regulatory risk."},
    {"ticker": "PG",   "name": "Procter & Gamble",              "kind": "stock", "theme": "Defensive Consumer",   "role": "Consumer staples blue-chip",                  "blurb": "Single company. Makes Tide, Pampers, Gillette, Crest, etc. Boring on purpose — sells products people buy in any economy."},
    {"ticker": "KO",   "name": "Coca-Cola",                     "kind": "stock", "theme": "Defensive Consumer",   "role": "Defensive beverage staple",                    "blurb": "Single company. Coca-Cola, Sprite, Powerade, plus other beverage brands. Slow-growth dividend stalwart, Buffett favorite."},
    {"ticker": "COST", "name": "Costco Wholesale",              "kind": "stock", "theme": "Defensive Consumer",   "role": "Membership warehouse retail",                  "blurb": "Single company. Membership warehouse stores. Loved for steady growth, recession-resilience, and durable customer loyalty."},
    {"ticker": "BRK.B","name": "Berkshire Hathaway",            "kind": "stock", "theme": "Diversified Holding",  "role": "Conglomerate, defensive growth",              "blurb": "Single company — but a holding company that owns dozens of businesses (insurance, BNSF railroad, See's Candies) and a $300B+ stock portfolio. Buffett's company."},

    # ── Financial individual names ──
    {"ticker": "V",    "name": "Visa",                          "kind": "stock", "theme": "Financials",           "role": "Payment network monopoly",                     "blurb": "Single company. Operates the Visa payment network — takes a tiny fee on essentially every credit/debit card swipe. Toll-booth business with monster margins."},
    {"ticker": "JPM",  "name": "JPMorgan Chase",                "kind": "stock", "theme": "Financials",           "role": "Largest US bank",                              "blurb": "Single company. Largest US bank by assets — investment banking, retail banking, asset management. Considered best-in-class management."},
    {"ticker": "GS",   "name": "Goldman Sachs",                 "kind": "stock", "theme": "Financials",           "role": "Investment banking / trading",                "blurb": "Single company. Premier US investment bank — M&A, trading, asset management. Volatile profits tied to deal flow and markets."},

    # ── Energy individual names ──
    {"ticker": "XOM",  "name": "ExxonMobil",                    "kind": "stock", "theme": "Energy",               "role": "Largest US oil major",                         "blurb": "Single company. Largest integrated oil and gas company in the US. Sells energy. Profits track oil prices."},
    {"ticker": "CVX",  "name": "Chevron",                       "kind": "stock", "theme": "Energy",               "role": "Integrated oil major",                         "blurb": "Single company. Second-largest US oil major. Similar profile to XOM — pays a big dividend, profits track oil."},

    # ── Crypto & speculative ──
    {"ticker": "BITO", "name": "Bitcoin Strategy ETF",          "kind": "etf",   "theme": "Crypto",                "role": "BTC futures exposure",                        "blurb": "An ETF that tracks Bitcoin via futures contracts (not actual Bitcoin). Slight tracking error vs spot BTC. Very volatile."},
    {"ticker": "IBIT", "name": "iShares Bitcoin Trust",         "kind": "trust", "theme": "Crypto",                "role": "Spot BTC exposure",                           "blurb": "A trust that holds actual Bitcoin in custody — each share = a fraction of a BTC. The cleanest way to own BTC in a brokerage account."},
    {"ticker": "ETHA", "name": "iShares Ethereum Trust",        "kind": "trust", "theme": "Crypto",                "role": "Spot ETH exposure",                           "blurb": "Same as IBIT but for Ethereum — holds actual ETH in custody. Crypto exposure without managing a wallet."},

    # ── Factor / smart-beta ──
    {"ticker": "MTUM", "name": "Momentum Factor",               "kind": "etf",   "theme": "Momentum Factor",      "role": "Trending winners exposure",                   "blurb": "Holds US stocks that have been going up the most lately. Bets that recent winners keep winning. Works in trending markets, struggles in choppy ones."},
    {"ticker": "VLUE", "name": "Value Factor",                  "kind": "etf",   "theme": "Value Factor",         "role": "Cheap-relative-to-fundamentals tilt",         "blurb": "Holds US stocks that look cheap relative to their fundamentals (earnings, book value, etc.). Underperformed for a decade — could come back."},
    {"ticker": "QUAL", "name": "Quality Factor",                "kind": "etf",   "theme": "Quality Factor",       "role": "Strong balance-sheet companies",              "blurb": "Holds US companies with high profitability, low debt, and stable earnings. Bets that great businesses keep being great."},
    {"ticker": "USMV", "name": "Min-Volatility US",             "kind": "etf",   "theme": "Low Vol",              "role": "Lower-vol equity exposure",                   "blurb": "Holds the least-volatile US stocks — utilities, staples, healthcare. Lower returns in bull markets, smaller drawdowns in bear markets."},
    {"ticker": "DVY",  "name": "High Dividend Yield",           "kind": "etf",   "theme": "Dividend",             "role": "Income-focused equity tilt",                  "blurb": "Holds US stocks paying the highest dividend yields — utilities, financials, staples. Income-focused, slower growth."},

    # ── Thematic ──
    {"ticker": "ICLN", "name": "Clean Energy",                  "kind": "etf",   "theme": "Clean Energy",         "role": "Renewables theme",                            "blurb": "Holds solar, wind, and clean-energy companies globally. Volatile — moves with energy prices and government incentives."},
    {"ticker": "ARKK", "name": "Disruptive Innovation",         "kind": "etf",   "theme": "Disruptive Tech",      "role": "Aggressive growth, very high vol",            "blurb": "Cathie Wood's actively-managed fund — concentrated in unprofitable growth companies (Tesla, Coinbase, Roku, etc.). Up 100%+ in 2020, down 75% afterward. Speculation."},
    {"ticker": "ROBO", "name": "Robotics & AI",                 "kind": "etf",   "theme": "Robotics / AI",        "role": "Diversified AI/robotics theme",               "blurb": "Holds robotics, automation, and AI-related companies globally. Different exposure than QQQ — more industrial robotics names."},
    {"ticker": "LIT",  "name": "Lithium & Battery",             "kind": "etf",   "theme": "Battery / EV Supply",  "role": "EV supply chain",                             "blurb": "Holds lithium miners and battery makers — the supply chain behind electric vehicles. Volatile, follows EV demand and lithium prices."},
    {"ticker": "URA",  "name": "Uranium",                       "kind": "etf",   "theme": "Uranium",              "role": "Nuclear / energy theme",                      "blurb": "Holds uranium miners and nuclear-fuel companies. Bet on a nuclear-energy revival as power demand from AI grows."},
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
        f"{e['ticker']}: {e['name']} ({e['kind']} · {e['theme']}) — {e['role']}"
        for e in UNIVERSE
    )
