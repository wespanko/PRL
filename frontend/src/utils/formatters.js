export const pct = (v, decimals = 1) =>
  v == null ? "—" : `${(v * 100).toFixed(decimals)}%`;

export const num = (v, decimals = 2) =>
  v == null ? "—" : Number(v).toFixed(decimals);

export const sign = (v) => {
  if (v == null) return "neutral";
  if (v > 0.001) return "positive";
  if (v < -0.001) return "negative";
  return "neutral";
};
