export function buildPortfolioContext(results, payload) {
  if (!results) return null;
  const rc = results.risk_contributions ?? [];
  const topRisk = rc.length ? [...rc].sort((a, b) => b.pct_risk - a.pct_risk)[0] : {};
  const themes = results.exposures?.themes ?? {};
  const topTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const stress = results.stress_scenarios ?? {};

  return {
    tickers: results.tickers,
    weights: results.weights,
    period: results.period,
    benchmark: results.benchmark ?? payload?.benchmark ?? "SPY",
    sharpe_ratio: results.sharpe_ratio,
    annualized_return: results.annualized_return,
    annualized_volatility: results.annualized_volatility,
    max_drawdown: results.max_drawdown,
    beta: results.beta,
    var_95: results.var_95,
    upside_capture: results.upside_capture,
    downside_capture: results.downside_capture,
    enp_capital: results.concentration?.effective_n,
    enp_risk: results.concentration?.enp_risk,
    hhi: results.concentration?.hhi,
    risk_score: results.risk_score,
    portfolio_dna: results.portfolio_dna?.type,
    top_theme: topTheme,
    benchmark_alpha: results.benchmark_attribution?.alpha_annualized,
    benchmark_beta: results.benchmark_attribution?.beta,
    pct_from_beta: results.benchmark_attribution?.pct_from_beta,
    risk_contributions: rc,
    stress_scenarios: stress,
  };
}
