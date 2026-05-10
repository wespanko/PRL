// Simulate — DESIGN_BRIEF.md §7
//
// Strict spec: Sandbox table is the centerpiece. --ink-50 panel bg,
// white input cells with --ink-200 borders. Weight-total validator
// pinned bottom-right in mono-lg. "Run Simulation" = THE gold CTA.
//
// Step markers (1/2/3) from the legacy flow are dropped — not in §7.

import { useState, useEffect } from "react";
import { analyzePortfolio } from "../api/client";
import { pct, num } from "../utils/formatters";
import { useAnimatedNumber } from "../utils/useAnimatedNumber";
import { normalizeWeights } from "../utils/normalizeWeights";
import ResultsPanel from "./ResultsPanel";
import InfoTip from "./InfoTip";
import { Button, Card, Banner, Table } from "./ui";

const COMPARE_METRICS = [
  { key: "sharpe_ratio",          metric: "sharpe_ratio",          label: "Sharpe Ratio",      fmt: (v) => num(v, 2),         direction: "higher_better" },
  { key: "annualized_volatility", metric: "annualized_volatility", label: "Volatility",        fmt: (v) => pct(v),            direction: "lower_better"  },
  { key: "max_drawdown",          metric: "max_drawdown",          label: "Max Drawdown",      fmt: (v) => pct(v),            direction: "lower_better"  },
  { key: "beta",                  metric: "beta",                  label: "Beta",              fmt: (v) => num(v, 2),         direction: "neutral"       },
  { key: "var_95",                metric: "var_95",                label: "VaR 95% (Monthly)", fmt: (v) => pct(v),            direction: "lower_better"  },
  { key: "upside_capture",        metric: "upside_capture",        label: "Upside Capture",    fmt: (v) => `${num(v, 2)}×`,   direction: "higher_better" },
  { key: "downside_capture",      metric: "downside_capture",      label: "Downside Capture",  fmt: (v) => `${num(v, 2)}×`,   direction: "lower_better"  },
  { key: "risk_score",            metric: "risk_score",            label: "Risk Score",        fmt: (v) => `${num(v, 1)}/10`, direction: "lower_better"  },
];

// §4: risk colors only in data context. A delta direction (better/worse)
// IS data context. Use --risk-green / --risk-red. Neutral = --ink-500.
function deltaColor(delta, direction) {
  if (direction === "neutral") return "var(--ink-500)";
  if (Math.abs(delta) < 0.001) return "var(--ink-500)";
  const better = direction === "higher_better" ? delta > 0 : delta < 0;
  return better ? "var(--risk-green)" : "var(--risk-red)";
}

function AnimatedCell({ value, fmt, style, className = "pk-num" }) {
  const animated = useAnimatedNumber(value, 700);
  return <td className={className} style={style}>{fmt(animated)}</td>;
}

function enpDelta(curr, sim) {
  const c = curr?.concentration?.enp_risk;
  const s = sim?.concentration?.enp_risk;
  if (!c || !s) return null;
  return { curr: c, sim: s, delta: s - c };
}

