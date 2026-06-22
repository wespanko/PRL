// Calibration analytics for a list of resolved bets.
// Each bet: { forecast: 0..1, outcome: 0 or 1, label?: string, date?: Date }
// forecast = the probability YOU assigned to YES
// outcome = 1 if YES resolved, 0 if NO resolved

const BUCKETS = [
  [0.0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.3, 0.4], [0.4, 0.5],
  [0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0001],
];

export function brierScore(bets) {
  if (!bets.length) return null;
  return bets.reduce((a, b) => a + (b.forecast - b.outcome) ** 2, 0) / bets.length;
}

export function logLoss(bets) {
  if (!bets.length) return null;
  const eps = 1e-9;
  return -bets.reduce((a, b) => {
    const f = Math.max(eps, Math.min(1 - eps, b.forecast));
    return a + (b.outcome * Math.log(f) + (1 - b.outcome) * Math.log(1 - f));
  }, 0) / bets.length;
}

// Calibration in expectation (ECE): weighted mean absolute gap between
// forecast and realized rate, across confidence buckets.
export function expectedCalibrationError(bets) {
  if (!bets.length) return null;
  let ece = 0;
  let total = 0;
  for (const [lo, hi] of BUCKETS) {
    const inBucket = bets.filter((b) => b.forecast >= lo && b.forecast < hi);
    if (!inBucket.length) continue;
    const avgF = mean(inBucket.map((b) => b.forecast));
    const realized = mean(inBucket.map((b) => b.outcome));
    ece += inBucket.length * Math.abs(avgF - realized);
    total += inBucket.length;
  }
  return total ? ece / total : 0;
}

export function calibrationBuckets(bets) {
  return BUCKETS.map(([lo, hi]) => {
    const inBucket = bets.filter((b) => b.forecast >= lo && b.forecast < hi);
    return {
      bucket: `${Math.round(lo * 100)}-${Math.round(hi * 100)}%`,
      midpoint: (lo + hi) / 2,
      count: inBucket.length,
      avgForecast: inBucket.length ? mean(inBucket.map((b) => b.forecast)) : null,
      realized: inBucket.length ? mean(inBucket.map((b) => b.outcome)) : null,
    };
  });
}

export function accuracy(bets) {
  if (!bets.length) return null;
  return bets.filter((b) => (b.forecast >= 0.5 ? 1 : 0) === b.outcome).length / bets.length;
}

// Edge added over flat 50/50 — if you ALWAYS bet 0.5, Brier = 0.25.
// If your Brier < 0.25, you're better than coin flip.
export function brierSkill(bets) {
  const bs = brierScore(bets);
  if (bs === null) return null;
  return 1 - bs / 0.25; // skill score: 1 = perfect, 0 = coin flip, negative = worse
}

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
