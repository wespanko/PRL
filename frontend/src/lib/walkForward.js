// Walk-forward analysis: split data into N consecutive folds, simulate
// re-running the backtest fold-by-fold, and compare in-sample vs out-of-sample
// performance for each fold.
//
// In this MVP we do NOT re-optimize parameters per fold (that's "anchored
// walk-forward optimization" — a real WFO tool would search a parameter
// grid on the in-sample portion of each fold, then test on the out-of-sample
// portion). We do the simpler version: same params throughout, but expose
// fold-by-fold stability. That alone often kills strategies that look
// great over the full sample but are carried by one regime.

import { backtest, cagr, annualizedSharpe, dailyReturns, maxDrawdownEquity } from "./backtest";

export function walkForward(bars, strategyId, params, opts = {}) {
  const { folds = 5, startingCash = 100_000 } = opts;
  if (bars.length < folds * 50) {
    return { folds: [], summary: null, valid: false, reason: "Not enough bars for the requested number of folds." };
  }

  const foldSize = Math.floor(bars.length / folds);
  const results = [];

  for (let f = 0; f < folds; f++) {
    const startIdx = f * foldSize;
    const endIdx = f === folds - 1 ? bars.length : (f + 1) * foldSize;
    const slice = bars.slice(startIdx, endIdx);
    const r = backtest(slice, strategyId, params, { startingCash });
    const rets = dailyReturns(r.equity);
    const sharpe = annualizedSharpe(rets);
    const c = cagr(r.equity);
    const { maxDDPct } = maxDrawdownEquity(r.equity);
    results.push({
      fold: f + 1,
      startDate: slice[0]?.date,
      endDate: slice[slice.length - 1]?.date,
      totalReturn: r.totalReturn,
      cagr: c,
      sharpe,
      maxDDPct,
      trades: r.trades.length,
      timeInMarketPct: r.timeInMarketPct,
    });
  }

  // Summary stats
  const sharpes = results.map((r) => r.sharpe);
  const returns = results.map((r) => r.totalReturn);
  const positiveCount = results.filter((r) => r.totalReturn > 0).length;
  const meanSharpe = mean(sharpes);
  const sdSharpe = stddev(sharpes);
  const stability = sdSharpe === 0 ? 0 : Math.abs(meanSharpe) / sdSharpe;

  return {
    folds: results,
    summary: {
      foldsTotal: folds,
      positiveCount,
      positiveRate: positiveCount / folds,
      meanSharpe,
      sdSharpe,
      stability,
      meanReturn: mean(returns),
      worstFold: results.reduce((a, b) => (a.totalReturn < b.totalReturn ? a : b)),
      bestFold: results.reduce((a, b) => (a.totalReturn > b.totalReturn ? a : b)),
    },
    valid: true,
  };
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length); }
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}