export default function SimulatePage({
  lastPayload,
  lastResults,
  simulateOverride,
  onOverrideConsumed,
  onSimulateComplete,
  onLearnMore,
}) {
  const [rows, setRows] = useState([]);
  const [simResults, setSimResults] = useState(null);
  const [simPayload, setSimPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (lastPayload?.holdings) {
      setRows(
        lastPayload.holdings.map((h) => ({
          ticker: h.ticker,
          weight: (h.weight * 100).toFixed(1),
        })),
      );
      setSimResults(null);
      setShowFull(false);
    }
  }, [lastPayload]);

  useEffect(() => {
    if (simulateOverride && simulateOverride.length > 0) {
      setRows(
        simulateOverride.map((h) => ({
          ticker: h.ticker,
          weight: (h.weight * 100).toFixed(1),
        })),
      );
      setSimResults(null);
      setShowFull(false);
      onOverrideConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulateOverride]);

  // Empty state — borrows §7 Monitor empty-state pattern: display-lg
  // headline in --ink-300, body subtext, max 480px centered block.
  if (!lastPayload || !lastResults) {
    return (
      <div className="container">
        <div className="sim-empty">
          <h1 className="pk-text-display-lg pk-ink-300 sim-empty-headline">
            Run an analysis first
          </h1>
          <p className="pk-text-body-lg pk-ink-500 sim-empty-body">
            Go to Analyze, enter your holdings, and run the analysis. Then come
            back here to simulate weight or holding changes against the same
            date range.
          </p>
        </div>
      </div>
    );
  }

  const weightSum = rows.reduce((s, r) => s + parseFloat(r.weight || 0), 0);
  const sumOk = rows.length > 0 && Math.abs(weightSum - 100) < 0.1;
  const canRun = !loading && sumOk && rows.some((r) => r.ticker.trim());

  function setRow(i, field, val) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    setError(null);
  }

  function addRow() {
    setRows([...rows, { ticker: "", weight: "" }]);
  }

  function removeRow(i) {
    setRows(rows.filter((_, idx) => idx !== i));
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
        .map((r) => ({
          ticker: r.ticker.trim().toUpperCase(),
          weight: parseFloat(r.weight) / 100,
        }));
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
    setRows(
      lastPayload.holdings.map((h) => ({
        ticker: h.ticker,
        weight: (h.weight * 100).toFixed(1),
      })),
    );
    setSimResults(null);
    setShowFull(false);
  }

  const enp = enpDelta(lastResults, simResults);

  return (
    <div className="container">
      <header className="sim-header">
        <div>
          <h1 className="pk-text-heading-lg pk-ink-900">Simulate</h1>
          <p className="pk-text-body pk-ink-500 sim-header-sub">
            Adjust weights or swap tickers and see how your risk profile changes.
            Same date range as your last analysis (
            <span className="pk-text-mono pk-ink-700">{lastPayload.start_date} → {lastPayload.end_date}</span>
            ).
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={resetToOriginal}>
          Reset to original
        </Button>
      </header>

      {/* Sandbox — the centerpiece. §7: --ink-50 panel, white input cells
          with --ink-200 borders, weight validator pinned bottom-right. */}
      <section className="sim-sandbox" aria-label="Proposed portfolio">
        <div className="pk-text-caption pk-ink-400 sim-sandbox-eyebrow">
          Proposed portfolio
        </div>
        <table className="sim-table">
          <thead>
            <tr>
              <th className="sim-th">Ticker</th>
              <th className="sim-th sim-th--num">Weight (%)</th>
              <th className="sim-th sim-th--actions" aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="sim-tr">
                <td className="sim-td">
                  <input
                    className="sim-input"
                    type="text"
                    value={row.ticker}
                    onChange={(e) => setRow(i, "ticker", e.target.value)}
                    style={{ textTransform: "uppercase" }}
                    aria-label={`Ticker for row ${i + 1}`}
                  />
                </td>
                <td className="sim-td">
                  <input
                    className="sim-input sim-input--mono"
                    type="number"
                    value={row.weight}
                    min="0"
                    max="100"
                    step="any"
                    onChange={(e) => setRow(i, "weight", e.target.value)}
                    aria-label={`Weight for row ${i + 1}`}
                  />
                </td>
                <td className="sim-td sim-td--actions">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="sim-remove"
                      onClick={() => removeRow(i)}
                      aria-label={`Remove row ${i + 1}`}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="sim-sandbox-foot">
          <button type="button" className="pk-btn pk-btn--tertiary" onClick={addRow}>
            + Add row
          </button>
          <div
            className={`sim-validator pk-text-mono-lg ${sumOk ? "is-ok" : "is-bad"}`}
            role="status"
            aria-live="polite"
          >
            {weightSum.toFixed(1)}% / 100%
            {sumOk ? " ✓" : ""}
          </div>
        </div>
      </section>

      {error && <Banner variant="error">{error}</Banner>}

      <div className="sim-run">
        {/* THE gold CTA per §7 Simulate. */}
        <Button
          variant="gold"
          onClick={handleSimulate}
          disabled={!canRun}
        >
          {loading ? "Simulating…" : "Run Simulation →"}
        </Button>
        <p className="pk-text-body-sm pk-ink-400 sim-run-hint">
          We re-run the full risk analysis with your proposed weights against
          the same date range, then show you exactly how each metric changes.
        </p>
      </div>

      {simResults && (
        <>
          <Card className="sim-compare-card">
            <Card.Eyebrow>Before vs after</Card.Eyebrow>
            <Table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="pk-num">Current</th>
                  <th className="pk-num">Proposed</th>
                  <th className="pk-num">Change</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map(({ key, metric, label, fmt, direction }) => {
                  const curr = lastResults[key];
                  const sim = simResults[key];
                  const delta = sim - curr;
                  const color = deltaColor(delta, direction);
                  return (
                    <tr key={key}>
                      <td>
                        {label}
                        <InfoTip metric={metric} onLearnMore={onLearnMore} side="bottom" />
                      </td>
                      <td className="pk-num pk-ink-400">{fmt(curr)}</td>
                      <AnimatedCell
                        value={sim}
                        fmt={fmt}
                        className="pk-num"
                        style={{ fontWeight: 600 }}
                      />
                      <AnimatedCell
                        value={delta}
                        fmt={(v) => `${v > 0 ? "+" : ""}${fmt(v)}`}
                        className="pk-num"
                        style={{ fontWeight: 600, color }}
                      />
                    </tr>
                  );
                })}
                {enp && (
                  <tr>
                    <td>
                      Real Diversification
                      <InfoTip metric="enp_risk" onLearnMore={onLearnMore} side="bottom" />
                    </td>
                    <td className="pk-num pk-ink-400">{enp.curr.toFixed(1)} pos</td>
                    <td className="pk-num" style={{ fontWeight: 600 }}>
                      {enp.sim.toFixed(1)} pos
                    </td>
                    <td
                      className="pk-num"
                      style={{
                        fontWeight: 600,
                        color: deltaColor(enp.delta, "higher_better"),
                      }}
                    >
                      {enp.delta > 0 ? "+" : ""}
                      {enp.delta.toFixed(1)}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>

          <div className="sim-show-full">
            <Button
              variant="tertiary"
              onClick={() => setShowFull(!showFull)}
            >
              {showFull ? "Hide full analysis" : "Show full proposed analysis ↓"}
            </Button>
          </div>

          {showFull && <ResultsPanel results={simResults} payload={simPayload} />}
        </>
      )}
    </div>
  );
}
