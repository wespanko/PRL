import { useState } from "react";
import { improvePortfolio } from "../api/client";
import ResultsPanel from "./ResultsPanel";
import InfoTip from "./InfoTip";
import { pct, num } from "../utils/formatters";

/* ── per-path metadata ── */
const PATH_METADATA = {
  "Maximize Health": {
    tagline: "Maximize the composite Health Score (Sharpe + DD + Diversification + Beta)",
    note: "Searched across hedge candidates and sizing levels to find the single trade that lifts the composite Health Score most while keeping annualized return within tolerance. The Health Score is a weighted blend so the chosen trade typically improves multiple risk dimensions simultaneously.",
    bestFor: "investors who want a single best-effort move that improves overall portfolio quality across all four risk dimensions at once",
    neutralMetrics: new Set(["upside_capture"]),
    isOptimized: true,
  },
  "Optimized Hedge": {
    tagline: "Mathematically minimize downside capture, preserve Sharpe",
    note: "Searched across hedge candidates and sizing levels to find the trade with the largest downside capture reduction while keeping Sharpe within tolerance. The selection is data-driven, not a heuristic.",
    bestFor: "investors who want maximum downside protection per unit of Sharpe given up — backed by an explicit objective and constraint",
    neutralMetrics: new Set(["upside_capture", "annualized_return"]),
    isOptimized: true,
  },
  "Lower Volatility": {
    tagline: "Mathematically minimize volatility, preserve return",
    note: "Searched across hedge candidates and sizing levels to find the trade with the largest volatility reduction while keeping annualized return within tolerance. The trade-off is explicit: smoother returns at a known and bounded return cost.",
    bestFor: "investors who want lower realized volatility for compounding stability without giving up much annualized return",
    neutralMetrics: new Set(["upside_capture", "downside_capture"]),
    isOptimized: true,
  },
  "Lower Risk": {
    tagline: "Reduce volatility and drawdown",
    note: "Sharpe may decrease slightly — this is expected when adding defensive assets. The objective is risk control, not return maximisation.",
    bestFor: "investors who want smoother returns and are willing to give up some upside in a bull market",
    neutralMetrics: new Set(["sharpe_ratio", "upside_capture"]),
  },
  "Better Diversified": {
    tagline: "Increase correlation-adjusted diversification (ENP)",
    note: "Most headline metrics stay similar. The gain is in real diversification — fewer hidden single-driver bets.",
    bestFor: "investors who want genuine diversification, not just more tickers sharing the same underlying theme",
    neutralMetrics: new Set(["sharpe_ratio", "upside_capture", "annualized_volatility", "beta", "max_drawdown", "var_95", "downside_capture", "risk_score"]),
  },
  "Lower Drawdown": {
    tagline: "Reduce max drawdown and tail risk",
    note: "Upside capture will decline — that is the expected cost of downside protection.",
    bestFor: "investors who prioritise capital preservation and want to reduce worst-case losses",
    neutralMetrics: new Set(["sharpe_ratio", "upside_capture"]),
  },
  "Benchmark Balanced": {
    tagline: "Move toward a traditional 60/40 risk profile",
    note: "A structural reference point, not a recommendation. Shows how a conventional balanced allocation affects your risk metrics.",
    bestFor: "investors who want to see how their portfolio compares to a traditional balanced approach",
    neutralMetrics: new Set(["upside_capture"]),
  },
};

const ALLOWED_INSTRUMENTS = ["SPY", "AGG", "BND", "GLD", "TLT", "EFA", "VNQ", "BNDX"];

const SEV_COLOR = { critical: "var(--negative)", warning: "var(--warning)" };
const SEV_ICON  = { critical: "⚠", warning: "↑" };

const METRICS = [
  { label: "Sharpe",         metric: "sharpe_ratio",          key: "sharpe_ratio",          fmt: (v) => num(v, 2),        higherBetter: true  },
  { label: "Volatility",     metric: "annualized_volatility", key: "annualized_volatility", fmt: (v) => pct(v),            higherBetter: false },
  { label: "Max Drawdown",   metric: "max_drawdown",          key: "max_drawdown",          fmt: (v) => pct(v),            higherBetter: false },
  { label: "Beta",           metric: "beta",                  key: "beta",                  fmt: (v) => num(v, 2),         higherBetter: false },
  { label: "VaR 95% (mo.)",  metric: "var_95",                key: "var_95",                fmt: (v) => pct(v),            higherBetter: false },
  { label: "Upside Cap.",    metric: "upside_capture",        key: "upside_capture",        fmt: (v) => `${num(v, 2)}×`,   higherBetter: true  },
  { label: "Downside Cap.",  metric: "downside_capture",      key: "downside_capture",      fmt: (v) => `${num(v, 2)}×`,   higherBetter: false },
  { label: "Risk Score",     metric: "risk_score",            key: "risk_score",            fmt: (v) => `${num(v, 1)}/10`, higherBetter: false },
];

