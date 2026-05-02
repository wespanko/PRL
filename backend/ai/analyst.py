"""
Portfolio diagnosis engine.
Produces institutional-quality analysis — not metric narration, but portfolio characterisation.
"""


def generate_summary(results: dict) -> dict:
    contributions = results["risk_contributions"]
    concentration = results["concentration"]
    exposures = results.get("exposures", {})
    top = max(contributions, key=lambda x: x["pct_risk"])

    sharpe       = results["sharpe_ratio"]
    max_dd       = results["max_drawdown"]
    upside       = results["upside_capture"]
    downside     = results["downside_capture"]
    enp          = concentration["effective_n"]
    enp_risk     = concentration.get("enp_risk", enp)
    hhi          = concentration["hhi"]
    var_95       = results["var_95"]
    tickers      = results["tickers"]
    corr_matrix  = results.get("correlation_matrix", {})

    themes        = exposures.get("themes", {})
    sectors       = exposures.get("sectors", {})
    asset_classes = exposures.get("asset_classes", {})
    classified    = exposures.get("classified_tickers", {})

    top_theme  = max(themes, key=themes.get)  if themes  else None
    top_theme_pct = themes.get(top_theme, 0)  if top_theme  else 0
    top_sector = max(sectors, key=sectors.get) if sectors else None

    avg_corr = _avg_corr(corr_matrix, tickers)
    equity_pct = sum(v for k, v in asset_classes.items() if k in ("equity", "broad_market"))

    return {
        "headline":   _headline(top, enp_risk, sharpe, top_theme, top_theme_pct),
        "paragraphs": _paragraphs(
            top, contributions, enp, enp_risk, hhi, top_theme, top_theme_pct,
            top_sector, themes, equity_pct, avg_corr, upside, downside,
            max_dd, classified, tickers
        ),
        "risks":     _risks(top, concentration, max_dd, var_95, downside, top_theme),
        "strengths": _strengths(sharpe, upside, downside, enp_risk, max_dd),
        "watch_list": _watch_list(top, concentration, results, top_theme, classified),
    }


# ── helpers ───────────────────────────────────────────────────────────────────

def _avg_corr(corr_matrix: dict, tickers: list[str]) -> float:
    pairs = [
        corr_matrix[t1][t2]
        for i, t1 in enumerate(tickers)
        for j, t2 in enumerate(tickers)
        if i < j and t1 in corr_matrix and t2 in corr_matrix.get(t1, {})
    ]
    return sum(pairs) / len(pairs) if pairs else 0.0


def _top_n_prc(contributions: list[dict], n: int) -> float:
    sorted_c = sorted(contributions, key=lambda x: x["pct_risk"], reverse=True)
    return sum(c["pct_risk"] for c in sorted_c[:n])


# ── headline ──────────────────────────────────────────────────────────────────

def _headline(top: dict, enp: float, sharpe: float,
              top_theme: str | None, top_theme_pct: float) -> str:
    ticker = top["ticker"]
    prc    = top["pct_risk"]

    if enp < 2.0 and prc > 0.5:
        conc = f"a single-name bet dominated by {ticker} ({prc:.0%} of total risk)"
    elif enp < 3.0:
        conc = f"a high-concentration portfolio with {enp:.1f} effective independent positions"
    elif enp < 6.0:
        conc = f"a moderately concentrated portfolio ({enp:.1f} effective positions)"
    else:
        conc = f"a diversified portfolio across {enp:.1f} effective positions"

    theme_phrase = f" with heavy {top_theme} exposure" if top_theme and top_theme_pct > 0.4 else ""

    if sharpe > 1.0:
        perf = "generating strong risk-adjusted returns"
    elif sharpe > 0.5:
        perf = "with adequate risk-adjusted returns"
    elif sharpe > 0.0:
        perf = "with below-average risk-adjusted returns"
    else:
        perf = "generating negative risk-adjusted returns over this period"

    return f"This is {conc}{theme_phrase}, {perf}."


# ── paragraphs ────────────────────────────────────────────────────────────────

