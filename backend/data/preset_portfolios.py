"""
Curated portfolios for the Build tab's preset paths (Quick Start goals +
Diagnosis presets). Pre-computed so /api/thesis can serve them instantly
without an LLM call.

Each preset has 3 risk-tolerance variants (conservative / balanced /
aggressive). All weights sum to 1.0 within each variant.

Structure:
  PRESETS[preset_id] = {
      "themes": [str, ...],
      "summary_by_risk": {risk_level: str},
      "holdings_by_risk": {risk_level: [{ticker, weight, reason}, ...]},
  }

The endpoint joins each {ticker, reason} with the curated universe metadata
(name, theme, role) from data/universe.py to produce the same output shape
that the live-LLM path returns.
"""

PRESETS = {
    # ── Quick Start: "Grow my money long-term" ──────────────────────────────
    "long_term_growth": {
        "themes": ["Long-term growth", "US equity tilt", "International diversification", "Light hedge sleeve"],
        "summary_by_risk": {
            "conservative": (
                "Lean into broad equity for long-run compounding while keeping a meaningful "
                "bond and gold cushion. Lower drawdowns, slower compounding."
            ),
            "balanced": (
                "Tilt toward US equity and tech for compounding, with international diversification "
                "and a measured bond+gold sleeve to soften the worst drawdowns."
            ),
            "aggressive": (
                "Maximum equity exposure across US large-cap, tech, and international, with select "
                "mega-cap names for thematic alpha and only a small hedge for tail-risk."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "SPY",  "weight": 0.30, "reason": "Core US large-cap exposure for long-run compounding."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "Diversifies beyond US equity into developed and emerging markets."},
                {"ticker": "QQQ",  "weight": 0.10, "reason": "Tech-heavy growth tilt."},
                {"ticker": "AGG",  "weight": 0.25, "reason": "Broad bond exposure as a stabilizer in down markets."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long-duration treasuries: strong recession hedge."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis and inflation hedge with low correlation to equities."},
            ],
            "balanced": [
                {"ticker": "SPY",  "weight": 0.25, "reason": "Core US large-cap anchor for long-run compounding."},
                {"ticker": "QQQ",  "weight": 0.20, "reason": "Tech growth tilt — historically the strongest compounder."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International diversification cuts US-only concentration."},
                {"ticker": "AGG",  "weight": 0.15, "reason": "Bonds for the stabilizer sleeve."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Uncorrelated crisis hedge."},
                {"ticker": "MSFT", "weight": 0.08, "reason": "Mega-cap quality with cloud + AI exposure."},
                {"ticker": "GOOGL","weight": 0.07, "reason": "Search + AI moat with strong free cash flow."},
            ],
            "aggressive": [
                {"ticker": "QQQ",  "weight": 0.25, "reason": "Tech-tilted growth core."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "US large-cap anchor."},
                {"ticker": "NVDA", "weight": 0.10, "reason": "AI infrastructure leader — concentrated thematic bet."},
                {"ticker": "MSFT", "weight": 0.10, "reason": "Mega-cap quality + AI exposure."},
                {"ticker": "GOOGL","weight": 0.08, "reason": "Search + AI moat."},
                {"ticker": "META", "weight": 0.07, "reason": "Social + AI infrastructure."},
                {"ticker": "VXUS", "weight": 0.10, "reason": "International diversification."},
                {"ticker": "EEM",  "weight": 0.10, "reason": "Emerging market growth exposure."},
                {"ticker": "GLD",  "weight": 0.05, "reason": "Small crisis hedge for tail risk."},
            ],
        },
    },

    # ── Quick Start: "Avoid big losses" ─────────────────────────────────────
    "avoid_losses": {
        "themes": ["Capital preservation", "Drawdown control", "Defensive equity", "Inflation protection"],
        "summary_by_risk": {
            "conservative": (
                "Maximum capital preservation: bond-heavy with low-volatility equity, gold, and "
                "inflation-protected treasuries. Caps drawdowns under typical bear markets."
            ),
            "balanced": (
                "Defensive but participating: low-volatility equity sleeve, broad bonds, gold, "
                "and inflation hedges. Smaller drawdowns at the cost of lower upside."
            ),
            "aggressive": (
                "Defense-first but with more equity participation. Low-volatility ETF and broad "
                "equity for upside; bonds, gold, real estate for stability."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "AGG",  "weight": 0.35, "reason": "Broad bond exposure — primary stabilizer."},
                {"ticker": "TLT",  "weight": 0.15, "reason": "Long-duration treasuries: best recession hedge."},
                {"ticker": "USMV", "weight": 0.15, "reason": "Low-volatility US equity for participation without big swings."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis and inflation hedge."},
                {"ticker": "TIP",  "weight": 0.10, "reason": "Inflation-protected treasuries — real return safety."},
                {"ticker": "SHY",  "weight": 0.10, "reason": "Short-duration treasuries — cash equivalent."},
            ],
            "balanced": [
                {"ticker": "AGG",  "weight": 0.25, "reason": "Bond core."},
                {"ticker": "USMV", "weight": 0.20, "reason": "Low-volatility US equity sleeve."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Some broad equity for participation."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis hedge."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long treasuries: rate-cut benefit in recession."},
                {"ticker": "TIP",  "weight": 0.10, "reason": "Inflation protection."},
                {"ticker": "VNQ",  "weight": 0.05, "reason": "Real estate diversifier."},
            ],
            "aggressive": [
                {"ticker": "USMV", "weight": 0.25, "reason": "Low-vol equity is the main growth engine."},
                {"ticker": "SPY",  "weight": 0.20, "reason": "Broad equity participation."},
                {"ticker": "AGG",  "weight": 0.20, "reason": "Bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis hedge."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long treasuries — recession protection."},
                {"ticker": "VNQ",  "weight": 0.10, "reason": "Real estate income + diversification."},
            ],
        },
    },

    # ── Quick Start: "Bet on tech and AI" ───────────────────────────────────
    "tech_growth": {
        "themes": ["AI / Semis bet", "Mega-cap tech tilt", "Growth-leaning", "Bond + gold hedges"],
        "summary_by_risk": {
            "conservative": (
                "Tech-tilted equity with substantial bond and gold hedges. Captures AI upside "
                "with explicit protection against rate shocks and tech corrections."
            ),
            "balanced": (
                "Concentrated AI/megacap tech bet with real hedges. Strong upside if the AI thesis "
                "plays out, with bonds and gold to soften a tech selloff."
            ),
            "aggressive": (
                "Maximum AI/semi/megacap concentration with select hedges. Highest expected return "
                "if the AI cycle continues; significant drawdown risk if it breaks."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "QQQ",  "weight": 0.20, "reason": "Tech-heavy core; covers most AI infrastructure exposure."},
                {"ticker": "SPY",  "weight": 0.25, "reason": "Broad US equity diversifier."},
                {"ticker": "MSFT", "weight": 0.10, "reason": "Quality megacap with cloud + AI exposure."},
                {"ticker": "AGG",  "weight": 0.20, "reason": "Bond stabilizer."},
                {"ticker": "TLT",  "weight": 0.15, "reason": "Long treasuries — explicit rate-shock hedge."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
            ],
            "balanced": [
                {"ticker": "QQQ",  "weight": 0.25, "reason": "Tech-heavy core for the AI/megacap thesis."},
                {"ticker": "NVDA", "weight": 0.10, "reason": "AI infrastructure leader."},
                {"ticker": "MSFT", "weight": 0.10, "reason": "Cloud + AI mega-cap."},
                {"ticker": "GOOGL","weight": 0.10, "reason": "Search + AI mega-cap."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Diversifier outside tech."},
                {"ticker": "AGG",  "weight": 0.15, "reason": "Bond hedge."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Tech-crash hedge."},
                {"ticker": "TLT",  "weight": 0.05, "reason": "Long-duration rate hedge."},
            ],
            "aggressive": [
                {"ticker": "NVDA", "weight": 0.15, "reason": "Highest-conviction AI infrastructure bet."},
                {"ticker": "QQQ",  "weight": 0.20, "reason": "Tech-heavy core."},
                {"ticker": "MSFT", "weight": 0.12, "reason": "Cloud + AI mega-cap."},
                {"ticker": "GOOGL","weight": 0.10, "reason": "Search + AI."},
                {"ticker": "META", "weight": 0.08, "reason": "Social + AI infra."},
                {"ticker": "SMH",  "weight": 0.10, "reason": "Pure semiconductor exposure."},
                {"ticker": "AAPL", "weight": 0.10, "reason": "Consumer hardware mega-cap."},
                {"ticker": "AGG",  "weight": 0.10, "reason": "Light bond hedge for the worst-case."},
                {"ticker": "GLD",  "weight": 0.05, "reason": "Small crisis sleeve."},
            ],
        },
    },

    # ── Quick Start: "Balanced starter" ─────────────────────────────────────
    "balanced_starter": {
        "themes": ["Diversified core", "Equity + bonds + gold", "International exposure", "Beginner-friendly"],
        "summary_by_risk": {
            "conservative": (
                "Defensive starter: heavier bonds and inflation hedges with a meaningful equity "
                "core. Lower vol and shallower drawdowns; useful learning ground."
            ),
            "balanced": (
                "Classic starter portfolio: US equity core, international diversification, broad "
                "bonds, and a small gold sleeve. Good for learning how the metrics behave."
            ),
            "aggressive": (
                "Equity-leaning starter: more US and international equity, less bonds. Higher "
                "expected return, larger drawdowns — appropriate for long horizons."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "SPY",  "weight": 0.25, "reason": "US large-cap core."},
                {"ticker": "AGG",  "weight": 0.30, "reason": "Bond stabilizer."},
                {"ticker": "VXUS", "weight": 0.10, "reason": "International diversifier."},
                {"ticker": "USMV", "weight": 0.15, "reason": "Low-vol equity sleeve."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "TIP",  "weight": 0.10, "reason": "Inflation-protected bonds."},
            ],
            "balanced": [
                {"ticker": "SPY",  "weight": 0.30, "reason": "US large-cap core."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International diversification."},
                {"ticker": "AGG",  "weight": 0.25, "reason": "Bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "USMV", "weight": 0.10, "reason": "Low-vol equity for smoother ride."},
                {"ticker": "QQQ",  "weight": 0.10, "reason": "Small tech tilt for growth."},
            ],
            "aggressive": [
                {"ticker": "SPY",  "weight": 0.30, "reason": "US large-cap core."},
                {"ticker": "QQQ",  "weight": 0.15, "reason": "Tech growth tilt."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International diversification."},
                {"ticker": "EEM",  "weight": 0.10, "reason": "Emerging market growth."},
                {"ticker": "AGG",  "weight": 0.15, "reason": "Some bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "USMV", "weight": 0.05, "reason": "Small low-vol sleeve."},
            ],
        },
    },

    # ── Diagnosis: "Retirement Safety" ──────────────────────────────────────
    "retirement_safety": {
        "themes": ["Capital preservation", "Drawdown cap", "Inflation protection", "Income"],
        "summary_by_risk": {
            "conservative": (
                "Pre-retirement defense: heavy bonds and inflation-protected treasuries with a "
                "small equity participation sleeve. Designed to cap drawdowns under 10-12%."
            ),
            "balanced": (
                "Pre-retirement balance: meaningful low-vol equity participation with a strong "
                "bond and inflation hedge sleeve. Targets drawdowns under 15%."
            ),
            "aggressive": (
                "Late-career equity tilt: more participation while maintaining substantial "
                "stabilizers. Drawdowns may approach 18-20% in a real bear market."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "AGG",  "weight": 0.30, "reason": "Bond core for stability."},
                {"ticker": "TLT",  "weight": 0.15, "reason": "Long-duration recession hedge."},
                {"ticker": "USMV", "weight": 0.15, "reason": "Low-vol equity participation."},
                {"ticker": "TIP",  "weight": 0.15, "reason": "Inflation protection — critical for retirees."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "SPY",  "weight": 0.10, "reason": "Small broad equity exposure."},
                {"ticker": "SHY",  "weight": 0.05, "reason": "Cash-like reserve."},
            ],
            "balanced": [
                {"ticker": "AGG",  "weight": 0.25, "reason": "Bond core."},
                {"ticker": "USMV", "weight": 0.20, "reason": "Low-vol equity for smoother participation."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Broad US equity."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long-duration rate hedge."},
                {"ticker": "TIP",  "weight": 0.10, "reason": "Inflation-protected treasuries."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "VXUS", "weight": 0.05, "reason": "International diversification."},
                {"ticker": "VNQ",  "weight": 0.05, "reason": "REIT income."},
            ],
            "aggressive": [
                {"ticker": "USMV", "weight": 0.25, "reason": "Low-vol equity is the workhorse."},
                {"ticker": "SPY",  "weight": 0.20, "reason": "Broad US equity."},
                {"ticker": "AGG",  "weight": 0.20, "reason": "Bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "TIP",  "weight": 0.10, "reason": "Inflation protection."},
                {"ticker": "VXUS", "weight": 0.10, "reason": "International diversification."},
                {"ticker": "VNQ",  "weight": 0.05, "reason": "REIT income."},
            ],
        },
    },

    # ── Diagnosis: "Inflation Defense" ──────────────────────────────────────
    "inflation_defense": {
        "themes": ["Inflation hedge", "Real assets", "Pricing-power equity", "Short duration"],
        "summary_by_risk": {
            "conservative": (
                "Heavy inflation-protection sleeve: TIPS, gold, commodities, and energy. "
                "Defensive overall but tilted to real-asset preservation."
            ),
            "balanced": (
                "Real-asset core with pricing-power equity. Designed to participate in inflation "
                "while protecting purchasing power; lower duration, less rate sensitivity."
            ),
            "aggressive": (
                "Aggressive inflation play: heavier commodities, energy, and real estate. "
                "Stronger upside if inflation persists; more volatility."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "TIP",  "weight": 0.25, "reason": "Inflation-protected treasuries — primary real-yield hedge."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Gold — classical inflation hedge."},
                {"ticker": "DBC",  "weight": 0.10, "reason": "Broad commodity basket."},
                {"ticker": "XLE",  "weight": 0.10, "reason": "Energy sector — pricing-power on commodity tailwinds."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Some broad equity participation."},
                {"ticker": "VLUE", "weight": 0.10, "reason": "Value factor — outperforms in inflationary regimes."},
                {"ticker": "USO",  "weight": 0.05, "reason": "Direct oil exposure."},
                {"ticker": "SHY",  "weight": 0.10, "reason": "Short duration — minimal rate sensitivity."},
            ],
            "balanced": [
                {"ticker": "TIP",  "weight": 0.20, "reason": "Inflation-protected treasury core."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Gold inflation hedge."},
                {"ticker": "DBC",  "weight": 0.10, "reason": "Commodity basket."},
                {"ticker": "XLE",  "weight": 0.10, "reason": "Energy sector inflation play."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Broad equity participation."},
                {"ticker": "VLUE", "weight": 0.15, "reason": "Value factor — inflation regime favorite."},
                {"ticker": "USO",  "weight": 0.05, "reason": "Direct oil."},
                {"ticker": "VNQ",  "weight": 0.10, "reason": "Real estate — passes through inflation."},
            ],
            "aggressive": [
                {"ticker": "TIP",  "weight": 0.15, "reason": "TIPS core."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Gold hedge."},
                {"ticker": "DBC",  "weight": 0.10, "reason": "Broad commodities."},
                {"ticker": "XLE",  "weight": 0.15, "reason": "Heavier energy tilt."},
                {"ticker": "SPY",  "weight": 0.10, "reason": "Broad equity diversifier."},
                {"ticker": "VLUE", "weight": 0.15, "reason": "Value factor for inflation regime."},
                {"ticker": "USO",  "weight": 0.05, "reason": "Direct oil."},
                {"ticker": "VNQ",  "weight": 0.10, "reason": "Real estate inflation passthrough."},
                {"ticker": "URA",  "weight": 0.05, "reason": "Uranium / nuclear thematic — secular tailwind."},
            ],
        },
    },

    # ── Diagnosis: "AI Bubble Risk" ─────────────────────────────────────────
    "ai_bubble_risk": {
        "themes": ["Tech hedge", "International rotation", "Defensive sectors", "Bonds + gold"],
        "summary_by_risk": {
            "conservative": (
                "Keeps token AI exposure; heavy hedges via bonds, gold, international, and "
                "defensives. Designed to survive a 30% tech correction without major losses."
            ),
            "balanced": (
                "Material AI exposure but with explicit hedges across uncorrelated assets. "
                "Captures upside if AI continues; soft landing if it corrects."
            ),
            "aggressive": (
                "Significant AI exposure with diversification hedges. Aggressive growth profile "
                "but with offsets so you're not wiped out by a tech-led drawdown."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "SPY",  "weight": 0.20, "reason": "Broad US equity, less tech-concentrated than QQQ."},
                {"ticker": "NVDA", "weight": 0.05, "reason": "Token AI exposure — small position."},
                {"ticker": "MSFT", "weight": 0.05, "reason": "Quality megacap AI exposure."},
                {"ticker": "AGG",  "weight": 0.25, "reason": "Bond stabilizer — uncorrelated to tech."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long treasuries — gain in tech-led recession."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis hedge."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International rotation if US tech corrects."},
                {"ticker": "USMV", "weight": 0.05, "reason": "Low-vol stabilizer."},
            ],
            "balanced": [
                {"ticker": "SPY",  "weight": 0.20, "reason": "Broad US equity diversifier."},
                {"ticker": "NVDA", "weight": 0.08, "reason": "Material AI exposure."},
                {"ticker": "MSFT", "weight": 0.08, "reason": "Megacap AI exposure."},
                {"ticker": "GOOGL","weight": 0.05, "reason": "AI search + cloud."},
                {"ticker": "AGG",  "weight": 0.15, "reason": "Bond stabilizer."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long-duration rate hedge."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International rotation hedge."},
                {"ticker": "USMV", "weight": 0.05, "reason": "Low-vol stabilizer."},
                {"ticker": "XLP",  "weight": 0.04, "reason": "Defensive consumer staples."},
            ],
            "aggressive": [
                {"ticker": "NVDA", "weight": 0.12, "reason": "Significant AI exposure."},
                {"ticker": "MSFT", "weight": 0.10, "reason": "AI megacap."},
                {"ticker": "GOOGL","weight": 0.08, "reason": "Search + AI."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Broad US equity."},
                {"ticker": "TLT",  "weight": 0.10, "reason": "Long treasuries — tech-recession hedge."},
                {"ticker": "GLD",  "weight": 0.10, "reason": "Crisis hedge."},
                {"ticker": "VXUS", "weight": 0.15, "reason": "International rotation."},
                {"ticker": "AGG",  "weight": 0.10, "reason": "Bond stabilizer."},
                {"ticker": "USMV", "weight": 0.05, "reason": "Low-vol stabilizer."},
                {"ticker": "XLP",  "weight": 0.05, "reason": "Defensive sleeve."},
            ],
        },
    },

    # ── Diagnosis: "Recession Shock" ────────────────────────────────────────
    "recession_shock": {
        "themes": ["Long-duration treasuries", "Defensive sectors", "Gold", "Cyclical-light"],
        "summary_by_risk": {
            "conservative": (
                "Maximum recession defense: heavy long treasuries, gold, and defensive sectors. "
                "Designed to gain or stay flat in a major drawdown; capped upside in bull markets."
            ),
            "balanced": (
                "Recession-prepared with some equity participation. Long treasuries as the rate-cut "
                "play, defensive sectors and gold as anchors, modest equity exposure."
            ),
            "aggressive": (
                "Recession-aware but still equity-tilted. Long treasuries and defensives sized to "
                "soften the worst, but enough equity to participate if recession doesn't arrive."
            ),
        },
        "holdings_by_risk": {
            "conservative": [
                {"ticker": "TLT",  "weight": 0.25, "reason": "Long treasuries — primary rate-cut beneficiary."},
                {"ticker": "AGG",  "weight": 0.20, "reason": "Broad bonds for stability."},
                {"ticker": "GLD",  "weight": 0.20, "reason": "Crisis hedge."},
                {"ticker": "XLP",  "weight": 0.10, "reason": "Consumer staples — recession-resilient."},
                {"ticker": "XLU",  "weight": 0.10, "reason": "Utilities — bond proxy, defensive."},
                {"ticker": "XLV",  "weight": 0.10, "reason": "Healthcare — secular and defensive."},
                {"ticker": "SHY",  "weight": 0.05, "reason": "Cash reserve."},
            ],
            "balanced": [
                {"ticker": "TLT",  "weight": 0.20, "reason": "Long treasuries — recession rate-cut hedge."},
                {"ticker": "AGG",  "weight": 0.15, "reason": "Bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis hedge."},
                {"ticker": "XLP",  "weight": 0.10, "reason": "Defensive consumer staples."},
                {"ticker": "XLU",  "weight": 0.10, "reason": "Utilities — recession-resilient."},
                {"ticker": "XLV",  "weight": 0.10, "reason": "Healthcare defensive."},
                {"ticker": "SPY",  "weight": 0.10, "reason": "Some broad equity participation."},
                {"ticker": "USMV", "weight": 0.10, "reason": "Low-vol equity."},
            ],
            "aggressive": [
                {"ticker": "TLT",  "weight": 0.15, "reason": "Long treasuries — recession hedge."},
                {"ticker": "AGG",  "weight": 0.10, "reason": "Bond stabilizer."},
                {"ticker": "GLD",  "weight": 0.15, "reason": "Crisis hedge."},
                {"ticker": "XLP",  "weight": 0.10, "reason": "Defensive consumer."},
                {"ticker": "XLU",  "weight": 0.10, "reason": "Utilities defensive."},
                {"ticker": "XLV",  "weight": 0.10, "reason": "Healthcare defensive."},
                {"ticker": "SPY",  "weight": 0.15, "reason": "Broad equity participation."},
                {"ticker": "USMV", "weight": 0.10, "reason": "Low-vol equity."},
                {"ticker": "ITA",  "weight": 0.05, "reason": "Defense sector — geopolitical hedge."},
            ],
        },
    },
}


def get_preset(preset_id: str, risk_tolerance: str = "balanced") -> dict | None:
    """Return the curated preset response shape: themes, summary, suggestions
    (each with ticker, weight, reason). The endpoint then joins each
    suggestion with universe metadata (name, theme, role).

    Returns None if the preset is unknown."""
    preset = PRESETS.get(preset_id)
    if not preset:
        return None

    risk = (risk_tolerance or "balanced").lower()
    if risk not in ("conservative", "balanced", "aggressive"):
        risk = "balanced"

    return {
        "themes": preset["themes"],
        "summary": preset["summary_by_risk"].get(risk, preset["summary_by_risk"]["balanced"]),
        "holdings": preset["holdings_by_risk"].get(risk, preset["holdings_by_risk"]["balanced"]),
        "risk_tolerance": risk,
    }


def all_preset_ids() -> list[str]:
    return list(PRESETS.keys())