function WeaknessCallout({ weakness }) {
  return (
    <div className={`weakness-callout weakness-callout--${weakness.severity}`}>
      <span className="weakness-icon" style={{ color: SEV_COLOR[weakness.severity] }}>
        {SEV_ICON[weakness.severity]}
      </span>
      <div>
        <strong className="weakness-title">{weakness.title}</strong>
        <div className="weakness-desc">{weakness.description}</div>
      </div>
    </div>
  );
}

function MetricRow({ label, metric, before, after, fmt, higherBetter, isNeutral, onLearnMore }) {
  if (before == null || after == null) return null;
  const delta = after - before;
  const tinyDelta = Math.abs(delta) < 0.001;
  const neutral = isNeutral || tinyDelta;
  const improved = !neutral && (higherBetter ? delta > 0 : delta < 0);
  const changeColor = neutral ? "var(--label-4)" : improved ? "var(--positive)" : "var(--negative)";
  const arrow = tinyDelta || neutral ? "" : improved ? " ↑" : " ↓";

  return (
    <tr>
      <td className="improve-metric-label">
        {label}
        {metric && <InfoTip metric={metric} onLearnMore={onLearnMore} side="bottom" />}
      </td>
      <td className="improve-metric-val">{fmt(before)}</td>
      <td className="improve-metric-val" style={{ fontWeight: 600 }}>{fmt(after)}</td>
      <td className="improve-metric-val" style={{ color: changeColor, fontWeight: 700 }}>
        {tinyDelta ? "—" : `${delta > 0 ? "+" : ""}${fmt(delta)}${arrow}`}
      </td>
    </tr>
  );
}

function buildWeightChanges(originalHoldings, newHoldings) {
  const origMap = Object.fromEntries((originalHoldings ?? []).map((h) => [h.ticker, h.weight]));
  const newMap  = Object.fromEntries((newHoldings ?? []).map((h) => [h.ticker, h.weight]));
  return [...new Set([...Object.keys(origMap), ...Object.keys(newMap)])]
    .filter((t) => newMap[t] != null)
    .map((t) => ({ ticker: t, before: origMap[t] ?? null, after: newMap[t], isNew: !(t in origMap) }))
    .sort((a, b) => b.after - a.after);
}

function portfolioSummary(holdings) {
  if (!holdings?.length) return "—";
  return holdings.map((h) => `${h.ticker} ${pct(h.weight, 0)}`).join(" · ");
}

/* Per-metric display configuration for the optimization details block.
   `dir` = which direction is "good" (so we can color the delta).         */
const METRIC_CONFIG = {
  downside_capture:      { label: "Downside Capture", fmt: (v) => `${v.toFixed(2)}×`,        dir: "lower" },
  upside_capture:        { label: "Upside Capture",   fmt: (v) => `${v.toFixed(2)}×`,        dir: "higher" },
  sharpe:                { label: "Sharpe Ratio",     fmt: (v) => v.toFixed(2),              dir: "higher" },
  annualized_return:     { label: "Ann. Return",      fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "higher" },
  annualized_volatility: { label: "Volatility",       fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "lower" },
  max_drawdown:          { label: "Max Drawdown",     fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "higher" },
  beta:                  { label: "Beta",             fmt: (v) => v.toFixed(2),              dir: "lower" },
  enp_risk:              { label: "Real Diversification", fmt: (v) => `${v.toFixed(1)} pos`, dir: "higher" },
  health_score:          { label: "Health Score",     fmt: (v) => `${v.toFixed(1)}/10`,      dir: "higher" },
};

const SUPPORTING_METRIC = {
  downside_capture:      "max_drawdown",
  annualized_volatility: "max_drawdown",
  health_score:          "enp_risk",
};

function deltaIsImprovement(metricKey, delta) {
  if (Math.abs(delta) < 1e-9) return null;
  const dir = METRIC_CONFIG[metricKey]?.dir;
  if (dir === "higher") return delta > 0;
  if (dir === "lower")  return delta < 0;
  return null;
}