def _paragraphs(
    top: dict, contributions: list[dict], enp: float, enp_risk: float, hhi: float,
    top_theme: str | None, top_theme_pct: float, top_sector: str | None,
    themes: dict, equity_pct: float, avg_corr: float,
    upside: float, downside: float, max_dd: float,
    classified: dict, tickers: list[str]
) -> list[str]:
    paras = []
    paras.append(_para_what_it_is(top, contributions, top_theme, top_theme_pct,
                                  top_sector, themes, enp_risk, classified, tickers))
    paras.append(_para_diversification(enp, enp_risk, hhi, avg_corr, contributions,
                                       top_theme, top_theme_pct, tickers))
    paras.append(_para_drivers(top, upside, downside, max_dd, top_theme,
                                top_theme_pct, equity_pct, classified))
    return [p for p in paras if p]


def _para_what_it_is(
    top: dict, contributions: list[dict], top_theme: str | None,
    top_theme_pct: float, top_sector: str | None, themes: dict,
    enp: float, classified: dict, tickers: list[str]
) -> str:
    top2_prc = _top_n_prc(contributions, 2)
    ticker = top["ticker"]
    desc = classified.get(ticker, {}).get("description", "")
    desc_clause = f" ({desc})" if desc and desc != f"Unclassified ({ticker})" else ""

    if top_theme and top_theme_pct > 0.6:
        theme_names = [t for t, w in themes.items() if w > 0.05 and t != top_theme]
        secondary = f", with secondary exposure to {theme_names[0]}" if theme_names else ""
        return (
            f"This portfolio is a concentrated {top_theme} thesis. "
            f"{ticker}{desc_clause} is the primary position and the dominant risk driver at "
            f"{top['pct_risk']:.0%} of total volatility{secondary}. "
            f"The portfolio's returns will be largely explained by how {top_theme} performs — "
            f"not by the individual merits of each holding."
        )
    elif top_theme and top_theme_pct > 0.35:
        other_themes = [t for t, w in themes.items() if w > 0.08 and t != top_theme]
        other_clause = (
            f" alongside exposure to {' and '.join(other_themes[:2])}"
            if other_themes else ""
        )
        return (
            f"This is a {top_theme}-tilted portfolio{other_clause}. "
            f"{ticker}{desc_clause} is the largest risk contributor at {top['pct_risk']:.0%} of total risk, "
            f"though the portfolio has broader diversification than a single-theme allocation. "
            f"The top two positions together account for {top2_prc:.0%} of portfolio volatility."
        )
    elif top_sector:
        sector_themes = sorted(themes.items(), key=lambda x: -x[1])[:3]
        theme_list = ", ".join(f"{t} ({w:.0%})" for t, w in sector_themes)
        return (
            f"This is a multi-theme portfolio with a {top_sector} tilt. "
            f"Exposures span: {theme_list}. "
            f"{ticker}{desc_clause} remains the single largest risk driver at {top['pct_risk']:.0%} of total volatility, "
            f"but risk is more broadly distributed than a single-thesis allocation."
        )
    else:
        return (
            f"This portfolio spans multiple sectors and themes with {enp:.1f} effective independent positions. "
            f"{ticker}{desc_clause} is the largest individual risk driver at {top['pct_risk']:.0%} of total volatility. "
            f"The allocation does not express a single dominant macro view."
        )


def _para_diversification(
    enp: float, enp_risk: float, hhi: float, avg_corr: float,
    contributions: list[dict], top_theme: str | None, top_theme_pct: float,
    tickers: list[str]
) -> str:
    n = len(tickers)
    if n <= 1:
        return ""

    top_prc = _top_n_prc(contributions, 1)
    corr_label = (
        "highly correlated" if avg_corr > 0.75 else
        "moderately correlated" if avg_corr > 0.5 else
        "lowly correlated"
    )
    gap = enp - enp_risk
    gap_pct = gap / enp if enp > 0 else 0

    # Key insight: compare capital-weight ENP vs risk-contribution ENP
    if gap_pct > 0.25:
        gap_phrase = (
            f"Although your portfolio holds {n} positions ({enp:.1f} nominal effective positions "
            f"by capital weight), correlation between holdings reduces true diversification to "
            f"{enp_risk:.1f} independent risk bets — a {gap_pct:.0%} reduction. "
            f"This gap is significant: holdings that appear diversified by capital are "
            f"sharing the same underlying return drivers."
        )
    elif gap_pct > 0.10:
        gap_phrase = (
            f"The portfolio holds {n} positions ({enp:.1f} nominal effective positions by weight). "
            f"Adjusting for correlation, true risk diversification is {enp_risk:.1f} independent bets — "
            f"a modest {gap_pct:.0%} reduction reflecting moderate overlap between holdings."
        )
    else:
        gap_phrase = (
            f"The portfolio holds {n} positions with {enp_risk:.1f} correlation-adjusted effective positions "
            f"(vs {enp:.1f} by capital weight) — minimal divergence, suggesting the holdings are "
            f"genuinely uncorrelated and providing real diversification."
        )

    if top_theme and top_theme_pct > 0.85:
        return (
            f"Diversification is largely cosmetic. {gap_phrase} All major positions share the "
            f"{top_theme} theme and would likely decline in unison in a sector-specific shock."
        )
    elif avg_corr > 0.7:
        return (
            f"{gap_phrase} With {corr_label} holdings (avg pairwise correlation: {avg_corr:.2f}), "
            f"the top position drives {top_prc:.0%} of total risk. "
            f"Adding more names reduces headline count without reducing correlated drawdown risk."
        )
    else:
        return (
            f"{gap_phrase} Holdings are {corr_label} (avg pairwise correlation: {avg_corr:.2f}), "
            f"and the top position contributes {top_prc:.0%} of total risk."
        )


