import numpy as np
import pandas as pd

from risk.scenarios import compute_stress_scenarios


def compute_daily_returns(prices: pd.DataFrame) -> pd.DataFrame:
    return prices.pct_change().dropna()


def compute_portfolio_returns(daily_returns: pd.DataFrame, weights: list[float]) -> pd.Series:
    return daily_returns.dot(weights)


def compute_annualized_return(portfolio_returns: pd.Series) -> float:
    return (1 + portfolio_returns.mean()) ** 252 - 1


def compute_annualized_volatility(portfolio_returns: pd.Series) -> float:
    return float(portfolio_returns.std(ddof=1) * np.sqrt(252))


def compute_sharpe(annualized_return: float, annualized_volatility: float, risk_free_rate: float) -> float:
    if annualized_volatility == 0:
        return 0.0
    return (annualized_return - risk_free_rate) / annualized_volatility


def compute_beta(portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    cov_matrix = np.cov(portfolio_returns, benchmark_returns, ddof=1)
    return float(cov_matrix[0, 1] / cov_matrix[1, 1])


def compute_max_drawdown(portfolio_returns: pd.Series) -> float:
    cum = pd.concat([pd.Series([1.0]), (1 + portfolio_returns).cumprod()], ignore_index=True)
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max
    return float(drawdown.min())


def compute_drawdown_series(portfolio_returns: pd.Series) -> pd.Series:
    cum = (1 + portfolio_returns).cumprod()
    cum_with_start = pd.concat([pd.Series([1.0]), cum], ignore_index=True)
    rolling_max = cum_with_start.cummax()
    drawdown = (cum.to_numpy() - rolling_max.iloc[1:].to_numpy()) / rolling_max.iloc[1:].to_numpy()
    return pd.Series(drawdown, index=portfolio_returns.index)


def compute_cumulative_return_series(returns: pd.Series) -> pd.Series:
    """Cumulative return series indexed by date, starting at 0.0 (i.e., return-since-start)."""
    return (1 + returns).cumprod() - 1.0


def compute_monthly_returns(returns: pd.Series) -> list[dict]:
    """Compound daily returns to monthly. Returns list of {year, month, value}."""
    monthly = (1 + returns).resample("ME").prod() - 1
    return [
        {
            "year": int(idx.year),
            "month": int(idx.month),
            "value": round(float(val), 6),
        }
        for idx, val in monthly.items()
        if pd.notna(val)
    ]


def compute_rolling_sharpe(returns: pd.Series, window: int = 63, rf: float = 0.045) -> list[dict]:
    """Rolling Sharpe ratio over a window of trading days (default ~3 months)."""
    if len(returns) < window:
        return []
    rolling_mean = returns.rolling(window).mean() * 252
    rolling_vol = returns.rolling(window).std(ddof=1) * (252 ** 0.5)
    sharpe = (rolling_mean - rf) / rolling_vol
    return [
        {"date": str(idx.date()), "value": round(float(val), 4)}
        for idx, val in sharpe.items()
        if pd.notna(val)
    ]


def compute_correlation_matrix(daily_returns: pd.DataFrame) -> dict[str, dict[str, float]]:
    return daily_returns.corr().to_dict()


def compute_var_cvar(portfolio_returns: pd.Series) -> tuple[float, float]:
    """Historical VaR and CVaR at 95% confidence, scaled to monthly (√22)."""
    sorted_r = portfolio_returns.sort_values()
    var_95 = float(sorted_r.quantile(0.05))
    below_var = sorted_r[sorted_r <= var_95]
    cvar_95 = float(below_var.mean()) if len(below_var) > 0 else var_95
    scale = np.sqrt(22)
    return round(var_95 * scale, 6), round(cvar_95 * scale, 6)


def compute_capture_ratios(
    portfolio_returns: pd.Series, benchmark_returns: pd.Series
) -> tuple[float, float]:
    up_mask = benchmark_returns > 0
    down_mask = benchmark_returns < 0
    up_bench = benchmark_returns[up_mask].mean()
    down_bench = benchmark_returns[down_mask].mean()
    upside = float(portfolio_returns[up_mask].mean() / up_bench) if up_bench != 0 else 1.0
    downside = float(portfolio_returns[down_mask].mean() / down_bench) if down_bench != 0 else 1.0
    return round(upside, 4), round(downside, 4)


def compute_benchmark_attribution(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series,
    ann_return: float,
) -> dict:
    beta = compute_beta(portfolio_returns, benchmark_returns)
    bench_ann = compute_annualized_return(benchmark_returns)
    beta_contribution = float(beta * bench_ann)
    alpha = float(ann_return - beta_contribution)
    active = portfolio_returns - benchmark_returns
    tracking_error = float(active.std(ddof=1) * np.sqrt(252))
    info_ratio = round(alpha / tracking_error, 4) if tracking_error > 0 else 0.0
    pct_from_beta = round(beta_contribution / ann_return, 4) if ann_return != 0 else 1.0
    return {
        "beta": round(beta, 4),
        "alpha_annualized": round(alpha, 4),
        "beta_contribution": round(beta_contribution, 4),
        "benchmark_return": round(float(bench_ann), 4),
        "pct_from_beta": float(pct_from_beta),
        "tracking_error": round(tracking_error, 4),
        "information_ratio": float(info_ratio),
    }


def compute_risk_score(sharpe: float, max_drawdown: float, enp_risk: float, beta: float) -> float:
    sharpe_c = max(0.0, 1.0 - sharpe) * 2.0
    drawdown_c = min(abs(max_drawdown) / 0.5, 1.0) * 3.0
    conc_c = max(0.0, 1.0 - enp_risk / 5.0) * 2.5
    beta_c = min(beta / 2.0, 1.0) * 2.5
    return round(min(sharpe_c + drawdown_c + conc_c + beta_c, 10.0), 1)



def run_analysis(payload) -> dict:
    from data.fetcher import fetch_prices
    from ai.analyst import generate_dna, generate_summary
    from data.classifier import classify_portfolio
    from risk.contributions import compute_concentration, compute_enp_risk, compute_risk_contributions
    from risk.periods import compute_best_periods, compute_worst_periods

    tickers = [h.ticker for h in payload.holdings]
    weights = [h.weight for h in payload.holdings]
    benchmark = payload.benchmark

    fetch_tickers = list(dict.fromkeys(tickers + [benchmark]))
    prices, limited_history_tickers = fetch_prices(fetch_tickers, payload.start_date, payload.end_date)
    actual_start = str(prices.index[0].date())
    actual_end = str(prices.index[-1].date())

    all_returns = compute_daily_returns(prices)
    if len(all_returns) < 30:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail=(
                f"Only {len(all_returns)} trading days found. "
                "Extend the date range — minimum 30 days required."
            ),
        )
    ticker_returns = all_returns[tickers]
    benchmark_returns = all_returns[benchmark]

    portfolio_returns = compute_portfolio_returns(ticker_returns, weights)
    ann_return = compute_annualized_return(portfolio_returns)
    ann_vol = compute_annualized_volatility(portfolio_returns)
    var_95, cvar_95 = compute_var_cvar(portfolio_returns)
    upside_capture, downside_capture = compute_capture_ratios(portfolio_returns, benchmark_returns)
    exposures = classify_portfolio(tickers, weights)
    risk_contribs = compute_risk_contributions(ticker_returns, weights)
    concentration = compute_concentration(weights)
    concentration["enp_risk"] = compute_enp_risk(risk_contribs)
    stress_totals, stress_breakdown = compute_stress_scenarios(tickers, weights)

    results = {
        "tickers": tickers,
        "weights": weights,
        "annualized_return": round(ann_return, 4),
        "annualized_volatility": round(ann_vol, 4),
        "sharpe_ratio": round(compute_sharpe(ann_return, ann_vol, payload.risk_free_rate), 4),
        "beta": round(compute_beta(portfolio_returns, benchmark_returns), 4),
        "max_drawdown": round(compute_max_drawdown(portfolio_returns), 4),
        "var_95": var_95,
        "cvar_95": cvar_95,
        "upside_capture": upside_capture,
        "downside_capture": downside_capture,
        "risk_contributions": risk_contribs,
        "concentration": concentration,
        "worst_periods": compute_worst_periods(portfolio_returns),
        "best_periods": compute_best_periods(portfolio_returns),
        "exposures": exposures,
        "correlation_matrix": {
            t: {u: round(v, 4) for u, v in row.items()}
            for t, row in compute_correlation_matrix(ticker_returns).items()
        },
        "drawdown_series": [
            {"date": str(idx.date()), "value": round(float(val), 4)}
            for idx, val in compute_drawdown_series(portfolio_returns).items()
        ],
        "cumulative_return_series": [
            {"date": str(idx.date()), "portfolio": round(float(p), 6), "benchmark": round(float(b), 6)}
            for idx, p, b in zip(
                portfolio_returns.index,
                compute_cumulative_return_series(portfolio_returns).values,
                compute_cumulative_return_series(benchmark_returns).values,
            )
        ],
        "monthly_returns": compute_monthly_returns(portfolio_returns),
        "rolling_sharpe": compute_rolling_sharpe(portfolio_returns, rf=payload.risk_free_rate),
        "stress_scenarios": stress_totals,
        "stress_breakdown": stress_breakdown,
        "period": {"start": payload.start_date, "end": payload.end_date},
        "actual_period": {"start": actual_start, "end": actual_end},
        "limited_history_tickers": [t for t in limited_history_tickers if t != benchmark],
        "benchmark": benchmark,
    }
    benchmark_attribution = compute_benchmark_attribution(portfolio_returns, benchmark_returns, ann_return)
    risk_score = compute_risk_score(
        results["sharpe_ratio"],
        results["max_drawdown"],
        concentration["enp_risk"],
        results["beta"],
    )
    results["benchmark_attribution"] = benchmark_attribution
    results["risk_score"] = risk_score
    from risk.score import compute_panko_score
    results["panko_score"] = compute_panko_score(results)
    results["analyst_summary"] = generate_summary(results)
    results["portfolio_dna"] = generate_dna(results)
    return results
