// Monte Carlo robustness check.
// Bootstrap trade-level returns (or daily returns) to build a distribution
// of possible cumulative outcomes. The point is to ask: "given this trade
// distribution, how likely is the realized outcome — and what's the range?"
//
// Caveat (and explainer-worthy): bootstrap assumes IID. Trade returns
// often aren't IID (trends, regimes, autocorrelation). MC underestimates
// risk in trending markets and overestimates it in mean-reverting ones.
// We surface this caveat in the UI.

import { dailyReturns } from "./backtest";

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function bootstrapTradeReturns(trades, opts = {}) {
  const {
    runs = 1000,
    startingCash = 100_000,
    sampleSize = null,
  } = opts;

  if (!trades.length) {
    return emptyMc();
  }

  const pnls = trades.map((t) => t.netPnl);
  const n = sampleSize ?? trades.length;
  const ends = [];
  const trajectories = [];
  let profitableCount = 0;
  let maxDDs = [];

  for (let r = 0; r < runs; r++) {
    let equity = startingCash;
    let peak = startingCash;
    let dd = 0;
    const path = [equity];
    for (let i = 0; i < n; i++) {
      const p = pnls[Math.floor(Math.random() * pnls.length)];
      equity += p;
      if (equity > peak) peak = equity;
      if (equity - peak < dd) dd = equity - peak;
      path.push(equity);
    }
    ends.push(equity - startingCash);
    maxDDs.push(dd);
    if (equity > startingCash) profitableCount += 1;
    if (r < 200) trajectories.push(path);
  }

  ends.sort((a, b) => a - b);
  maxDDs.sort((a, b) => a - b);

  return {
    runs,
    sampleSize: n,
    p5: percentile(ends, 0.05),
    p25: percentile(ends, 0.25),
    median: percentile(ends, 0.5),
    p75: percentile(ends, 0.75),
    p95: percentile(ends, 0.95),
    mean: ends.reduce((a, b) => a + b, 0) / ends.length,
    profitableRate: profitableCount / runs,
    p5MaxDD: percentile(maxDDs, 0.05),
    medianMaxDD: percentile(maxDDs, 0.5),
    trajectories,
    realizedEnd: trades.reduce((a, t) => a + t.netPnl, 0),
  };
}

export function bootstrapDailyReturns(equity, opts = {}) {
  const {
    runs = 1000,
    days = null,
    startingCash = 100_000,
  } = opts;

  const rets = dailyReturns(equity).map((r) => r.ret);
  if (!rets.length) return emptyMc();
  const n = days ?? rets.length;
  const ends = [];
  const maxDDs = [];

  for (let r = 0; r < runs; r++) {
    let eq = startingCash;
    let peak = startingCash;
    let dd = 0;
    for (let i = 0; i < n; i++) {
      const rt = rets[Math.floor(Math.random() * rets.length)];
      eq *= 1 + rt;
      if (eq > peak) peak = eq;
      const cur = eq / peak - 1;
      if (cur < dd) dd = cur;
    }
    ends.push(eq / startingCash - 1);
    maxDDs.push(dd);
  }

  ends.sort((a, b) => a - b);
  maxDDs.sort((a, b) => a - b);

  return {
    runs,
    days: n,
    p5: percentile(ends, 0.05),
    p25: percentile(ends, 0.25),
    median: percentile(ends, 0.5),
    p75: percentile(ends, 0.75),
    p95: percentile(ends, 0.95),
    mean: ends.reduce((a, b) => a + b, 0) / ends.length,
    p5MaxDDPct: percentile(maxDDs, 0.05),
    medianMaxDDPct: percentile(maxDDs, 0.5),
  };
}

function emptyMc() {
  return {
    runs: 0, p5: 0, p25: 0, median: 0, p75: 0, p95: 0, mean: 0,
    profitableRate: 0, p5MaxDD: 0, medianMaxDD: 0, trajectories: [], realizedEnd: 0,
  };
}