def _para_drivers(
    top: dict, upside: float, downside: float, max_dd: float,
    top_theme: str | None, top_theme_pct: float,
    equity_pct: float, classified: dict
) -> str:
    ticker = top["ticker"]
    prc    = top["pct_risk"]

    # Characterise the asymmetry
    if upside > 1.1 and downside < 0.9:
        asymmetry = (
            f"The portfolio has a favourable capture ratio profile — "
            f"upside capture of {upside:.2f}× suggests it accelerates in risk-on markets, "
            f"while downside capture of {downside:.2f}× shows relative resilience in downturns. "
            f"This asymmetry is the most important indicator of long-term compounding quality."
        )
    elif downside > upside:
        asymmetry = (
            f"The portfolio currently captures more downside ({downside:.2f}×) than upside ({upside:.2f}×) "
            f"relative to the benchmark. This unfavourable asymmetry means drawdowns hurt more "
            f"than rallies help — a pattern that erodes compounding over time."
        )
    elif upside > 1.2:
        asymmetry = (
            f"Upside capture of {upside:.2f}× indicates the portfolio amplifies market rallies significantly. "
            f"With downside capture of {downside:.2f}×, this is a high-beta profile — "
            f"strong in bull markets, potentially painful in sharp corrections."
        )
    else:
        asymmetry = (
            f"Upside and downside capture are relatively balanced at {upside:.2f}× and {downside:.2f}×, "
            f"suggesting the portfolio tracks the benchmark closely without strong asymmetric characteristics."
        )

    # Vulnerability context based on theme / max_dd
    if top_theme and top_theme_pct > 0.4:
        vuln = (
            f"The primary tail risk is a macro reversal specifically targeting {top_theme} — "
            f"such as a valuation compression or sector-specific shock — "
            f"which could disproportionately impact this portfolio given its concentration."
        )
    elif max_dd < -0.25:
        vuln = (
            f"The historical max drawdown of {max_dd:.1%} demonstrates the portfolio is capable "
            f"of large losses in adverse conditions. Investors should size this portfolio knowing "
            f"these drawdowns are historically possible."
        )
    else:
        vuln = ""

    return f"{asymmetry} {vuln}".strip()


# ── risks ─────────────────────────────────────────────────────────────────────

