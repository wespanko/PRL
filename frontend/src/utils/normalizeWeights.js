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
