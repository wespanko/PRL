import { useState, useEffect, useMemo } from "react";
import { normalizeWeights } from "../utils/normalizeWeights";
import { useTickerPrices } from "../utils/useTickerPrices";

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

export default function PortfolioForm({ onSubmit, loading, initialHoldings, onInitialConsumed }) {
  const [mode, setMode] = useState("percent"); // "percent" | "dollars" | "shares"
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2025-01-01");
  const [benchmark, setBenchmark] = useState("SPY");
  const [riskFreeRate, setRiskFreeRate] = useState("4.5");
  const [formError, setFormError] = useState(null);

  // Tickers that need a current price (only relevant in shares mode)
  const tickersForPrices = useMemo(
    () => rows.map((r) => r.ticker).filter((t) => t && t.trim()),
    [rows],
  );
  const { prices, loading: priceLoading, missing: priceMissing, asof: priceAsof } =
    useTickerPrices(tickersForPrices, { enabled: mode === "shares" });

  useEffect(() => {
    if (initialHoldings && initialHoldings.length > 0) {
      setRows(initialHoldings.map((h) => ({
        ticker: h.ticker,
        value: (h.weight * 100).toFixed(1),
      })));
      setMode("percent");
      onInitialConsumed?.();
    }
  }, [initialHoldings]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRow = (i, field, value) => {
    setFormError(null);
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const filledRows = rows.filter((r) => r.ticker.trim() && r.value !== "");
  const partialRows = rows.filter((r) => {
    const hasTicker = r.ticker.trim() !== "";
    const hasValue = r.value !== "";
    return hasTicker !== hasValue;
  });

  // Per-row dollar value (used in dollars + shares modes)
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

  const numericTotal = filledRows.reduce(
    (s, r) => s + (parseFloat(r.value) || 0),
    0,
  );
  const dollarsTotal = filledRows.reduce((s, r) => s + rowDollarValue(r), 0);

  // Validation rules per mode
  const sumOk = (() => {
    if (mode === "percent") return filledRows.length > 0 && Math.abs(numericTotal - 100) < 0.1;
    if (mode === "dollars") return filledRows.length > 0 && numericTotal > 0;
    if (mode === "shares") {
      // need: every filled row has a known price
      const allPriced = filledRows.every((r) => prices[r.ticker.trim().toUpperCase()] != null);
      return filledRows.length > 0 && dollarsTotal > 0 && allPriced;
    }
    return false;
  })();

  const dateError = startDate && endDate && startDate >= endDate;
  const canSubmit = !loading && sumOk && !dateError;

  function handleModeSwitch(newMode) {
    if (newMode === mode) return;
    // Best-effort conversion so the user doesn't lose their inputs
    if (mode === "percent" && newMode === "dollars") {
      setRows(rows.map((r) => ({
        ...r,
        value: r.value === "" ? "" : ((parseFloat(r.value) / 100) * 100000).toFixed(0),
      })));
    } else if (mode === "dollars" && newMode === "percent") {
      const total = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
      if (total > 0) {
        setRows(rows.map((r) => ({
          ...r,
          value: r.value === "" ? "" : ((parseFloat(r.value) / total) * 100).toFixed(1),
        })));
      }
    }
    // Switching to/from shares — clear the value column since the unit changes
    else if (newMode === "shares" || mode === "shares") {
      setRows(rows.map((r) => ({ ...r, value: "" })));
    }
    setMode(newMode);
    setFormError(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    if (partialRows.length > 0) {
      setFormError(
        `${partialRows.length} row${partialRows.length > 1 ? "s have" : " has"} a ticker but no ${MODE_LABELS[mode].toLowerCase()}, or vice versa.`,
      );
      return;
    }
    setFormError(null);

    let rawHoldings;
    let totalValue = null;

    if (mode === "percent") {
      rawHoldings = filledRows.map((r) => ({
        ticker: r.ticker.trim().toUpperCase(),
        weight: parseFloat(r.value) / 100,
      }));
    } else if (mode === "dollars") {
      totalValue = numericTotal;
      rawHoldings = filledRows.map((r) => ({
        ticker: r.ticker.trim().toUpperCase(),
        weight: parseFloat(r.value) / numericTotal,
      }));
    } else {
      // shares — convert to dollar value first, then to weights
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
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="form-header-row">
          <h2 style={{ marginBottom: 0 }}>Portfolio</h2>
          <div className="seg-control">
            <button
              type="button"
              className={`seg-btn ${mode === "percent" ? "seg-btn--active" : ""}`}
              onClick={() => handleModeSwitch("percent")}
            >Percent</button>
            <button
              type="button"
              className={`seg-btn ${mode === "dollars" ? "seg-btn--active" : ""}`}
              onClick={() => handleModeSwitch("dollars")}
            >Dollars</button>
            <button
              type="button"
              className={`seg-btn ${mode === "shares" ? "seg-btn--active" : ""}`}
              onClick={() => handleModeSwitch("shares")}
            >Shares</button>
          </div>
        </div>

        <table className="holdings-table">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Ticker</th>
              <th style={{ width: "25%" }}>{MODE_LABELS[mode]}</th>
              <th style={{ width: "25%" }}>{mode === "percent" ? "" : "Computed"}</th>
              <th style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isPartial =
                (row.ticker.trim() !== "") !== (row.value !== "");
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
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      placeholder="e.g. AAPL"
                      value={row.ticker}
                      onChange={(e) => setRow(i, "ticker", e.target.value)}
                      style={{ textTransform: "uppercase" }}
                      className={isPartial && !row.ticker.trim() ? "invalid" : ""}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder={MODE_PLACEHOLDERS[mode]}
                      min="0"
                      step="any"
                      value={row.value}
                      onChange={(e) => setRow(i, "value", e.target.value)}
                      className={isPartial && row.value === "" ? "invalid" : ""}
                    />
                  </td>
                  <td className="form-computed-cell">
                    {mode === "shares" && tk && (
                      <>
                        {isLoadingPx && <span className="form-computed-loading">Fetching…</span>}
                        {!isLoadingPx && isMissingPx && (
                          <span className="form-computed-missing">No price</span>
                        )}
                        {!isLoadingPx && px != null && (
                          <>
                            <span className="form-computed-px">{fmtMoney(px)} × {row.value || 0}</span>
                            <span className="form-computed-dollars">= {fmtMoney(dollars)}</span>
                            {computedPct != null && (
                              <span className="form-computed-pct"> · {computedPct.toFixed(1)}%</span>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {mode === "dollars" && computedPct != null && (
                      <span className="form-computed-pct">{computedPct.toFixed(1)}%</span>
                    )}
                  </td>
                  <td>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => {
                          setFormError(null);
                          setRows(rows.filter((_, idx) => idx !== i));
                        }}
                        title="Remove row"
                      >×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          type="button"
          className="add-row-btn"
          onClick={() => setRows([...rows, emptyRow()])}
        >+ Add row</button>

        {filledRows.length > 0 && (
          <p className={`weight-sum ${sumOk ? "ok" : "bad"}`}>
            {mode === "percent" && (
              <>Weights total: {numericTotal.toFixed(1)}%
                {sumOk ? " ✓" : " — must equal 100%"}</>
            )}
            {mode === "dollars" && (
              <>Portfolio value: <strong>{fmtMoney(numericTotal)}</strong>
                {!sumOk && " — enter at least one positive amount"}</>
            )}
            {mode === "shares" && (
              <>
                Portfolio value: <strong>{fmtMoney(dollarsTotal)}</strong>
                {priceAsof && <span className="form-asof"> · prices as of {priceAsof}</span>}
                {!sumOk && priceLoading.size > 0 && " — loading prices…"}
                {!sumOk && priceLoading.size === 0 && priceMissing.size > 0 &&
                  ` — could not price: ${[...priceMissing].join(", ")}`}
              </>
            )}
          </p>
        )}

        {formError && (
          <div className="error" style={{ marginBottom: 14 }}>
            {formError}
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setFormError(null); setStartDate(e.target.value); }}
              className={dateError ? "invalid" : ""}
            />
          </div>
          <div className="form-group">
            <label>End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setFormError(null); setEndDate(e.target.value); }}
              className={dateError ? "invalid" : ""}
            />
            {dateError && (
              <span style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                End date must be after start date
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Benchmark</label>
            <input
              type="text"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
          </div>
          <div className="form-group">
            <label>Risk-free rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSubmit}
        >
          {loading ? (
            <><span className="spinner" />Analyzing…</>
          ) : "Analyze Portfolio"}
        </button>
      </form>
    </div>
  );
}