def _risks(
    top: dict, concentration: dict, max_dd: float,
    var_95: float, downside: float, top_theme: str | None
) -> list[str]:
    risks = []
    ticker = top["ticker"]
    prc    = top["pct_risk"]
    enp    = concentration["effective_n"]

    if prc > 0.4:
        risks.append(
            f"{ticker} drives {prc:.0%} of total portfolio risk despite being only "
            f"{top['weight']:.0%} of capital. A bad quarter for this single name "
            f"significantly impacts the whole portfolio."
        )

    if enp < 3.0:
        risks.append(
            f"Effective diversification of {enp:.1f} independent positions "
            f"(HHI: {concentration['hhi']:.2f}). The portfolio may experience "
            f"concentrated losses when correlated holdings sell off simultaneously."
        )

    if max_dd < -0.30:
        recovery = 1 / (1 + max_dd) - 1
        risks.append(
            f"Maximum drawdown of {max_dd:.1%} — a severe peak-to-trough loss. "
            f"Recovery requires a {recovery:.0%} gain from the trough."
        )
    elif max_dd < -0.15:
        risks.append(
            f"Maximum drawdown of {max_dd:.1%} — a meaningful correction "
            f"that would test investor conviction."
        )

    if downside > 1.1:
        risks.append(
            f"Downside capture of {downside:.2f}× means the portfolio loses more than "
            f"the benchmark in falling markets, amplifying losses in downturns."
        )

    if var_95 < -0.08:
        risks.append(
            f"Monthly VaR (95%) of {var_95:.1%}: in a bad month, losses of this "
            f"magnitude or worse occur roughly 1-in-20 months."
        )

    if top_theme in ("AI Semis", "Mega-Cap Tech", "Growth Tech", "Cloud/SaaS", "Crypto", "EV/Auto"):
        risks.append(
            f"High valuation sensitivity: {top_theme} holdings are typically long-duration growth assets. "
            f"Rising interest rates or multiple compression compress these valuations disproportionately."
        )

    return risks[:4]


# ── strengths ─────────────────────────────────────────────────────────────────

def _strengths(
    sharpe: float, upside: float, downside: float,
    enp: float, max_dd: float
) -> list[str]:
    strengths = []

    if sharpe > 1.0:
        strengths.append(
            f"Sharpe ratio of {sharpe:.2f} — strong risk-adjusted return. "
            f"The portfolio is generating well-compensated risk."
        )
    elif sharpe > 0.5:
        strengths.append(
            f"Sharpe ratio of {sharpe:.2f} — reasonable risk-adjusted return "
            f"relative to the risk taken."
        )

    if upside > 1.05:
        strengths.append(
            f"Upside capture of {upside:.2f}× — the portfolio participates "
            f"more than proportionally in market rallies."
        )

    if downside < 0.9:
        strengths.append(
            f"Downside capture of {downside:.2f}× — the portfolio loses less "
            f"than the benchmark when markets fall. This asymmetry compounds meaningfully over time."
        )

    if enp >= 6.0:
        strengths.append(
            f"Effective diversification of {enp:.1f} independent positions "
            f"provides meaningful spread across uncorrelated return drivers."
        )

    if max_dd > -0.10:
        strengths.append(
            f"Maximum drawdown of {max_dd:.1%} — limited historical downside "
            f"suggests the portfolio has held up well in adverse conditions."
        )

    return strengths[:3]


# ── watch list ────────────────────────────────────────────────────────────────

def _watch_list(
    top: dict, concentration: dict, results: dict,
    top_theme: str | None, classified: dict
) -> list[str]:
    items = []
    ticker = top["ticker"]
    prc    = top["pct_risk"]
    enp    = concentration["effective_n"]

    if prc > 0.3:
        items.append(
            f"Monitor {ticker} closely — it is the primary driver of portfolio "
            f"volatility at {prc:.0%} of total risk. Earnings, guidance, or "
            f"sector rotation could move the whole portfolio."
        )

    if enp < 4.0:
        items.append(
            f"Review whether concentration in {enp:.1f} effective positions is intentional. "
            f"If the top holding has grown through appreciation, "
            f"trimming restores the intended risk balance without requiring a full restructure."
        )

    if results["downside_capture"] > results["upside_capture"]:
        items.append(
            f"The portfolio captures more downside ({results['downside_capture']:.2f}×) "
            f"than upside ({results['upside_capture']:.2f}×). "
            f"Review whether the allocation has drifted toward more volatile or lower-quality names."
        )

    if top_theme in ("AI Semis", "Mega-Cap Tech", "Cloud/SaaS", "Growth Tech"):
        items.append(
            f"Watch US interest rate direction — {top_theme} valuations are sensitive to "
            f"long-duration discount rates. A rate re-pricing could reprice the entire portfolio."
        )
    elif top_theme == "China Tech":
        items.append(
            f"Monitor US-China trade relations and regulatory risk — the portfolio's "
            f"China exposure makes it sensitive to geopolitical developments and capital controls."
        )
    elif top_theme == "Crypto":
        items.append(
            f"Crypto assets are highly volatile and exhibit extreme drawdowns in risk-off environments. "
            f"Consider whether the portfolio's crypto weight reflects intentional risk appetite."
        )

    return items[:3]


