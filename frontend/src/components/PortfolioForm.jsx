import { useState, useEffect, useMemo } from "react";
import { Plus, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { normalizeWeights, balancedPercents } from "../utils/normalizeWeights";
import { useTickerPrices } from "../utils/useTickerPrices";

const DEFAULT_TOTAL_VALUE = 100000;
const emptyRow = () => ({ ticker: "", value: "" });

function fmtMoney(n) {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return "$" + Math.round(n).toLocaleString("en-US");
}

const MODE_LABELS = {
  percent: "Weight (%)",
  dollars: "Amount ($)",
  shares:  "Shares",
};
const MODE_PLACEHOLDERS = {
  percent: "e.g. 40",
  dollars: "e.g. 5000",
  shares:  "e.g. 10",
};

const MODES = [
  { id: "percent", label: "Percent" },
  { id: "dollars", label: "Dollars" },
  { id: "shares",  label: "Shares"  },
];

// ── shared input class ──────────────────────────────────────────────
const INPUT = "w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";
const INPUT_INVALID = "border-rose-300 focus:border-rose-500 focus:ring-rose-100";

export default function PortfolioForm({ onSubmit, loading, initialHoldings, onInitialConsumed }) {
  const [mode, setMode] = useState("percent");
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2025-01-01");
  const [benchmark, setBenchmark] = useState("SPY");
  const [riskFreeRate, setRiskFreeRate] = useState("4.5");
  const [formError, setFormError] = useState(null);

  const tickersForPrices = useMemo(
    () => rows.map((r) => r.ticker).filter((t) => t && t.trim()),
    [rows],
  );
  const { prices, loading: priceLoading, missing: priceMissing, asof: priceAsof } =
    useTickerPrices(tickersForPrices, { enabled: mode === "shares" });

  useEffect(() => {
    if (initialHoldings && initialHoldings.length > 0) {
      const pcts = balancedPercents(initialHoldings.map((h) => h.weight), 100, 1);
      setRows(initialHoldings.map((h, i) => ({ ticker: h.ticker, value: pcts[i] })));
      setMode("percent");
      onInitialConsumed?.();
    }
  }, [initialHoldings]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRow = (i, field, value) => {
    setFormError(null);
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const filledRows = rows.filter((r) => r.ticker.trim() && r.value !== "");
  const partialRows = rows.filter((r) => (r.ticker.trim() !== "") !== (r.value !== ""));

  function rowDollarValue(r) {
    if (mode === "dollars") return parseFloat(r.value) || 0;
    if (mode === "shares") {
      const tk = r.ticker.trim().toUpperCase();
      const px = prices[tk];
      const sh = parseFloat(r.value) || 0;
      return px && sh > 0 ? px * sh : 0;
    }
    return 0;
  }

  const numericTotal = filledRows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
  const dollarsTotal = filledRows.reduce((s, r) => s + rowDollarValue(r), 0);

  const sumOk = (() => {
    if (mode === "percent") return filledRows.length > 0 && Math.abs(numericTotal - 100) < 0.1;
    if (mode === "dollars") return filledRows.length > 0 && numericTotal > 0;
    if (mode === "shares") {
      const allPriced = filledRows.every((r) => prices[r.ticker.trim().toUpperCase()] != null);
      return filledRows.length > 0 && dollarsTotal > 0 && allPriced;
    }
    return false;
  })();

  const dateError = startDate && endDate && startDate >= endDate;
  const canSubmit = !loading && sumOk && !dateError;

  function rowToDollars(r, fromMode, totalForPercent) {
    if (!r.value) return null;
    const v = parseFloat(r.value);
    if (!Number.isFinite(v)) return null;
    if (fromMode === "percent") return (v / 100) * totalForPercent;
    if (fromMode === "dollars") return v;
    if (fromMode === "shares") {
      const px = prices[r.ticker.trim().toUpperCase()];
      return px ? v * px : null;
    }
    return null;
  }

  function handleModeSwitch(newMode) {
    if (newMode === mode) return;
    let totalDollars = 0;
    if (mode === "percent") totalDollars = DEFAULT_TOTAL_VALUE;
    else if (mode === "dollars") {
      totalDollars = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
      if (totalDollars <= 0) totalDollars = DEFAULT_TOTAL_VALUE;
    } else {
      totalDollars = rows.reduce((s, r) => {
        const v = rowToDollars(r, "shares", null);
        return v != null ? s + v : s;
      }, 0);
      if (totalDollars <= 0) totalDollars = DEFAULT_TOTAL_VALUE;
    }

    const dollarsByRow = rows.map((r) => rowToDollars(r, mode, totalDollars));
    let percentStrings = [];
    if (newMode === "percent") {
      percentStrings = balancedPercents(dollarsByRow.map((d) => d ?? 0), 100, 1);
    }

    setRows(rows.map((r, i) => {
      const dollars = dollarsByRow[i];
      if (newMode === "percent") {
        return { ...r, value: dollars == null ? "" : percentStrings[i] };
      }
      if (newMode === "dollars") {
        return { ...r, value: dollars == null ? "" : Math.round(dollars).toString() };
      }
      const px = prices[r.ticker.trim().toUpperCase()];
      if (dollars == null || !px) return { ...r, value: "" };
      const shares = dollars / px;
      return { ...r, value: shares >= 1 ? Math.round(shares).toString() : shares.toFixed(2) };
    }));
    setMode(newMode);
    setFormError(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    if (partialRows.length > 0) {
      setFormError(`${partialRows.length} row${partialRows.length > 1 ? "s have" : " has"} a ticker but no ${MODE_LABELS[mode].toLowerCase()}, or vice versa.`);
      return;
    }
    setFormError(null);

    let rawHoldings, totalValue = null;
    if (mode === "percent") {
      rawHoldings = filledRows.map((r) => ({ ticker: r.ticker.trim().toUpperCase(), weight: parseFloat(r.value) / 100 }));
    } else if (mode === "dollars") {
      totalValue = numericTotal;
      rawHoldings = filledRows.map((r) => ({ ticker: r.ticker.trim().toUpperCase(), weight: parseFloat(r.value) / numericTotal }));
    } else {
      totalValue = dollarsTotal;
      rawHoldings = filledRows.map((r) => {
        const tk = r.ticker.trim().toUpperCase();
        const px = prices[tk] || 0;
        const sh = parseFloat(r.value) || 0;
        return { ticker: tk, weight: (px * sh) / dollarsTotal };
      });
    }

    onSubmit({
      holdings: normalizeWeights(rawHoldings),
      start_date: startDate,
      end_date: endDate,
      benchmark: benchmark.trim().toUpperCase() || "SPY",
      risk_free_rate: parseFloat(riskFreeRate) / 100,
      ...(totalValue != null ? { total_value: totalValue } : {}),
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 mb-6">
      <form onSubmit={handleSubmit}>
        {/* Title + mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <Sparkles className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Portfolio</h2>
          </div>
          <div className="flex bg-slate-100 rounded-full p-1 gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeSwitch(m.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors
                  ${mode === m.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holdings rows */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex-1">Ticker</span>
            <span className="w-32">{MODE_LABELS[mode]}</span>
            <span className="w-40 hidden md:block">{mode === "percent" ? "" : "Computed"}</span>
            <span className="w-8" />
          </div>

          {rows.map((row, i) => {
            const isPartial = (row.ticker.trim() !== "") !== (row.value !== "");
            const tk = row.ticker.trim().toUpperCase();
            const isLoadingPx = mode === "shares" && tk && priceLoading.has(tk);
            const isMissingPx = mode === "shares" && tk && priceMissing.has(tk);
            const px = mode === "shares" && tk ? prices[tk] : null;
            const dollars = rowDollarValue(row);
            const totalForPct = mode === "shares" ? dollarsTotal : numericTotal;
            const computedPct = totalForPct > 0 && row.value !== ""
              ? ((mode === "shares" ? dollars : parseFloat(row.value) || 0) / totalForPct) * 100
              : null;

            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="AAPL"
                  value={row.ticker}
                  onChange={(e) => setRow(i, "ticker", e.target.value)}
                  className={`flex-1 uppercase font-mono font-semibold ${INPUT} ${isPartial && !row.ticker.trim() ? INPUT_INVALID : ""}`}
                />
                <input
                  type="number"
                  placeholder={MODE_PLACEHOLDERS[mode]}
                  min="0"
                  step="any"
                  value={row.value}
                  onChange={(e) => setRow(i, "value", e.target.value)}
                  className={`w-32 font-mono tabular-nums ${INPUT} ${isPartial && row.value === "" ? INPUT_INVALID : ""}`}
                />
                <div className="w-40 text-xs text-slate-500 hidden md:flex flex-col font-mono tabular-nums leading-tight">
                  {mode === "shares" && tk && (
                    <>
                      {isLoadingPx && <span className="text-slate-400">Fetching…</span>}
                      {!isLoadingPx && isMissingPx && <span className="text-rose-600">No price</span>}
                      {!isLoadingPx && px != null && (
                        <>
                          <span className="text-slate-400">{fmtMoney(px)} × {row.value || 0}</span>
                          <span className="text-slate-700 font-semibold">= {fmtMoney(dollars)}{computedPct != null ? ` · ${computedPct.toFixed(1)}%` : ""}</span>
                        </>
                      )}
                    </>
                  )}
                  {mode === "dollars" && computedPct != null && (
                    <span className="text-slate-700 font-semibold">{computedPct.toFixed(1)}%</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (rows.length <= 1) return;
                    setFormError(null);
                    setRows(rows.filter((_, idx) => idx !== i));
                  }}
                  disabled={rows.length <= 1}
                  title="Remove row"
                  className="flex h-10 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setRows([...rows, emptyRow()])}
          className="w-full flex items-center justify-center gap-1.5 mb-5 py-3 rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add row
        </button>

        {/* Weight / value indicator */}
        {filledRows.length > 0 && (
          <div className={`rounded-2xl px-5 py-3 mb-5 flex items-center justify-between gap-3 text-sm font-semibold
            ${sumOk ? "bg-blue-50 text-blue-900 border border-blue-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
            <div className="flex items-center gap-2">
              {sumOk && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" strokeWidth={2.5} />}
              <span>
                {mode === "percent" && <>Weights total <span className="font-mono tabular-nums">{numericTotal.toFixed(1)}%</span>{!sumOk && " — must equal 100%"}</>}
                {mode === "dollars" && <>Portfolio value <span className="font-mono tabular-nums">{fmtMoney(numericTotal)}</span>{!sumOk && " — enter at least one positive amount"}</>}
                {mode === "shares" && (
                  <>Portfolio value <span className="font-mono tabular-nums">{fmtMoney(dollarsTotal)}</span>
                    {priceAsof && <span className="font-normal text-xs ml-2 opacity-70">as of {priceAsof}</span>}
                    {!sumOk && priceLoading.size > 0 && " — loading prices…"}
                    {!sumOk && priceLoading.size === 0 && priceMissing.size > 0 && ` — could not price: ${[...priceMissing].join(", ")}`}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {formError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 mb-5 text-sm font-medium text-rose-900">
            {formError}
          </div>
        )}

        {/* Settings grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setFormError(null); setStartDate(e.target.value); }}
              className={`${INPUT} ${dateError ? INPUT_INVALID : ""}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setFormError(null); setEndDate(e.target.value); }}
              className={`${INPUT} ${dateError ? INPUT_INVALID : ""}`}
            />
            {dateError && <p className="mt-1 text-[11px] font-medium text-rose-600">End date must be after start date</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Benchmark</label>
            <input
              type="text"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className={`uppercase font-mono font-semibold ${INPUT}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Risk-free rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(e.target.value)}
              className={`font-mono tabular-nums ${INPUT}`}
            />
          </div>
        </div>

        {/* Big green CTA */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-base py-4 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-blue-200 disabled:shadow-none"
        >
          {loading ? (
            <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />Analyzing…</>
          ) : (
            "Analyze portfolio"
          )}
        </button>
      </form>
    </div>
  );
}
