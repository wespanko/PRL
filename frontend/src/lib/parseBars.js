import Papa from "papaparse";

const ALIASES = {
  date: ["date", "datetime", "time", "timestamp", "tradedate"],
  open: ["open", "openprice", "o"],
  high: ["high", "h"],
  low: ["low", "l"],
  close: ["close", "closeprice", "c", "adjclose", "adjustedclose"],
  volume: ["volume", "vol", "v"],
  symbol: ["symbol", "ticker", "instrument"],
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function buildMap(headers) {
  const map = {};
  for (const h of headers) {
    const k = norm(h);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (map[field]) continue;
      if (aliases.includes(k)) {
        map[field] = h;
        break;
      }
    }
  }
  return map;
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseBarCsv(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields || [];
  const map = buildMap(headers);
  if (!map.date || !map.close) {
    return { bars: [], error: "Could not find date and close columns in the CSV." };
  }

  const bars = [];
  let symbol = null;
  for (const row of result.data) {
    const date = toDate(row[map.date]);
    const close = toNum(row[map.close]);
    if (!date || close === null) continue;
    const open = toNum(row[map.open]) ?? close;
    const high = toNum(row[map.high]) ?? Math.max(open, close);
    const low = toNum(row[map.low]) ?? Math.min(open, close);
    const volume = toNum(row[map.volume]) ?? 0;
    if (!symbol && map.symbol && row[map.symbol]) symbol = String(row[map.symbol]).trim();
    bars.push({ date, open, high, low, close, volume });
  }
  bars.sort((a, b) => a.date - b.date);
  return { bars, symbol, error: null };
}
