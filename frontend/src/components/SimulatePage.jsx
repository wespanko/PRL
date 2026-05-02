import { useState, useEffect } from "react";
import { analyzePortfolio } from "../api/client";
import { pct, num } from "../utils/formatters";
import { useAnimatedNumber } from "../utils/useAnimatedNumber";
import { normalizeWeights } from "../utils/normalizeWeights";
import ResultsPanel from "./ResultsPanel";
import InfoTip from "./InfoTip";

const COMPARE_METRICS = [
  { key: "sharpe_ratio",          metric: "sharpe_ratio",          label: "Sharpe Ratio",        fmt: (v) => num(v, 2), direction: "higher_better" },
  { key: "annualized_volatility", metric: "annualized_volatility", label: "Volatility",          fmt: (v) => pct(v),    direction: "lower_better" },
  { key: "max_drawdown",          metric: "max_drawdown",          label: "Max Drawdown",        fmt: (v) => pct(v),    direction: "lower_better" },
  { key: "beta",                  metric: "beta",                  label: "Beta",                fmt: (v) => num(v, 2), direction: "neutral" },
  { key: "var_95",                metric: "var_95",                label: "VaR 95% (Monthly)",   fmt: (v) => pct(v),    direction: "lower_better" },
  { key: "upside_capture",        metric: "upside_capture",        label: "Upside Capture",      fmt: (v) => `${num(v, 2)}×`, direction: "higher_better" },
  { key: "downside_capture",      metric: "downside_capture",      label: "Downside Capture",    fmt: (v) => `${num(v, 2)}×`, direction: "lower_better" },
  { key: "risk_score",            metric: "risk_score",            label: "Risk Score",          fmt: (v) => `${num(v, 1)}/10`, direction: "lower_better" },
];

function deltaColor(delta, direction) {
  if (direction === "neutral") return "#6b7280";
  const better = direction === "higher_better" ? delta > 0 : delta < 0;
  if (Math.abs(delta) < 0.001) return "#6b7280";
  return better ? "#16a34a" : "#dc2626";
}

function AnimatedCell({ value, fmt, style }) {
  const animated = useAnimatedNumber(value, 700);
  return <td style={style}>{fmt(animated)}</td>;
}

function enpDelta(curr, sim) {
  const c = curr?.concentration?.enp_risk, s = sim?.concentration?.enp_risk;
  if (!c || !s) return null;
  return { curr: c, sim: s, delta: s - c };
}