function MetricTile({ metricKey, baseline, selected }) {
  const cfg = METRIC_CONFIG[metricKey];
  if (!cfg || baseline?.[metricKey] == null || selected?.[metricKey] == null) return null;
  const before = baseline[metricKey];
  const after = selected[metricKey];
  const absDelta = after - before;
  const pctDelta = before !== 0 ? absDelta / Math.abs(before) : 0;
  const improved = deltaIsImprovement(metricKey, absDelta);
  const colorClass = improved === true ? "opt-pos" : improved === false ? "opt-neg" : "opt-neutral";

  return (
    <div className="opt-result-tile">
      <div className="opt-result-tile-label">{cfg.label}</div>
      <div className="opt-result-tile-value">
        <span className="opt-result-tile-from">{cfg.fmt(before)}</span>
        <span className="opt-result-tile-arrow">→</span>
        <span className={`opt-result-tile-to ${colorClass}`}>{cfg.fmt(after)}</span>
      </div>
      <div className={`opt-result-tile-delta ${colorClass}`}>
        {pctDelta > 0 ? "+" : ""}{(pctDelta * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function OptimizationDetails({ math }) {
  const {
    baseline, selected,
    candidates_evaluated, candidates_feasible, pareto_frontier,
    max_drop_pct, objective_attr, constraint_attr,
    objective_label, constraint_label,
  } = math;

  const direction = String(math.objective ?? "").startsWith("max") ? "maximize" : "minimize";
  const operator = direction === "maximize" ? "≥" : "≤";

  const objCfg = METRIC_CONFIG[objective_attr];
  const conCfg = METRIC_CONFIG[constraint_attr];

  const supportingKey = SUPPORTING_METRIC[objective_attr] ?? "sharpe";
  const tileKeys = [objective_attr, constraint_attr];
  if (supportingKey && supportingKey !== objective_attr && supportingKey !== constraint_attr) {
    tileKeys.push(supportingKey);
  }

  const constraintFloor = baseline?.[constraint_attr] != null
    ? baseline[constraint_attr] * (1 - (max_drop_pct ?? 0))
    : null;

  return (
    <div className="opt-details">
      <div className="opt-details-header">
        <span className="opt-details-badge">Optimized</span>
        <span className="opt-details-title">How this trade was selected</span>
      </div>

      <div className="opt-details-formula">
        <div className="opt-formula-line">
          <span className="opt-formula-label">Objective</span>
          <code>{direction} {objective_label?.toLowerCase() ?? objective_attr}(w)</code>
        </div>
        <div className="opt-formula-line">
          <span className="opt-formula-label">Constraint</span>
          <code>
            {(constraint_label ?? constraint_attr).toLowerCase()}(w) {operator === "≥" ? "≥" : "≥"}{" "}
            {conCfg && constraintFloor != null ? conCfg.fmt(constraintFloor) : constraintFloor?.toFixed(3)}
          </code>
          {max_drop_pct != null && baseline?.[constraint_attr] != null && conCfg && (
            <span className="opt-formula-aside">
              (≥{(100 - max_drop_pct * 100).toFixed(0)}% of baseline {conCfg.fmt(baseline[constraint_attr])})
            </span>
          )}
        </div>
        <div className="opt-formula-line">
          <span className="opt-formula-label">Search</span>
          <code>{candidates_evaluated} candidates · {candidates_feasible} feasible</code>
        </div>
      </div>

      <div className="opt-details-result">
        <div className="opt-result-row">
          <span className="opt-result-label">Selected trade</span>
          <span className="opt-result-value">
            +{(selected.weight * 100).toFixed(0)}% <strong>{selected.hedge}</strong>
            <span className="opt-result-aside"> (sourced proportionally from existing positions)</span>
          </span>
        </div>
        <div className="opt-result-grid">
          {tileKeys.map((k) => (
            <MetricTile key={k} metricKey={k} baseline={baseline} selected={selected} />
          ))}
        </div>
      </div>

      {pareto_frontier?.length > 1 && (
        <details className="opt-details-frontier">
          <summary>Top {pareto_frontier.length} feasible trades (Pareto frontier)</summary>
          <table className="opt-frontier-table">
            <thead>
              <tr>
                <th>Trade</th>
                {tileKeys.map((k) => (
                  <th key={k} className="opt-num">{METRIC_CONFIG[k]?.label ?? k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pareto_frontier.map((c, i) => (
                <tr key={`${c.hedge}-${c.weight}`} className={i === 0 ? "opt-frontier-best" : ""}>
                  <td>+{(c.weight * 100).toFixed(0)}% {c.hedge}{i === 0 && " ★"}</td>
                  {tileKeys.map((k) => (
                    <td key={k} className="opt-num">
                      {c[k] != null ? METRIC_CONFIG[k].fmt(c[k]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

export default function ImprovePage({
  lastPayload, lastResults,
  simulatePayload, simulateResults,
  onUseInSimulate, onLearnMore, profile,
}) {
  const hasProposed = !!(simulatePayload && simulateResults);

  const [source, setSource]                   = useState(hasProposed ? "proposed" : "current");
  const [improveData, setImproveData]         = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [selectedPath, setSelectedPath]       = useState(0);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const activePayload = source === "proposed" ? simulatePayload : lastPayload;

  function handleSourceChange(newSource) {
    if (newSource === source) return;
    setSource(newSource);
    setImproveData(null);
    setError(null);
    setSelectedPath(0);
    setShowFullAnalysis(false);
  }

  async function handleRun() {
    if (!activePayload) return;
    setLoading(true);
    setError(null);
    try {
      const data = await improvePortfolio({
        ...activePayload,
        risk_tolerance: profile?.riskTolerance ?? "balanced",
      });
      setImproveData(data);
      setSelectedPath(0);
      setShowFullAnalysis(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!lastPayload) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No analysis yet</div>
          <div className="empty-state-body">
            Run an analysis first to generate improvement suggestions.
          </div>
        </div>
      </div>
    );
  }

  const currentResults = improveData?.current_results;
  const weaknesses     = improveData?.weaknesses ?? [];
  const paths          = improveData?.paths ?? [];
  const path           = paths[selectedPath];
  const meta           = path ? (PATH_METADATA[path.name] ?? {}) : {};

  return (
    <div className="container">
      <div className="improve-header">
        <div>
          <h1 style={{ margin: 0 }}>Improve</h1>
          <p style={{ fontSize: 13, color: "var(--label-3)", margin: "4px 0 0" }}>
            Structural alternatives — not financial advice
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={loading || !activePayload}>
          {loading ? "Analyzing…" : improveData ? "Refresh" : "Analyze"}
        </button>
      </div>

      <div className="advisor-callout">
        <strong>Reminder:</strong> the paths below are mechanical structural alternatives generated
        from the math, <strong>not investment recommendations</strong>. They don't account for taxes,
        transaction costs, your specific time horizon, or your liquidity needs.{" "}
        <strong>Consult a licensed financial advisor</strong> before adjusting your portfolio.
      </div>

      {/* Source toggle */}
      <div className="improve-source-row">
        <span className="improve-source-label">Improving:</span>
        <div className="seg-control">
          <button
            className={`seg-btn ${source === "current" ? "seg-btn--active" : ""}`}
            onClick={() => handleSourceChange("current")}
          >
            Current Portfolio
          </button>
          <button
            className={`seg-btn ${source === "proposed" ? "seg-btn--active" : ""}`}
            onClick={() => handleSourceChange("proposed")}
            disabled={!hasProposed}
            title={!hasProposed ? "Run a simulation on the Simulate tab first" : undefined}
          >
            Proposed Portfolio
          </button>
        </div>
      </div>

      {/* Source summary line */}
      {activePayload && (
        <div className="improve-source-detail">
          {portfolioSummary(activePayload.holdings)}
          {" · "}
          {activePayload.start_date} → {activePayload.end_date}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {!improveData && !loading && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px", color: "var(--label-3)", fontSize: 13 }}>
          Click <strong>Analyze</strong> to detect structural weaknesses and see alternatives with real computed metrics.
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px", color: "var(--label-3)" }}>
          <span className="spinner spinner--dark" style={{ marginRight: 8 }} />
          Computing alternatives — running full analysis for each path…
        </div>
      )}

      {improveData && (
        <>
          {/* Weaknesses */}
          <div className="card" style={{ marginBottom: 12 }}>
            {weaknesses.length === 0 ? (
              <>
                <div style={{ color: "var(--positive)", fontWeight: 600, marginBottom: 4 }}>
                  No major structural weaknesses detected.
                </div>
                <div style={{ fontSize: 13, color: "var(--label-3)" }}>
                  Portfolio appears well-structured. Alternatives are shown below for reference.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>
                  Detected weaknesses
                </div>
                <div className="weakness-list">
                  {weaknesses.map((w) => <WeaknessCallout key={w.id} weakness={w} />)}
                </div>
              </>
            )}
          </div>

          {/* Paths */}
          {paths.length > 0 && (
            <div className="card">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
                  Structural alternatives
                </div>
                <div style={{ fontSize: 12, color: "var(--label-4)" }}>
                  Only adds broad ETFs: {ALLOWED_INSTRUMENTS.slice(0, 6).join(", ")} and similar.
                  No individual stocks are added.
                </div>
              </div>

              <div className="improve-tabs">
                {paths.map((p, i) => (
                  <button
                    key={p.name}
                    className={`improve-tab ${selectedPath === i ? "improve-tab--active" : ""}`}
                    onClick={() => { setSelectedPath(i); setShowFullAnalysis(false); }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {path && (
                <div className="improve-path-content">
                  {/* Objective badge */}
                  {meta.tagline && (
                    <div className="improve-objective-tag">Objective: {meta.tagline}</div>
                  )}

                  <div className="improve-path-desc">{path.description}</div>

                  {meta.note && (
                    <div className="improve-objective-note">{meta.note}</div>
                  )}

                  {meta.bestFor && (
                    <div className="improve-best-for">
                      <strong>Best for:</strong> {meta.bestFor}.
                    </div>
                  )}

                  {path.error && (
                    <div className="improve-path-error">Could not compute metrics: {path.error}</div>
                  )}

                  {path.math && <OptimizationDetails math={path.math} />}

                  {/* Weight changes */}
                  <div className="improve-section">
                    <div className="improve-section-label">What changes</div>
                    <div className="improve-weight-changes">
                      {buildWeightChanges(activePayload.holdings, path.holdings).map((row) => (
                        <div key={row.ticker} className="improve-weight-row">
                          <span className="improve-weight-ticker">{row.ticker}</span>
                          <span className="improve-weight-before">
                            {row.before != null ? pct(row.before, 1) : "—"}
                          </span>
                          <span className="improve-weight-arrow">→</span>
                          <span className={`improve-weight-after${row.isNew ? " improve-weight-new" : ""}`}>
                            {pct(row.after, 1)}{row.isNew && " (new)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Before / After table */}
                  {path.results && currentResults && (
                    <div className="improve-section">
                      <div className="improve-section-label">Before vs After</div>
                      <table className="improve-table">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th className="improve-metric-val">Before</th>
                            <th className="improve-metric-val">{path.name}</th>
                            <th className="improve-metric-val">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {METRICS.map((m) => (
                            <MetricRow
                              key={m.key}
                              label={m.label}
                              metric={m.metric}
                              before={currentResults[m.key]}
                              after={path.results[m.key]}
                              fmt={m.fmt}
                              higherBetter={m.higherBetter}
                              isNeutral={meta.neutralMetrics?.has(m.key) ?? false}
                              onLearnMore={onLearnMore}
                            />
                          ))}
                          <MetricRow
                            label="Real Positions (ENP)"
                            metric="enp_risk"
                            before={currentResults.concentration?.enp_risk}
                            after={path.results.concentration?.enp_risk}
                            fmt={(v) => num(v, 1)}
                            higherBetter={true}
                            isNeutral={meta.neutralMetrics?.has("enp_risk") ?? false}
                            onLearnMore={onLearnMore}
                          />
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tradeoff */}
                  {path.tradeoff && (
                    <div className="improve-tradeoff">
                      <div className="improve-tradeoff-gain">✓ You gain: {path.tradeoff.gain}</div>
                      <div className="improve-tradeoff-give">✗ You give up: {path.tradeoff.give_up}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="improve-actions">
                    <button className="btn btn-primary" onClick={() => onUseInSimulate(path.holdings)}>
                      Use in Simulate →
                    </button>
                    {path.results && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                      >
                        {showFullAnalysis ? "Hide full analysis" : "Show full analysis"}
                      </button>
                    )}
                  </div>

                  {showFullAnalysis && path.results && (
                    <div style={{ marginTop: 24 }}>
                      <ResultsPanel
                        results={path.results}
                        payload={{ ...activePayload, holdings: path.holdings }}
                        prevSnapshot={null}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="improve-disclaimer">
            These are structural examples, not recommendations. They use broad ETFs only as illustrations of risk exposures — not as endorsements. Past performance does not predict future results. Consult a financial advisor before making changes to your investments.
          </div>
        </>
      )}
    </div>
  );
}
