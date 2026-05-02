import { useState, useEffect } from "react";
import { normalizeWeights } from "../utils/normalizeWeights";

const emptyRow = () => ({ ticker: "", weight: "" });

export default function PortfolioForm({ onSubmit, loading, initialHoldings, onInitialConsumed }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    if (initialHoldings && initialHoldings.length > 0) {
      setRows(initialHoldings.map((h) => ({
        ticker: h.ticker,
        weight: (h.weight * 100).toFixed(1),
      })));
      onInitialConsumed?.();
    }
  }, [initialHoldings]); // eslint-disable-line react-hooks/exhaustive-deps
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2025-01-01");
  const [benchmark, setBenchmark] = useState("SPY");
  const [riskFreeRate, setRiskFreeRate] = useState("4.5");
  const [formError, setFormError] = useState(null);

  const setRow = (i, field, value) => {
    setFormError(null);
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const filledRows = rows.filter((r) => r.ticker.trim() && r.weight !== "");
  const partialRows = rows.filter((r) => {
    const hasTicker = r.ticker.trim() !== "";
    const hasWeight = r.weight !== "";
    return hasTicker !== hasWeight;
  });
  const weightSum = filledRows.reduce((s, r) => s + parseFloat(r.weight || 0), 0);
  const sumOk = filledRows.length > 0 && Math.abs(weightSum - 100) < 0.1;
  const dateError = startDate && endDate && startDate >= endDate;
  const canSubmit = !loading && sumOk && !dateError;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    if (partialRows.length > 0) {
      setFormError(
        `${partialRows.length} row${partialRows.length > 1 ? "s have" : " has"} a ticker but no weight, or a weight but no ticker. Fill or remove them before submitting.`
      );
      return;
    }
    setFormError(null);
    const rawHoldings = filledRows.map((r) => ({
      ticker: r.ticker.trim().toUpperCase(),
      weight: parseFloat(r.weight) / 100,
    }));
    onSubmit({
      holdings: normalizeWeights(rawHoldings),
      start_date: startDate,
      end_date: endDate,
      benchmark: benchmark.trim().toUpperCase() || "SPY",
      risk_free_rate: parseFloat(riskFreeRate) / 100,
    });
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <h2>Portfolio</h2>

        <table className="holdings-table">
          <thead>
            <tr>
              <th style={{ width: "55%" }}>Ticker</th>
              <th style={{ width: "35%" }}>Weight (%)</th>
              <th style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isPartial =
                (row.ticker.trim() !== "") !== (row.weight !== "");
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
                      placeholder="e.g. 40"
                      min="0"
                      max="100"
                      step="any"
                      value={row.weight}
                      onChange={(e) => setRow(i, "weight", e.target.value)}
                      className={isPartial && row.weight === "" ? "invalid" : ""}
                    />
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
                      >
                        ×
                      </button>
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
        >
          + Add row
        </button>

        {filledRows.length > 0 && (
          <p className={`weight-sum ${sumOk ? "ok" : "bad"}`}>
            Weights total: {weightSum.toFixed(1)}%
            {sumOk ? " ✓" : " — must equal 100%"}
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
            <>
              <span className="spinner" />
              Analyzing…
            </>
          ) : (
            "Analyze Portfolio"
          )}
        </button>
      </form>
    </div>
  );
}
