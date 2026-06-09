function sampleTrade(trades) {
  return trades[Math.floor(Math.random() * trades.length)].netPnl;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const DEFAULT_SIM_INPUTS = {
  accountSize: 50000,
  maxDrawdown: 2000,
  dailyLossLimit: 1000,
  profitTarget: 3000,
  simulationDays: 20,
  tradesPerDay: 5,
  positionSizeMultiplier: 1.0,
  runs: 1000,
};

export function suggestTradesPerDay(daily, fallback = 5) {
  if (!daily || !daily.length) return fallback;
  const totalDays = daily.length;
  const totalTrades = daily.reduce((a, b) => a + (b.count || 0), 0);
  if (!totalTrades) return fallback;
  return Math.max(1, Math.round(totalTrades / totalDays));
}

export function runSimulation(trades, inputs) {
  const cfg = { ...DEFAULT_SIM_INPUTS, ...inputs };
  const pnls = trades.map((t) => t.netPnl);
  if (pnls.length === 0) {
    return {
      runs: 0, pTarget: 0, pMddViolation: 0, pDailyViolation: 0,
      medianEnd: 0, p10End: 0, p90End: 0, endPnls: [], avgEnd: 0,
      survived: 0, cfg,
    };
  }

  const ends = [];
  let pTargetCount = 0;
  let pMddCount = 0;
  let pDailyCount = 0;
  let survivedCount = 0;

  for (let r = 0; r < cfg.runs; r++) {
    let equity = cfg.accountSize;
    let peak = cfg.accountSize;
    let violatedMdd = false;
    let violatedDaily = false;
    let hitTarget = false;

    for (let d = 0; d < cfg.simulationDays; d++) {
      let dayPnl = 0;
      for (let t = 0; t < cfg.tradesPerDay; t++) {
        const p = sampleTrade(trades) * cfg.positionSizeMultiplier;
        dayPnl += p;
      }
      equity += dayPnl;
      if (equity > peak) peak = equity;

      if (dayPnl <= -cfg.dailyLossLimit) violatedDaily = true;
      if (peak - equity >= cfg.maxDrawdown) violatedMdd = true;
      if (equity - cfg.accountSize >= cfg.profitTarget) hitTarget = true;

      if (violatedMdd || violatedDaily) break;
    }

    ends.push(equity - cfg.accountSize);
    if (hitTarget && !violatedMdd && !violatedDaily) pTargetCount += 1;
    if (violatedMdd) pMddCount += 1;
    if (violatedDaily) pDailyCount += 1;
    if (!violatedMdd && !violatedDaily) survivedCount += 1;
  }

  ends.sort((a, b) => a - b);

  return {
    runs: cfg.runs,
    pTarget: pTargetCount / cfg.runs,
    pMddViolation: pMddCount / cfg.runs,
    pDailyViolation: pDailyCount / cfg.runs,
    medianEnd: percentile(ends, 0.5),
    p10End: percentile(ends, 0.1),
    p90End: percentile(ends, 0.9),
    avgEnd: ends.reduce((a, b) => a + b, 0) / ends.length,
    survived: survivedCount / cfg.runs,
    endPnls: ends,
    cfg,
  };
}
