import numpy as np
import pandas as pd


def compute_risk_contributions(returns: pd.DataFrame, weights: list[float]) -> list[dict]:
    """Percentage risk contribution (PRC) per holding. Values sum to 1.0."""
    w = np.array(weights, dtype=float)
    cov = returns.cov() * 252  # annualised covariance matrix
    port_variance = float(w @ cov.values @ w)
    port_vol = np.sqrt(port_variance)

    if port_vol == 0:
        equal = round(1.0 / len(w), 6)
        return [
            {"ticker": str(t), "weight": round(float(w[i]), 6), "pct_risk": equal}
            for i, t in enumerate(returns.columns)
        ]

    mcr = cov.values @ w / port_vol       # marginal contribution to risk, shape (N,)
    component_risk = w * mcr              # contribution to total vol, shape (N,)
    pct_risk = component_risk / port_vol  # sums to 1.0

    return [
        {
            "ticker": str(ticker),
            "weight": round(float(w[i]), 6),
            "pct_risk": round(float(pct_risk[i]), 6),
        }
        for i, ticker in enumerate(returns.columns)
    ]


def compute_enp_risk(risk_contributions: list[dict]) -> float:
    """
    Correlation-adjusted effective number of positions.
    Uses HHI of risk contributions (PRC) rather than capital weights.
    Naturally lower than ENP_capital when holdings are correlated,
    because correlated assets inflate one PRC and shrink the others.
    """
    hhi_risk = sum(c["pct_risk"] ** 2 for c in risk_contributions)
    return round(1.0 / hhi_risk, 4) if hhi_risk > 0 else float(len(risk_contributions))


def compute_concentration(weights: list[float]) -> dict:
    w = np.array(weights, dtype=float)
    hhi = float(np.sum(w ** 2))
    effective_n = round(1.0 / hhi, 4) if hhi > 0 else float(len(w))
    sorted_w = sorted(w, reverse=True)
    return {
        "hhi": round(hhi, 6),
        "effective_n": effective_n,
        "top1_weight": round(float(sorted_w[0]), 6),
        "top3_weight": round(float(sum(sorted_w[:3])), 6),
        "top5_weight": round(float(sum(sorted_w[:5])), 6),
    }