export default function SimulatePage({ lastPayload, lastResults, simulateOverride, onOverrideConsumed, onSimulateComplete, onLearnMore }) {
  const [rows, setRows] = useState([]);
  const [simResults, setSimResults] = useState(null);
  const [simPayload, setSimPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (lastPayload?.holdings) {
      setRows(lastPayload.holdings.map((h) => ({
        ticker: h.ticker,
        weight: (h.weight * 100).toFixed(1),
      })));
      setSimResults(null);
      setShowFull(false);
    }
  }, [lastPayload]);

  useEffect(() => {
    if (simulateOverride && simulateOverride.length > 0) {
      setRows(simulateOverride.map((h) => ({
        ticker: h.ticker,
        weight: (h.weight * 100).toFixed(1),
      })));
      setSimResults(null);
      setShowFull(false);
      onOverrideConsumed?.();
    }
  }, [simulateOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lastPayload || !lastResults) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">Run an analysis first</div>
          <div className="empty-state-body">
            Go to Analyze, enter your holdings, and run it. Then come back here to simulate changes.
          </div>
        </div>
      </div>
    );
  }

  const weightSum = rows.reduce((s, r) => s + parseFloat(r.weight || 0), 0);
  const sumOk = rows.length > 0 && Math.abs(weightSum - 100) < 0.1;
  const canRun = !loading && sumOk && rows.some((r) => r.ticker.trim());

  function setRow(i, field, val) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    setError(null);
  }

  async function handleSimulate() {
    setLoading(true);
    setError(null);
    setSimResults(null);
    setShowFull(false);
    try {
      const rawHoldings = rows
        .filter((r) => r.ticker.trim())
        .map((r) => ({ ticker: r.ticker.trim().toUpperCase(), weight: parseFloat(r.weight) / 100 }));
      const payload = {
        ...lastPayload,
        holdings: normalizeWeights(rawHoldings),
      };
      const data = await analyzePortfolio(payload);
      setSimResults(data);
      setSimPayload(payload);
      onSimulateComplete?.(payload, data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetToOriginal() {
    setRows(lastPayload.holdings.map((h) => ({ ticker: h.ticker, weight: (h.weight * 100).toFixed(1) })));
    setSimResults(null);
    setShowFull(false);
  }

  const enp = enpDelta(lastResults, simResults);

  return (
    <div className="container">
      <div className="simulate-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Simulate</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Adjust weights or swap tickers to see how your risk profile changes.
            Same date range as your last analysis ({lastPayload.start_date} → {lastPayload.end_date}).
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={resetToOriginal}>Reset to original</button>
      </div>

      <div className="card">
        <h2>Proposed Portfolio</h2>
        <table className="holdings-table">
          <thead>
            <tr>
              <th style={{ width: "55%" }}>Ticker</th>
              <th style={{ width: "35%" }}>Weight (%)</th>
              <th style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={row.ticker}
                    onChange={(e) => setRow(i, "ticker", e.target.value)}
                    style={{ textTransform: "uppercase" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.weight}
                    min="0" max="100" step="any"
                    onChange={(e) => setRow(i, "weight", e.target.value)}
                  />
                </td>
                <td>
                  {rows.length > 1 && (
                    <button className="remove-btn" type="button"
                      onClick={() => { setRows(rows.filter((_, idx) => idx !== i)); setError(null); }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="add-row-btn" type="button" onClick={() => setRows([...rows, { ticker: "", weight: "" }])}>
          + Add row
        </button>

        <p className={`weight-sum ${sumOk ? "ok" : "bad"}`}>
          Weights total: {weightSum.toFixed(1)}%{sumOk ? " ✓" : " — must equal 100%"}
        </p>

        {error && <div className="error">{error}</div>}

        <button className="btn btn-primary" onClick={handleSimulate} disabled={!canRun}>
          {loading ? <><span className="spinner" /> Simulating…</> : "Run Simulation"}
        </button>
      </div>

      {simResults && (
        <>
          <div className="card simulate-comparison">
            <h2>Before vs. After</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th style={{ textAlign: "right" }}>Current</th>
                  <th style={{ textAlign: "right" }}>Proposed</th>
                  <th style={{ textAlign: "right" }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map(({ key, metric, label, fmt, direction }) => {
                  const curr = lastResults[key], sim = simResults[key];
                  const delta = sim - curr;
                  const color = deltaColor(delta, direction);
                  return (
                    <tr key={key}>
                      <td style={{ color: "#374151" }}>
                        {label}
                        <InfoTip metric={metric} onLearnMore={onLearnMore} side="bottom" />
                      </td>
                      <td style={{ textAlign: "right", color: "#9ca3af" }}>{fmt(curr)}</td>
                      <AnimatedCell value={sim} fmt={fmt} style={{ textAlign: "right", fontWeight: 600 }} />
                      <AnimatedCell value={delta} fmt={(v) => `${v > 0 ? "+" : ""}${fmt(v)}`} style={{ textAlign: "right", fontWeight: 700, color }} />
                    </tr>
                  );
                })}
                {enp && (
                  <tr>
                    <td style={{ color: "#374151" }}>
                      Real Diversification
                      <InfoTip metric="enp_risk" onLearnMore={onLearnMore} side="bottom" />
                    </td>
                    <td style={{ textAlign: "right", color: "#9ca3af" }}>{enp.curr.toFixed(1)} pos</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{enp.sim.toFixed(1)} pos</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: deltaColor(enp.delta, "higher_better") }}>
                      {enp.delta > 0 ? "+" : ""}{enp.delta.toFixed(1)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button className="btn btn-secondary" onClick={() => setShowFull(!showFull)}>
              {showFull ? "Hide full analysis" : "Show full proposed analysis ↓"}
            </button>
          </div>

          {showFull && <ResultsPanel results={simResults} payload={simPayload} />}
        </>
      )}
    </div>
  );
}
