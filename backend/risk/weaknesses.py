def detect_weaknesses(results: dict) -> list[dict]:
    """
    Detect structural portfolio weaknesses and rank by severity.
    Returns a list of dicts: { id, severity, title, description, metric, metric_value }
    Sorted critical-first.
    """
    weaknesses = []

    concentration = results.get("concentration", {})
    enp_risk = concentration.get("enp_risk", 0.0)
    enp_capital = concentration.get("effective_n", 0.0)
    risk_contribs = results.get("risk_contributions", [])
    exposures = results.get("exposures", {})
    themes = exposures.get("themes", {})
    asset_classes = exposures.get("asset_classes", {})
    ba = results.get("benchmark_attribution", {})

    top_rc = max(risk_contribs, key=lambda x: x["pct_risk"]) if risk_contribs else {}
    top_rc_pct = top_rc.get("pct_risk", 0.0)
    top_rc_ticker = top_rc.get("ticker", "?")
    top_rc_weight = top_rc.get("weight", 0.0)

    top_theme_name, top_theme_pct = max(themes.items(), key=lambda x: x[1]) if themes else ("", 0.0)

    bond_pct = asset_classes.get("bond", 0.0)
    gold_pct = asset_classes.get("gold", 0.0)
    cash_pct = asset_classes.get("cash", 0.0)
    crypto_pct = asset_classes.get("crypto", 0.0)

    downside_capture = results.get("downside_capture", 1.0)
    beta = results.get("beta", 1.0)
    pct_from_beta = ba.get("pct_from_beta", 0.0)
    ann_return = results.get("annualized_return", 0.0)
    var_95 = results.get("var_95", 0.0)
    max_drawdown = results.get("max_drawdown", 0.0)
    benchmark = results.get("benchmark", "SPY")

    # 1. Concentration Risk
    if enp_risk < 3.0 or top_rc_pct > 0.35:
        sev = "critical" if (enp_risk < 2.0 or top_rc_pct > 0.50) else "warning"
        weaknesses.append({
            "id": "concentration",
            "severity": sev,
            "title": "Single-name concentration",
            "description": (
                f"{top_rc_ticker} drives {top_rc_pct:.0%} of total portfolio risk "
                f"despite {top_rc_weight:.0%} capital weight."
            ),
            "metric": "enp_risk",
            "metric_value": enp_risk,
        })

    # 2. Downside Capture Problem
    if downside_capture > 1.15:
        sev = "critical" if downside_capture > 1.4 else "warning"
        weaknesses.append({
            "id": "downside_capture",
            "severity": sev,
            "title": "Unfavourable capture ratio",
            "description": (
                f"Portfolio loses {downside_capture:.2f}× more than {benchmark} in down months. "
                "This asymmetry compounds against you."
            ),
            "metric": "downside_capture",
            "metric_value": downside_capture,
        })

    # 3. Beta Overexposure
    if beta > 1.3 and ann_return > 0 and pct_from_beta > 0.75:
        weaknesses.append({
            "id": "beta_drag",
            "severity": "warning",
            "title": "High beta, low alpha",
            "description": (
                f"{pct_from_beta:.0%} of your return came from market beta, not stock selection. "
                "You're running an active portfolio that behaves like a leveraged index."
            ),
            "metric": "beta",
            "metric_value": beta,
        })

    # 4. Thematic Overlap / Hidden Concentration
    if top_theme_pct > 0.60 and enp_capital > 0 and enp_risk < enp_capital * 0.6:
        weaknesses.append({
            "id": "thematic_overlap",
            "severity": "warning",
            "title": "Hidden thematic concentration",
            "description": (
                f"Your holdings look diversified by count but share the same underlying driver "
                f"({top_theme_name} at {top_theme_pct:.0%}). "
                "In a theme selloff, they would likely fall together."
            ),
            "metric": "top_theme_pct",
            "metric_value": top_theme_pct,
        })

    # 5. Rate Sensitivity
    _rate_themes = {"AI Semis", "Mega-Cap Tech", "Growth Tech", "Cloud/SaaS"}
    if top_theme_name in _rate_themes and top_theme_pct > 0.50:
        weaknesses.append({
            "id": "rate_sensitivity",
            "severity": "warning",
            "title": "Rate-sensitive growth exposure",
            "description": (
                f"Long-duration growth assets dominate your portfolio "
                f"({top_theme_name} at {top_theme_pct:.0%}). "
                "Rising rates or multiple compression would reprice these holdings disproportionately."
            ),
            "metric": "top_theme_pct",
            "metric_value": top_theme_pct,
        })

    # 6. Crypto Overexposure
    if crypto_pct > 0.15:
        sev = "critical" if crypto_pct > 0.35 else "warning"
        weaknesses.append({
            "id": "crypto_overexposure",
            "severity": sev,
            "title": "Crypto overexposure",
            "description": (
                f"Crypto assets exhibit extreme drawdowns in risk-off environments. "
                f"Your {crypto_pct:.0%} allocation implies an aggressive risk appetite in this asset class."
            ),
            "metric": "crypto_pct",
            "metric_value": crypto_pct,
        })

    # 7. Missing Hedges
    safe_haven = bond_pct + gold_pct + cash_pct
    if safe_haven < 0.05 and max_drawdown < -0.25:
        weaknesses.append({
            "id": "no_hedges",
            "severity": "warning",
            "title": "No safe-haven exposure",
            "description": (
                f"Your portfolio has no meaningful safe-haven exposure "
                f"(bonds + gold + cash = {safe_haven:.0%}). "
                "During equity selloffs, there is no uncorrelated position to cushion the drawdown."
            ),
            "metric": "safe_haven_pct",
            "metric_value": safe_haven,
        })

    # 8. VaR Warning
    if var_95 < -0.12:
        sev = "critical" if var_95 < -0.20 else "warning"
        weaknesses.append({
            "id": "var_warning",
            "severity": sev,
            "title": "High tail risk",
            "description": (
                f"A 1-in-20 month loss exceeds {abs(var_95):.0%}. "
                "At this risk level, a single bad month can undo months of gains."
            ),
            "metric": "var_95",
            "metric_value": var_95,
        })

    _order = {"critical": 0, "warning": 1}
    weaknesses.sort(key=lambda w: _order.get(w["severity"], 2))
    return weaknesses
