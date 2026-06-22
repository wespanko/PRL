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

export const fmtCents = (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}¢`;
};

export const fmtCompact = (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

export const daysUntil = (date) => {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return ms / 86_400_000;
};

export const fmtDaysUntil = (date) => {
  const d = daysUntil(date);
  if (d === null || !Number.isFinite(d)) return "—";
  if (d < 0) return "RESOLVED";
  if (d < 1) return `${Math.round(d * 24)}h`;
  if (d < 60) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
};

export const tone = (n, { positiveAbove = 0 } = {}) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "text-zinc-400";
  if (n > positiveAbove) return "text-emerald-400";
  if (n < positiveAbove) return "text-rose-400";
  return "text-zinc-300";
};
