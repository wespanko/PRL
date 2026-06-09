import Papa from "papaparse";

const ALIASES = {
  date: [
    "date", "datetime", "time", "timestamp",
    "opened", "openedat", "openedtime", "opentime",
    "closed", "closedat", "closedtime", "closetime",
    "entrytime", "exittime", "filltime",
  ],
  symbol: ["symbol", "instrument", "ticker", "contract", "market", "asset", "pair"],
  side: ["side", "direction", "type", "action", "longshort", "ls", "buysell", "position"],
  quantity: ["quantity", "qty", "contracts", "size", "lots", "shares", "units", "volume"],
  entry: ["entry", "entryprice", "open", "openprice", "buyprice", "fillprice", "avgentry"],
  exit: ["exit", "exitprice", "close", "closeprice", "sellprice", "avgexit"],
  grossPnl: ["grosspnl", "grossprofit", "grosspl"],
  netPnl: [
    "netpnl", "netprofit", "netpl",
    "pnl", "profit", "pl", "realizedpnl", "realizedpl",
    "profitloss", "result",
  ],
  fees: ["commission", "commissions", "fee", "fees", "cost", "costs", "totalfees"],
  duration: ["duration", "timeinerade", "timeintrade", "holdtime", "holdingtime"],
  account: ["account", "accountname", "accountid", "broker"],
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function buildColumnMap(headers) {
  const map = {};
  for (const h of headers) {
    const key = norm(h);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (map[field]) continue;
      if (aliases.includes(key)) {
        map[field] = h;
        break;
      }
    }
  }
  return map;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  const negParen = s.startsWith("(") && s.endsWith(")");
  if (negParen) s = "-" + s.slice(1, -1);
  s = s.replace(/[$,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d2 = new Date(yy, Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  return null;
}

function normalizeSide(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (["long", "buy", "b", "l", "+1", "1"].includes(s)) return "long";
  if (["short", "sell", "s", "-1"].includes(s)) return "short";
  if (s.includes("long") || s.includes("buy")) return "long";
  if (s.includes("short") || s.includes("sell")) return "short";
  return null;
}

function rowToTrade(row, colMap) {
  const get = (field) => (colMap[field] ? row[colMap[field]] : undefined);

  const date = toDate(get("date"));
  const symbol = (get("symbol") ?? "").toString().trim() || null;
  const side = normalizeSide(get("side"));
  const quantity = toNumber(get("quantity")) ?? 1;
  const entry = toNumber(get("entry"));
  const exit = toNumber(get("exit"));
  const grossPnl = toNumber(get("grossPnl"));
  const explicitNet = toNumber(get("netPnl"));
  const fees = toNumber(get("fees")) ?? 0;
  const duration = toNumber(get("duration"));
  const account = (get("account") ?? "").toString().trim() || null;

  let netPnl = explicitNet;
  let pnlEstimated = false;

  if (netPnl === null && grossPnl !== null) {
    netPnl = grossPnl - Math.abs(fees);
  }
  if (netPnl === null && entry !== null && exit !== null && side) {
    const dir = side === "long" ? 1 : -1;
    netPnl = (exit - entry) * dir * Math.abs(quantity) - Math.abs(fees);
    pnlEstimated = true;
  }
  if (netPnl === null) return null;

  return {
    date,
    symbol,
    side,
    quantity: Math.abs(quantity),
    entry,
    exit,
    grossPnl,
    netPnl,
    fees,
    duration,
    account,
    pnlEstimated,
  };
}

export function parseCsv(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const errors = (result.errors || []).filter((e) => e.code !== "TooFewFields");
  const headers = result.meta.fields || [];
  const colMap = buildColumnMap(headers);

  const required = ["netPnl", "grossPnl", "entry", "exit"];
  const hasAnyPnlSource = required.some((k) => colMap[k]);
  if (!hasAnyPnlSource) {
    return {
      trades: [],
      colMap,
      headers,
      errors,
      fatal: "Could not find a P&L column or entry/exit prices in the file.",
    };
  }

  const trades = [];
  let skipped = 0;
  for (const row of result.data) {
    const t = rowToTrade(row, colMap);
    if (t) trades.push(t);
    else skipped += 1;
  }

  const datedCount = trades.filter((t) => t.date).length;
  if (datedCount > 0) {
    trades.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    });
  }

  return {
    trades,
    colMap,
    headers,
    errors,
    skipped,
    fatal: null,
    hasTimestamps: trades.some((t) => t.date && (t.date.getHours() !== 0 || t.date.getMinutes() !== 0)),
    hasDates: datedCount > 0,
    anyEstimated: trades.some((t) => t.pnlEstimated),
  };
}

export function tradesFromObjects(rows) {
  if (!rows || !rows.length) return { trades: [], hasDates: false, hasTimestamps: false };
  const headers = Object.keys(rows[0]);
  const colMap = buildColumnMap(headers);
  const trades = rows.map((r) => rowToTrade(r, colMap)).filter(Boolean);
  return {
    trades,
    colMap,
    headers,
    hasDates: trades.some((t) => t.date),
    hasTimestamps: trades.some((t) => t.date && (t.date.getHours() !== 0 || t.date.getMinutes() !== 0)),
    anyEstimated: trades.some((t) => t.pnlEstimated),
  };
}
