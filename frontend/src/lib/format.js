export const fmtMoney = (n, { sign = false, decimals = 2 } = {}) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const s = (sign && n > 0 ? "+" : "") +
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  return s;
};

export const fmtPct = (n, { decimals = 1 } = {}) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
};

export const fmtNum = (n, { decimals = 2 } = {}) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
};

export const fmtInt = (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
};

export const tone = (n, { positiveAbove = 0 } = {}) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "text-zinc-400";
  if (n > positiveAbove) return "text-emerald-400";
  if (n < positiveAbove) return "text-rose-400";
  return "text-zinc-300";
};