# ── portfolio DNA ─────────────────────────────────────────────────────────────

def generate_dna(results: dict) -> dict:
    """
    Classify portfolio archetype, primary drivers, and main vulnerabilities.
    """
    exposures     = results.get("exposures", {})
    themes        = exposures.get("themes", {})
    asset_classes = exposures.get("asset_classes", {})
    concentration = results["concentration"]
    enp_risk = concentration.get("enp_risk", concentration["effective_n"])
    beta     = results["beta"]
    downside = results["downside_capture"]
    max_dd   = results["max_drawdown"]

    portfolio_type  = _dna_type(themes, asset_classes, beta, enp_risk, max_dd)
    primary_drivers = [t for t, _ in list(themes.items())[:4] if themes[t] > 0.05]
    vulnerabilities = _dna_vulnerabilities(themes, asset_classes, enp_risk, beta, downside)

    return {
        "type": portfolio_type,
        "primary_drivers": primary_drivers,
        "vulnerabilities": vulnerabilities,
    }


def _dna_type(themes: dict, asset_classes: dict, beta: float,
              enp_risk: float, max_dd: float) -> str:
    top_theme     = max(themes, key=themes.get) if themes else None
    top_theme_pct = themes.get(top_theme, 0) if top_theme else 0
    crypto_pct    = asset_classes.get("crypto", 0)
    bond_pct      = asset_classes.get("bond", 0)
    cash_pct      = asset_classes.get("cash", 0)
    gold_pct      = asset_classes.get("gold", 0)
    equity_pct    = asset_classes.get("equity", 0)

    if crypto_pct > 0.3:
        return "Crypto-Heavy Aggressive"
    if top_theme == "AI Semis" and top_theme_pct > 0.5:
        return "AI Infrastructure Concentrated"
    if top_theme == "China Tech" and top_theme_pct > 0.4:
        return "China Tech Speculative"
    if gold_pct > 0.3 or top_theme == "Gold" and top_theme_pct > 0.3:
        return "Macro Hedge / Gold-Tilted"
    if bond_pct + cash_pct > 0.6:
        return "Conservative Fixed Income"
    if bond_pct > 0.3 and gold_pct > 0.1:
        return "Macro Defensive"
    if bond_pct > 0.25 and equity_pct > 0.5:
        return "Balanced / Risk-Managed"

    tech_themes = {"AI Semis", "Mega-Cap Tech", "Growth Tech", "Cloud/SaaS", "Cybersecurity"}
    tech_pct = sum(themes.get(t, 0) for t in tech_themes)
    if tech_pct > 0.7 and enp_risk < 3:
        return "High-Concentration Technology"
    if tech_pct > 0.6:
        return "Diversified Technology Growth"

    if beta > 1.5 and enp_risk < 3:
        return "High-Beta Concentrated"
    if beta > 1.2:
        return "Aggressive Growth"
    if beta < 0.7 and max_dd > -0.10:
        return "Defensive / Low-Volatility"
    if enp_risk > 6:
        return "Diversified Multi-Asset"

    return "Diversified Multi-Asset"


def _dna_vulnerabilities(themes: dict, asset_classes: dict,
                         enp_risk: float, beta: float, downside: float) -> list[str]:
    vulns = []
    top_theme = max(themes, key=themes.get) if themes else None

    if top_theme in ("AI Semis", "Mega-Cap Tech", "Growth Tech", "Cloud/SaaS"):
        vulns.append("Rate shock / growth multiple compression")
        vulns.append("AI capex cycle reversal")
    if themes.get("China Tech", 0) > 0.1:
        vulns.append("US-China geopolitical escalation")
    if asset_classes.get("crypto", 0) > 0.1:
        vulns.append("Crypto deleveraging / liquidity unwind")
    if enp_risk < 3:
        vulns.append("Single-factor concentration (correlated drawdown)")
    if beta > 1.3:
        vulns.append("Broad market selloff (elevated beta)")
    if downside > 1.1:
        vulns.append("Risk-off rotation / flight to quality")
    if asset_classes.get("bond", 0) < 0.05 and asset_classes.get("gold", 0) < 0.05:
        vulns.append("No safe-haven hedges in portfolio")
    if top_theme == "EV/Auto":
        vulns.append("EV demand slowdown / subsidy cuts")

    return vulns[:4]
