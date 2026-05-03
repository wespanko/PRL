"""
Ticker → sector / theme / asset class lookup.
Unknown tickers fall back to "equity" / "Other" gracefully.
"""

_UNKNOWN = {"sector": "Unknown", "theme": "Other Equity", "asset_class": "equity", "description": "Unknown"}

# asset_class: equity | bond | gold | crypto | cash | commodity | broad_market
_DB: dict[str, dict] = {
    # ── AI / Semiconductors ──────────────────────────────────────────────────
    "NVDA":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "AI GPU leader (data center, gaming)"},
    "AMD":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "CPU/GPU challenger to NVDA/Intel"},
    "INTC":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Legacy semiconductor, restructuring"},
    "QCOM":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Mobile chips, automotive AI"},
    "AVGO":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Networking chips, custom AI ASICs"},
    "TSM":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "World's largest chip foundry"},
    "ASML":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "EUV lithography monopoly"},
    "AMAT":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Semiconductor equipment"},
    "LRCX":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Wafer fabrication equipment"},
    "KLAC":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Semiconductor process control"},
    "MU":    {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Memory chips (DRAM, NAND)"},
    "MRVL":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Custom AI networking silicon"},
    "TXN":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Analog/embedded chips"},
    "ADI":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Analog semiconductors"},
    "ON":    {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Power/auto semiconductors"},
    "MPWR":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Power management ICs"},
    "SMCI":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "AI server hardware"},
    "ARM":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "CPU architecture licensor"},
    "NXPI":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Auto/IoT semiconductors"},
    "SOXX":  {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Semiconductor ETF"},
    "SMH":   {"sector": "Technology", "theme": "AI Semis", "asset_class": "equity", "description": "Semiconductor ETF (VanEck)"},

    # ── Mega-Cap Tech ────────────────────────────────────────────────────────
    "AAPL":  {"sector": "Technology", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Consumer hardware, App Store, services"},
    "MSFT":  {"sector": "Technology", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Enterprise software, Azure cloud, AI (Copilot)"},
    "GOOGL": {"sector": "Comm. Services", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Search, YouTube, Google Cloud"},
    "GOOG":  {"sector": "Comm. Services", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Search, YouTube, Google Cloud"},
    "META":  {"sector": "Comm. Services", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Social media, digital advertising"},
    "AMZN":  {"sector": "Consumer Disc.", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "E-commerce, AWS cloud, advertising"},

    # ── Growth Tech / Software ───────────────────────────────────────────────
    "NFLX":  {"sector": "Comm. Services", "theme": "Growth Tech", "asset_class": "equity", "description": "Streaming media"},
    "CRM":   {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "CRM / enterprise cloud"},
    "ADBE":  {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "Creative / marketing software"},
    "NOW":   {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "IT service management platform"},
    "SHOP":  {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "E-commerce platform"},
    "UBER":  {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "Ride-hailing, delivery"},
    "ABNB":  {"sector": "Consumer Disc.", "theme": "Growth Tech", "asset_class": "equity", "description": "Short-term rental marketplace"},
    "SPOT":  {"sector": "Comm. Services", "theme": "Growth Tech", "asset_class": "equity", "description": "Music / podcast streaming"},

    # ── Cloud / SaaS ─────────────────────────────────────────────────────────
    "SNOW":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Cloud data warehouse"},
    "PLTR":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Data analytics / AI platform"},
    "DDOG":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Cloud observability / monitoring"},
    "MDB":   {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Document database (MongoDB)"},
    "WDAY":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "HR / finance enterprise cloud"},
    "VEEV":  {"sector": "Healthcare", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Life-sciences cloud software"},
    "HUBS":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Marketing / CRM SaaS"},
    "ZM":    {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Video conferencing"},
    "TWLO":  {"sector": "Technology", "theme": "Cloud/SaaS", "asset_class": "equity", "description": "Communications API platform"},

    # ── Cybersecurity ────────────────────────────────────────────────────────
    "CRWD":  {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Cloud endpoint security leader"},
    "PANW":  {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Network security platform"},
    "FTNT":  {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Network firewall / security"},
    "ZS":    {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Zero-trust cloud security"},
    "NET":   {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Network / security cloud (Cloudflare)"},
    "OKTA":  {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Identity and access management"},
    "S":     {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "AI-native endpoint security"},
    "HACK":  {"sector": "Technology", "theme": "Cybersecurity", "asset_class": "equity", "description": "Cybersecurity ETF (ETFMG)"},

    # ── EV / Clean Energy ────────────────────────────────────────────────────
    "TSLA":  {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "EV + energy storage + AI robotics"},
    "NIO":   {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "Chinese EV maker"},
    "LI":    {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "Chinese EV (Li Auto)"},
    "XPEV":  {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "Chinese EV (XPeng)"},
    "RIVN":  {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "EV trucks (Rivian)"},
    "F":     {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "Ford — legacy auto + EV transition"},
    "GM":    {"sector": "Consumer Disc.", "theme": "EV/Auto", "asset_class": "equity", "description": "GM — legacy auto + EV transition"},
    "ENPH":  {"sector": "Technology", "theme": "EV/Auto", "asset_class": "equity", "description": "Solar microinverters"},
    "FSLR":  {"sector": "Technology", "theme": "EV/Auto", "asset_class": "equity", "description": "Solar panel manufacturer"},

    # ── Consumer Discretionary ───────────────────────────────────────────────
    "NKE":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Athletic apparel and footwear"},
    "SBUX":  {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Coffee retail chain"},
    "MCD":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Fast food — defensive consumer"},
    "YUM":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Restaurant brands (KFC, Taco Bell, Pizza Hut)"},
    "CMG":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Fast-casual restaurant"},
    "HD":    {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Home improvement retail"},
    "LOW":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Home improvement retail"},
    "TGT":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Discount retail"},
    "WMT":   {"sector": "Consumer Staples", "theme": "Consumer", "asset_class": "equity", "description": "Mass-market retail / grocery"},
    "COST":  {"sector": "Consumer Staples", "theme": "Consumer", "asset_class": "equity", "description": "Membership warehouse retail"},
    "TJX":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Off-price apparel retail"},
    "BKNG":  {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Online travel / hotel booking"},
    "MAR":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Hotel chain (Marriott)"},
    "HLT":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Hotel chain (Hilton)"},
    "EXPE":  {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Online travel marketplace"},

    # ── Consumer Staples / Defensives ────────────────────────────────────────
    "PG":    {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Household goods (P&G)"},
    "KO":    {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Beverages (Coca-Cola)"},
    "PEP":   {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Beverages and snacks (PepsiCo)"},
    "MO":    {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Tobacco (Altria)"},
    "PM":    {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Tobacco (Philip Morris)"},
    "CL":    {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Personal care / household"},
    "XLP":   {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Consumer staples ETF"},

    # ── Financials ───────────────────────────────────────────────────────────
    "JPM":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Largest US bank"},
    "BAC":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Major US commercial bank"},
    "GS":    {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Investment banking / trading"},
    "MS":    {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Investment banking / wealth management"},
    "C":     {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Global banking (Citigroup)"},
    "WFC":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "US commercial bank"},
    "BLK":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "World's largest asset manager"},
    "SCHW":  {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Retail brokerage / banking"},
    "AXP":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Premium credit cards"},
    "V":     {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Payment network (Visa)"},
    "MA":    {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Payment network (Mastercard)"},
    "PYPL":  {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Digital payments"},
    "COF":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Credit cards / consumer lending"},
    "XLF":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Financials sector ETF"},
    "ICE":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Exchange operator"},
    "CME":   {"sector": "Financials", "theme": "Financials", "asset_class": "equity", "description": "Derivatives exchange"},

    # ── Energy ───────────────────────────────────────────────────────────────
    "XOM":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Integrated oil major (ExxonMobil)"},
    "CVX":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Integrated oil major (Chevron)"},
    "COP":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "E&P oil and gas"},
    "SLB":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Oilfield services"},
    "OXY":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Oil and gas E&P"},
    "EOG":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Shale oil E&P"},
    "DVN":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Oil and gas E&P"},
    "XLE":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Energy sector ETF"},
    "MPC":   {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Oil refining (Marathon)"},
    "BP":    {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "UK integrated oil major"},
    "SHEL":  {"sector": "Energy", "theme": "Energy", "asset_class": "equity", "description": "Shell — UK integrated oil major"},

    # ── China Tech ───────────────────────────────────────────────────────────
    "BABA":  {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "Chinese e-commerce / cloud"},
    "JD":    {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "Chinese e-commerce"},
    "PDD":   {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "Chinese e-commerce / Temu"},
    "TCEHY": {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "Tencent — Chinese tech / gaming"},
    "BIDU":  {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "Chinese search / AI"},
    "KWEB":  {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "China internet ETF"},
    "FXI":   {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "China large-cap ETF"},
    "MCHI":  {"sector": "Comm. Services", "theme": "China Tech", "asset_class": "equity", "description": "MSCI China ETF"},

    # ── Healthcare ───────────────────────────────────────────────────────────
    "JNJ":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Diversified pharma / medtech"},
    "UNH":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Managed care / health insurance"},
    "PFE":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Large pharma"},
    "MRK":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Large pharma (Merck)"},
    "ABBV":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Biopharmaceuticals (Humira, Skyrizi)"},
    "LLY":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "GLP-1 drugs (Ozempic, Mounjaro)"},
    "BMY":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Large pharma (BMS)"},
    "AMGN":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Biotechnology"},
    "GILD":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Antiviral drugs"},
    "REGN":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Biotechnology"},
    "MRNA":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "mRNA vaccines / therapeutics"},
    "ISRG":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Robotic surgery"},
    "TMO":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Life science instruments"},
    "ABT":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Medical devices / diagnostics"},
    "MDT":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Medical devices (Medtronic)"},
    "DHR":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Life science tools"},
    "ELV":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Health insurance (Elevance)"},
    "XLV":   {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "Healthcare sector ETF"},

    # ── Industrials / Defense ────────────────────────────────────────────────
    "BA":    {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Aerospace / commercial aircraft"},
    "GE":    {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Aerospace engines (GE Aerospace)"},
    "RTX":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Defense / aerospace (Raytheon)"},
    "LMT":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Defense (Lockheed Martin)"},
    "NOC":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Defense (Northrop Grumman)"},
    "HON":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Diversified industrial / automation"},
    "CAT":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Heavy machinery"},
    "DE":    {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Agricultural equipment (Deere)"},
    "UPS":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Package delivery"},
    "FDX":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Freight and delivery"},
    "XLI":   {"sector": "Industrials", "theme": "Industrials", "asset_class": "equity", "description": "Industrials sector ETF"},

    # ── Real Estate ──────────────────────────────────────────────────────────
    "AMT":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Cell tower REIT"},
    "PLD":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Industrial logistics REIT"},
    "EQIX":  {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Data center REIT"},
    "SPG":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Mall REIT"},
    "O":     {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Net-lease REIT (Realty Income)"},
    "DLR":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Data center REIT"},
    "PSA":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Self-storage REIT"},
    "VICI":  {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Gaming / experiential REIT"},
    "XLRE":  {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "Real estate sector ETF"},

    # ── Utilities ────────────────────────────────────────────────────────────
    "NEE":   {"sector": "Utilities", "theme": "Utilities", "asset_class": "equity", "description": "Renewable energy utility (NextEra)"},
    "DUK":   {"sector": "Utilities", "theme": "Utilities", "asset_class": "equity", "description": "Electric utility"},
    "SO":    {"sector": "Utilities", "theme": "Utilities", "asset_class": "equity", "description": "Southern electric utility"},
    "XLU":   {"sector": "Utilities", "theme": "Utilities", "asset_class": "equity", "description": "Utilities sector ETF"},

    # ── Gold / Commodities ───────────────────────────────────────────────────
    "GLD":   {"sector": "Commodities", "theme": "Gold", "asset_class": "gold", "description": "Gold ETF (SPDR)"},
    "IAU":   {"sector": "Commodities", "theme": "Gold", "asset_class": "gold", "description": "Gold ETF (iShares)"},
    "SGOL":  {"sector": "Commodities", "theme": "Gold", "asset_class": "gold", "description": "Physical gold ETF"},
    "GOLD":  {"sector": "Materials", "theme": "Gold", "asset_class": "equity", "description": "Gold miner (Barrick)"},
    "NEM":   {"sector": "Materials", "theme": "Gold", "asset_class": "equity", "description": "Gold miner (Newmont)"},
    "GDX":   {"sector": "Materials", "theme": "Gold", "asset_class": "equity", "description": "Gold miners ETF"},
    "GDXJ":  {"sector": "Materials", "theme": "Gold", "asset_class": "equity", "description": "Junior gold miners ETF"},
    "SLV":   {"sector": "Commodities", "theme": "Gold", "asset_class": "commodity", "description": "Silver ETF"},
    "USO":   {"sector": "Commodities", "theme": "Energy", "asset_class": "commodity", "description": "Oil ETF"},
    "DBC":   {"sector": "Commodities", "theme": "Commodities", "asset_class": "commodity", "description": "Broad commodities ETF (Invesco DB)"},
    "PDBC":  {"sector": "Commodities", "theme": "Commodities", "asset_class": "commodity", "description": "Optimum yield diversified commodity ETF"},
    "GSG":   {"sector": "Commodities", "theme": "Commodities", "asset_class": "commodity", "description": "GSCI commodity index ETF"},

    # ── Inflation-Protected Bonds ────────────────────────────────────────────
    "TIP":   {"sector": "Fixed Income", "theme": "Inflation Hedge", "asset_class": "bond", "description": "TIPS — inflation-protected treasuries"},
    "VTIP":  {"sector": "Fixed Income", "theme": "Inflation Hedge", "asset_class": "bond", "description": "Short-term TIPS"},
    "SCHP":  {"sector": "Fixed Income", "theme": "Inflation Hedge", "asset_class": "bond", "description": "TIPS ETF (Schwab)"},

    # ── Real Estate ETFs ─────────────────────────────────────────────────────
    "VNQ":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "US REIT ETF (Vanguard)"},
    "IYR":   {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "US real estate ETF (iShares)"},
    "VNQI":  {"sector": "Real Estate", "theme": "Real Estate", "asset_class": "equity", "description": "International real estate ETF"},

    # ── Defense / Aerospace ETF ──────────────────────────────────────────────
    "ITA":   {"sector": "Industrials", "theme": "Defense", "asset_class": "equity", "description": "Aerospace & defense ETF (iShares)"},
    "PPA":   {"sector": "Industrials", "theme": "Defense", "asset_class": "equity", "description": "Aerospace & defense ETF (Invesco)"},
    "XAR":   {"sector": "Industrials", "theme": "Defense", "asset_class": "equity", "description": "Aerospace & defense ETF (SPDR)"},

    # ── Bonds / Fixed Income ─────────────────────────────────────────────────
    "TLT":   {"sector": "Fixed Income", "theme": "Long-Duration Bonds", "asset_class": "bond", "description": "20+ year Treasury ETF"},
    "IEF":   {"sector": "Fixed Income", "theme": "Long-Duration Bonds", "asset_class": "bond", "description": "7-10 year Treasury ETF"},
    "BND":   {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "Total bond market ETF"},
    "AGG":   {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "US aggregate bond ETF"},
    "GOVT":  {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "US Treasury bond ETF"},
    "VGIT":  {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "Intermediate Treasury ETF"},
    "VGLT":  {"sector": "Fixed Income", "theme": "Long-Duration Bonds", "asset_class": "bond", "description": "Long-term Treasury ETF"},
    "SHY":   {"sector": "Fixed Income", "theme": "Short-Duration Bonds", "asset_class": "bond", "description": "1-3 year Treasury ETF"},
    "LQD":   {"sector": "Fixed Income", "theme": "Corp Bonds", "asset_class": "bond", "description": "Investment-grade corporate bonds"},
    "HYG":   {"sector": "Fixed Income", "theme": "Corp Bonds", "asset_class": "bond", "description": "High-yield corporate bonds"},
    "JNK":   {"sector": "Fixed Income", "theme": "Corp Bonds", "asset_class": "bond", "description": "High-yield corporate bonds (SPDR)"},
    "EMB":   {"sector": "Fixed Income", "theme": "Corp Bonds", "asset_class": "bond", "description": "Emerging market bonds"},
    "BNDX":  {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "International bonds (ex-US)"},
    "MUB":   {"sector": "Fixed Income", "theme": "Broad Bonds", "asset_class": "bond", "description": "Municipal bond ETF"},
    "VCSH":  {"sector": "Fixed Income", "theme": "Short-Duration Bonds", "asset_class": "bond", "description": "Short-term corporate bonds"},
    "VCIT":  {"sector": "Fixed Income", "theme": "Corp Bonds", "asset_class": "bond", "description": "Intermediate corporate bonds"},

    # ── Cash / Short-Duration ────────────────────────────────────────────────
    "BIL":   {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "1-3 month T-bills"},
    "SGOV":  {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "0-3 month T-bills"},
    "USFR":  {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "Floating rate T-bills"},
    "SHV":   {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "Short Treasury (iShares)"},
    "TBIL":  {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "3-month T-bill ETF"},
    "JPST":  {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "Ultra-short income ETF"},
    "MINT":  {"sector": "Fixed Income", "theme": "Cash/T-Bills", "asset_class": "cash", "description": "Enhanced cash / ultra-short"},

    # ── Crypto ───────────────────────────────────────────────────────────────
    "GBTC":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Bitcoin trust (Grayscale)"},
    "IBIT":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Bitcoin ETF (BlackRock)"},
    "FBTC":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Bitcoin ETF (Fidelity)"},
    "ETHA":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Ethereum ETF (BlackRock)"},
    "COIN":  {"sector": "Financials", "theme": "Crypto", "asset_class": "equity", "description": "Crypto exchange (Coinbase)"},
    "MARA":  {"sector": "Technology", "theme": "Crypto", "asset_class": "equity", "description": "Bitcoin mining"},
    "RIOT":  {"sector": "Technology", "theme": "Crypto", "asset_class": "equity", "description": "Bitcoin mining"},
    "MSTR":  {"sector": "Technology", "theme": "Crypto", "asset_class": "equity", "description": "Bitcoin treasury company (MicroStrategy)"},
    "BITO":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Bitcoin Strategy ETF (futures-based)"},
    "ETHE":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "Ethereum trust (Grayscale)"},
    "BITX":  {"sector": "Crypto", "theme": "Crypto", "asset_class": "crypto", "description": "2x Bitcoin Strategy ETF"},

    # ── Factor / Smart-Beta ETFs ─────────────────────────────────────────────
    "MTUM":  {"sector": "Broad Market", "theme": "Momentum Factor", "asset_class": "equity", "description": "US momentum factor ETF (iShares)"},
    "VLUE":  {"sector": "Broad Market", "theme": "Value Factor", "asset_class": "equity", "description": "US value factor ETF (iShares)"},
    "QUAL":  {"sector": "Broad Market", "theme": "Quality Factor", "asset_class": "equity", "description": "US quality factor ETF (iShares)"},
    "USMV":  {"sector": "Broad Market", "theme": "Low Volatility", "asset_class": "equity", "description": "US min-volatility ETF (iShares)"},
    "SPLV":  {"sector": "Broad Market", "theme": "Low Volatility", "asset_class": "equity", "description": "S&P 500 low-volatility ETF (Invesco)"},
    "DVY":   {"sector": "Broad Market", "theme": "Dividend", "asset_class": "equity", "description": "High dividend yield ETF (iShares)"},
    "VYM":   {"sector": "Broad Market", "theme": "Dividend", "asset_class": "equity", "description": "High dividend yield ETF (Vanguard)"},
    "SCHD":  {"sector": "Broad Market", "theme": "Dividend", "asset_class": "equity", "description": "Dividend equity ETF (Schwab)"},

    # ── Thematic ETFs ────────────────────────────────────────────────────────
    "ICLN":  {"sector": "Energy", "theme": "Clean Energy", "asset_class": "equity", "description": "Global clean energy ETF (iShares)"},
    "TAN":   {"sector": "Energy", "theme": "Clean Energy", "asset_class": "equity", "description": "Solar energy ETF"},
    "QCLN":  {"sector": "Energy", "theme": "Clean Energy", "asset_class": "equity", "description": "Clean energy ETF (First Trust)"},
    "ROBO":  {"sector": "Technology", "theme": "Robotics / AI", "asset_class": "equity", "description": "Robotics & AI ETF (Robo Global)"},
    "BOTZ":  {"sector": "Technology", "theme": "Robotics / AI", "asset_class": "equity", "description": "Robotics & AI ETF (Global X)"},
    "LIT":   {"sector": "Materials", "theme": "Battery / EV Supply", "asset_class": "equity", "description": "Lithium & battery tech ETF"},
    "URA":   {"sector": "Energy", "theme": "Uranium", "asset_class": "equity", "description": "Uranium / nuclear ETF (Global X)"},
    "URNM":  {"sector": "Energy", "theme": "Uranium", "asset_class": "equity", "description": "Uranium miners ETF"},

    # ── Diversified Holding ──────────────────────────────────────────────────
    "BRK.B": {"sector": "Financials", "theme": "Diversified Holding", "asset_class": "equity", "description": "Berkshire Hathaway B shares"},
    "BRK-B": {"sector": "Financials", "theme": "Diversified Holding", "asset_class": "equity", "description": "Berkshire Hathaway B shares"},
    "BRKB":  {"sector": "Financials", "theme": "Diversified Holding", "asset_class": "equity", "description": "Berkshire Hathaway B shares"},

    # ── Broad Market ETFs ────────────────────────────────────────────────────
    "SPY":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "S&P 500 ETF"},
    "QQQ":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Nasdaq-100 (tech-heavy)"},
    "IWM":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Russell 2000 (small-cap)"},
    "VTI":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Total US stock market ETF"},
    "VOO":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "S&P 500 ETF (Vanguard)"},
    "DIA":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Dow Jones Industrial ETF"},
    "RSP":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Equal-weight S&P 500"},
    "VIG":   {"sector": "Broad Market", "theme": "US Broad Market", "asset_class": "equity", "description": "Dividend growth ETF"},

    # ── International ────────────────────────────────────────────────────────
    "EFA":   {"sector": "Broad Market", "theme": "International Developed", "asset_class": "equity", "description": "Developed markets ex-US ETF"},
    "EEM":   {"sector": "Broad Market", "theme": "Emerging Markets", "asset_class": "equity", "description": "Emerging markets ETF"},
    "VEA":   {"sector": "Broad Market", "theme": "International Developed", "asset_class": "equity", "description": "Developed markets ex-US (Vanguard)"},
    "VWO":   {"sector": "Broad Market", "theme": "Emerging Markets", "asset_class": "equity", "description": "Emerging markets (Vanguard)"},
    "ACWI":  {"sector": "Broad Market", "theme": "International Developed", "asset_class": "equity", "description": "All-world equity ETF"},
    "VXUS":  {"sector": "Broad Market", "theme": "International Developed", "asset_class": "equity", "description": "Total international stock (Vanguard)"},
    "EWJ":   {"sector": "Broad Market", "theme": "International Developed", "asset_class": "equity", "description": "Japan equity ETF"},
    "INDA":  {"sector": "Broad Market", "theme": "Emerging Markets", "asset_class": "equity", "description": "India equity ETF"},

    # ── Sector ETFs ──────────────────────────────────────────────────────────
    "XLK":   {"sector": "Technology", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Technology sector ETF"},
    "XLC":   {"sector": "Comm. Services", "theme": "Mega-Cap Tech", "asset_class": "equity", "description": "Communication services ETF"},
    "XLY":   {"sector": "Consumer Disc.", "theme": "Consumer", "asset_class": "equity", "description": "Consumer discretionary ETF"},
    "XLP":   {"sector": "Consumer Staples", "theme": "Defensives", "asset_class": "equity", "description": "Consumer staples ETF"},
    "XLB":   {"sector": "Materials", "theme": "Industrials", "asset_class": "equity", "description": "Materials sector ETF"},
    "ARKK":  {"sector": "Technology", "theme": "Growth Tech", "asset_class": "equity", "description": "ARK Innovation ETF (disruptive tech)"},
    "ARKG":  {"sector": "Healthcare", "theme": "Healthcare", "asset_class": "equity", "description": "ARK Genomic Revolution ETF"},
}


def get_ticker_info(ticker: str) -> dict:
    return _DB.get(ticker.upper(), {**_UNKNOWN, "description": f"Unclassified ({ticker})"})


def classify_portfolio(tickers: list[str], weights: list[float]) -> dict:
    sector_weights: dict[str, float] = {}
    theme_weights: dict[str, float] = {}
    asset_class_weights: dict[str, float] = {}
    classified: dict[str, dict] = {}

    for ticker, weight in zip(tickers, weights):
        info = get_ticker_info(ticker)
        classified[ticker] = info
        sector_weights[info["sector"]] = sector_weights.get(info["sector"], 0.0) + weight
        theme_weights[info["theme"]] = theme_weights.get(info["theme"], 0.0) + weight
        asset_class_weights[info["asset_class"]] = asset_class_weights.get(info["asset_class"], 0.0) + weight

    def _round_dict(d: dict) -> dict:
        return {k: round(v, 4) for k, v in sorted(d.items(), key=lambda x: -x[1])}

    return {
        "sectors": _round_dict(sector_weights),
        "themes": _round_dict(theme_weights),
        "asset_classes": _round_dict(asset_class_weights),
        "classified_tickers": classified,
    }
