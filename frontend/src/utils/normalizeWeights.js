/**
 * Distribute rounding error across an array of percentages so they sum to
 * exactly `target` (default 100.0), absorbing the drift into the largest entry.
 * Returns a new array of strings already formatted to `decimals` places.
 */
export function balancedPercents(weights, target = 100, decimals = 1) {
  if (!weights || weights.length === 0) return [];
  const factor = Math.pow(10, decimals);
  const totalRaw = weights.reduce((s, w) => s + w, 0);
  const normalized = weights.map((w) => (totalRaw > 0 ? (w / totalRaw) * target : 0));
  const rounded = normalized.map((v) => Math.round(v * factor) / factor);
  const sum = rounded.reduce((s, v) => s + v, 0);
  const drift = +(target - sum).toFixed(decimals + 2);
  if (Math.abs(drift) > 1 / (factor * 10)) {
    const maxIdx = rounded.reduce(
      (best, v, i) => (v > rounded[best] ? i : best),
      0,
    );
    rounded[maxIdx] = +(rounded[maxIdx] + drift).toFixed(decimals);
  }
  return rounded.map((v) => v.toFixed(decimals));
}

/**
 * Normalize an array of {ticker, weight} so the weights sum to exactly 1.0,
 * absorbing any floating-point or rounding drift into the largest position.
 * Drops zero-weight rows.
 */
export function normalizeWeights(holdings) {
  const filtered = holdings.filter((h) => h.weight > 0);
  if (filtered.length === 0) return filtered;

  const total = filtered.reduce((s, h) => s + h.weight, 0);
  if (total <= 0) return filtered;

  const scaled = filtered.map((h) => ({ ticker: h.ticker, weight: h.weight / total }));

  // Force exact sum to 1.0 — push leftover into the largest position.
  const sum = scaled.reduce((s, h) => s + h.weight, 0);
  const drift = 1.0 - sum;
  if (Math.abs(drift) > 1e-12) {
    const maxIdx = scaled.reduce(
      (best, h, i) => (h.weight > scaled[best].weight ? i : best),
      0,
    );
    scaled[maxIdx] = { ...scaled[maxIdx], weight: scaled[maxIdx].weight + drift };
  }
  return scaled;
}
