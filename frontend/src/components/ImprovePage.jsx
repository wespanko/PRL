// Improve — DESIGN_BRIEF.md §7
//
// Strict spec: Yellow warning banner at top. Two-column compare
// (Current | Proposed) with a center delta column showing Sharpe,
// Vol, and Drawdown in mono with ↑↓ arrows in green/red.

import { useState } from "react";
import { improvePortfolio } from "../api/client";
import ResultsPanel from "./ResultsPanel";
import InfoTip from "./InfoTip";
import { pct, num } from "../utils/formatters";
import { Button, Card, Banner, Table } from "./ui";

/* ── per-path metadata ── */
const PATH_METADATA = {
  "Maximize Health": {
    tagline: "Maximize the composite Health Score (Sharpe + DD + Diversification + Beta)",
    note: "Searched across hedge candidates and sizing levels to find the single trade that lifts the composite Health Score most while keeping annualized return within tolerance.",
    bestFor: "investors who want a single best-effort move that improves overall portfolio quality across all four risk dimensions at once",
    neutralMetrics: new Set(["upside_capture"]),
    isOptimized: true,
  },
  "Optimized Hedge": {
    tagline: "Mathematically minimize downside capture, preserve Sharpe",
    note: "Searched across hedge candidates and sizing levels to find the trade with the largest downside capture reduction while keeping Sharpe within tolerance.",
    bestFor: "investors who want maximum downside protection per unit of Sharpe given up — backed by an explicit objective and constraint",
    neutralMetrics: new Set(["upside_capture", "annualized_return"]),
    isOptimized: true,
  },
  "Lower Volatility": {
    tagline: "Mathematically minimize volatility, preserve return",
    note: "Searched across hedge candidates and sizing levels to find the trade with the largest volatility reduction while keeping annualized return within tolerance.",
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
    note: "A structural reference point, not a recommendation.",
    bestFor: "investors who want to see how their portfolio compares to a traditional balanced approach",
    neutralMetrics: new Set(["upside_capture"]),
  },
};

const ALLOWED_INSTRUMENTS = ["SPY", "AGG", "BND", "GLD", "TLT", "EFA", "VNQ", "BNDX"];

const SEV_COLOR = { critical: "var(--risk-red)", warning: "var(--risk-amber)" };
// §6: no emoji icons. Keep typographic glyphs.
const SEV_GLYPH = { critical: "!", warning: "↑" };

const METRICS = [
  { label: "Sharpe",         metric: "sharpe_ratio",          key: "sharpe_ratio",          fmt: (v) => num(v, 2),         higherBetter: true  },
  { label: "Volatility",     metric: "annualized_volatility", key: "annualized_volatility", fmt: (v) => pct(v),            higherBetter: false },
  { label: "Max Drawdown",   metric: "max_drawdown",          key: "max_drawdown",          fmt: (v) => pct(v),            higherBetter: false },
  { label: "Beta",           metric: "beta",                  key: "beta",                  fmt: (v) => num(v, 2),         higherBetter: false },
  { label: "VaR 95% (mo.)",  metric: "var_95",                key: "var_95",                fmt: (v) => pct(v),            higherBetter: false },
  { label: "Upside Cap.",    metric: "upside_capture",        key: "upside_capture",        fmt: (v) => `${num(v, 2)}×`,   higherBetter: true  },
  { label: "Downside Cap.",  metric: "downside_capture",      key: "downside_capture",      fmt: (v) => `${num(v, 2)}×`,   higherBetter: false },
  { label: "Risk Score",     metric: "risk_score",            key: "risk_score",            fmt: (v) => `${num(v, 1)}/10`, higherBetter: false },
];

// The §7 headline three. Drives the centerpiece CompareBlock.
const HEADLINE_METRICS = [
  { label: "Sharpe",     key: "sharpe_ratio",          fmt: (v) => num(v, 2), higherBetter: true  },
  { label: "Volatility", key: "annualized_volatility", fmt: (v) => pct(v),    higherBetter: false },
  { label: "Drawdown",   key: "max_drawdown",          fmt: (v) => pct(v),    higherBetter: false },
];

function WeaknessCallout({ weakness }) {
  return (
    <div className={`weakness-callout weakness-callout--${weakness.severity}`}>
      <span
        className="weakness-glyph"
        style={{ color: SEV_COLOR[weakness.severity] }}
        aria-hidden="true"
      >
        {SEV_GLYPH[weakness.severity]}
      </span>
      <div className="weakness-body">
        <strong className="weakness-title">{weakness.title}</strong>
        <div className="weakness-desc">{weakness.description}</div>
      </div>
    </div>
  );
}

function CompareBlock({ current, proposed, proposedLabel, isNeutral }) {
  return (
    <div className="improve-compare">
      <div className="improve-compare-side">
        <div className="pk-text-caption pk-ink-400 improve-compare-label">Current</div>
        <div className="improve-compare-metrics">
          {HEADLINE_METRICS.map((m) => (
            <div key={m.key} className="improve-compare-cell">
              <div className="pk-text-body-sm pk-ink-500">{m.label}</div>
              <div className="pk-text-mono-lg pk-ink-700">{m.fmt(current[m.key])}</div>
            </div>
          ))}
        </div>
      </div>

      {/* §7 center column: deltas in mono with ↑↓ arrows, green/red for direction */}
      <div className="improve-compare-deltas">
        <div className="pk-text-caption pk-ink-400 improve-compare-label improve-compare-label--center">
          Δ
        </div>
        <div className="improve-compare-metrics">
          {HEADLINE_METRICS.map((m) => {
            const delta = proposed[m.key] - current[m.key];
            const neutral = isNeutral(m.key) || Math.abs(delta) < 0.001;
            const improved = !neutral && (m.higherBetter ? delta > 0 : delta < 0);
            const arrow = neutral ? "" : improved ? "↑" : "↓";
            const color = neutral
              ? "var(--ink-400)"
              : improved
                ? "var(--risk-green)"
                : "var(--risk-red)";
            const text = neutral
              ? "—"
              : `${delta > 0 ? "+" : ""}${m.fmt(delta)}`;
            return (
              <div
                key={m.key}
                className="improve-compare-delta"
                style={{ color }}
              >
                <span className="pk-text-mono improve-compare-delta-num">
                  {text}
                </span>
                {arrow && (
                  <span className="improve-compare-arrow" aria-hidden="true">
                    {arrow}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="improve-compare-side improve-compare-side--proposed">
        <div className="pk-text-caption pk-blue-700 improve-compare-label">
          {proposedLabel}
        </div>
        <div className="improve-compare-metrics">
          {HEADLINE_METRICS.map((m) => (
            <div key={m.key} className="improve-compare-cell">
              <div className="pk-text-body-sm pk-ink-500">{m.label}</div>
              <div className="pk-text-mono-lg pk-ink-900">{m.fmt(proposed[m.key])}</div>
            </div>
          ))}
        </div>
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
  const changeColor = neutral ? "var(--ink-400)" : improved ? "var(--risk-green)" : "var(--risk-red)";
  const arrow = tinyDelta || neutral ? "" : improved ? " ↑" : " ↓";

  return (
    <tr>
      <td>
        {label}
        {metric && <InfoTip metric={metric} onLearnMore={onLearnMore} side="bottom" />}
      </td>
      <td className="pk-num pk-ink-400">{fmt(before)}</td>
      <td className="pk-num" style={{ fontWeight: 600 }}>{fmt(after)}</td>
      <td className="pk-num" style={{ color: changeColor, fontWeight: 600 }}>
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

const METRIC_CONFIG = {
  downside_capture:      { label: "Downside Capture", fmt: (v) => `${v.toFixed(2)}×`,        dir: "lower"  },
  upside_capture:        { label: "Upside Capture",   fmt: (v) => `${v.toFixed(2)}×`,        dir: "higher" },
  sharpe:                { label: "Sharpe Ratio",     fmt: (v) => v.toFixed(2),              dir: "higher" },
  annualized_return:     { label: "Ann. Return",      fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "higher" },
  annualized_volatility: { label: "Volatility",       fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "lower"  },
  max_drawdown:          { label: "Max Drawdown",     fmt: (v) => `${(v * 100).toFixed(1)}%`,dir: "higher" },
  beta:                  { label: "Beta",             fmt: (v) => v.toFixed(2),              dir: "lower"  },
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
  const operator = direction === "maximize" ? "≥" : "≥";  // both branches use same sign on the constraint floor

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
            {(constraint_label ?? constraint_attr).toLowerCase()}(w) {operator}{" "}
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

  // Empty state — display-lg ink-300 headline + body.
  if (!lastPayload) {
    return (
      <div className="container">
        <div className="improve-empty">
          <h1 className="pk-text-display-lg pk-ink-300">No analysis yet</h1>
          <p className="pk-text-body-lg pk-ink-500 improve-empty-body">
            Run an analysis first to generate improvement suggestions.
          </p>
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
      {/* §7: yellow warning banner at top */}
      <Banner variant="warning" title="Educational, not financial advice">
        The paths below are mechanical structural alternatives generated from
        the math, <strong>not investment recommendations</strong>. They don't
        account for taxes, transaction costs, your time horizon, or liquidity
        needs. Consult a licensed financial advisor before adjusting your
        portfolio.
      </Banner>

      <header className="improve-header">
        <div>
          <h1 className="pk-text-heading-lg pk-ink-900">Improve</h1>
          <p className="pk-text-body pk-ink-500 improve-header-sub">
            Structural alternatives — pick a path to see how each metric changes.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleRun}
          disabled={loading || !activePayload}
        >
          {loading ? "Analyzing…" : improveData ? "Refresh" : "Analyze"}
        </Button>
      </header>

      {/* Source toggle — segmented control, hairline borders, active blue-700 (§5) */}
      <div className="improve-source">
        <span className="pk-text-caption pk-ink-400 improve-source-label">
          Improving
        </span>
        <div className="improve-seg" role="radiogroup" aria-label="Source portfolio">
          <button
            type="button"
            role="radio"
            aria-checked={source === "current"}
            className={`improve-seg-item ${source === "current" ? "is-active" : ""}`}
            onClick={() => handleSourceChange("current")}
          >
            Current Portfolio
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={source === "proposed"}
            className={`improve-seg-item ${source === "proposed" ? "is-active" : ""}`}
            onClick={() => handleSourceChange("proposed")}
            disabled={!hasProposed}
            title={!hasProposed ? "Run a simulation on the Simulate tab first" : undefined}
          >
            Proposed Portfolio
          </button>
        </div>
      </div>

      {activePayload && (
        <div className="pk-text-mono-sm pk-ink-400 improve-source-detail">
          {portfolioSummary(activePayload.holdings)}
          {" · "}
          {activePayload.start_date} → {activePayload.end_date}
        </div>
      )}

      {error && <Banner variant="error">{error}</Banner>}

      {!improveData && !loading && (
        <Card className="improve-prompt-card">
          <p className="pk-text-body pk-ink-500">
            Click <strong className="pk-ink-900">Analyze</strong> to detect
            structural weaknesses and see alternatives with real computed
            metrics.
          </p>
        </Card>
      )}

      {loading && (
        <Card className="improve-prompt-card">
          <p className="pk-text-body pk-ink-500">
            <span className="spinner spinner--dark" style={{ marginRight: 8 }} />
            Computing alternatives — running full analysis for each path…
          </p>
        </Card>
      )}

      {improveData && (
        <>
          {/* Weaknesses */}
          <Card className="improve-weaknesses-card">
            {weaknesses.length === 0 ? (
              <>
                <div className="pk-text-heading-md pk-risk-green">
                  No major structural weaknesses detected.
                </div>
                <p className="pk-text-body pk-ink-500 improve-weaknesses-sub">
                  Portfolio appears well-structured. Alternatives are shown
                  below for reference.
                </p>
              </>
            ) : (
              <>
                <Card.Eyebrow>Detected weaknesses</Card.Eyebrow>
                <div className="weakness-list">
                  {weaknesses.map((w) => (
                    <WeaknessCallout key={w.id} weakness={w} />
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Paths */}
          {paths.length > 0 && (
            <Card className="improve-paths-card">
              <Card.Header>
                <div>
                  <Card.Title>Structural alternatives</Card.Title>
                  <p className="pk-text-body-sm pk-ink-400 improve-paths-sub">
                    Only adds broad ETFs:{" "}
                    <span className="pk-text-mono-sm pk-ink-700">
                      {ALLOWED_INSTRUMENTS.slice(0, 6).join(", ")}
                    </span>{" "}
                    and similar. No individual stocks are added.
                  </p>
                </div>
              </Card.Header>

              <div className="improve-tabs" role="tablist">
                {paths.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    role="tab"
                    aria-selected={selectedPath === i}
                    className={`improve-tab ${selectedPath === i ? "is-active" : ""}`}
                    onClick={() => {
                      setSelectedPath(i);
                      setShowFullAnalysis(false);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {path && (
                <div className="improve-path">
                  {meta.tagline && (
                    <div className="improve-path-tagline">
                      <span className="pk-text-caption pk-ink-400">Objective:</span>{" "}
                      <span className="pk-text-body-sm pk-ink-700">{meta.tagline}</span>
                    </div>
                  )}

                  <p className="pk-text-body pk-ink-700 improve-path-desc">
                    {path.description}
                  </p>

                  {meta.note && (
                    <p className="pk-text-body-sm pk-ink-500 improve-path-note">
                      {meta.note}
                    </p>
                  )}

                  {meta.bestFor && (
                    <p className="pk-text-body-sm pk-ink-500">
                      <strong className="pk-ink-700">Best for:</strong>{" "}
                      {meta.bestFor}.
                    </p>
                  )}

                  {path.error && (
                    <Banner variant="error">
                      Could not compute metrics: {path.error}
                    </Banner>
                  )}

                  {path.math && <OptimizationDetails math={path.math} />}

                  {/* §7 CENTERPIECE — two-column compare with delta column */}
                  {path.results && currentResults && (
                    <CompareBlock
                      current={currentResults}
                      proposed={path.results}
                      proposedLabel={path.name}
                      isNeutral={(key) => meta.neutralMetrics?.has(key) ?? false}
                    />
                  )}

                  {/* All-metrics detail table — collapsible */}
                  {path.results && currentResults && (
                    <details className="improve-detail-table">
                      <summary className="pk-text-body-sm pk-ink-500">
                        Show all metrics
                      </summary>
                      <Table>
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th className="pk-num">Current</th>
                            <th className="pk-num">{path.name}</th>
                            <th className="pk-num">Change</th>
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
                      </Table>
                    </details>
                  )}

                  {/* Holdings changes */}
                  <div className="improve-section">
                    <Card.Eyebrow>What changes</Card.Eyebrow>
                    <div className="improve-weight-list">
                      {buildWeightChanges(activePayload.holdings, path.holdings).map((row) => (
                        <div key={row.ticker} className="improve-weight-row">
                          <span className="pk-text-mono pk-ink-900 improve-weight-ticker">
                            {row.ticker}
                          </span>
                          <span className="pk-text-mono-sm pk-ink-400 improve-weight-before">
                            {row.before != null ? pct(row.before, 1) : "—"}
                          </span>
                          <span className="improve-weight-arrow" aria-hidden="true">→</span>
                          <span
                            className={`pk-text-mono pk-ink-900 improve-weight-after${row.isNew ? " is-new" : ""}`}
                          >
                            {pct(row.after, 1)}
                            {row.isNew && (
                              <span className="improve-weight-new-tag pk-text-caption pk-blue-700">
                                {" "}new
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tradeoff */}
                  {path.tradeoff && (
                    <div className="improve-tradeoff">
                      <div className="improve-tradeoff-row improve-tradeoff-row--gain">
                        <span className="improve-tradeoff-tag">Gain</span>
                        <span className="pk-text-body pk-ink-900">{path.tradeoff.gain}</span>
                      </div>
                      <div className="improve-tradeoff-row improve-tradeoff-row--give">
                        <span className="improve-tradeoff-tag">Give up</span>
                        <span className="pk-text-body pk-ink-900">{path.tradeoff.give_up}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="improve-actions">
                    <Button
                      variant="primary"
                      onClick={() => onUseInSimulate(path.holdings)}
                    >
                      Use in Simulate →
                    </Button>
                    {path.results && (
                      <Button
                        variant="tertiary"
                        onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                      >
                        {showFullAnalysis ? "Hide full analysis" : "Show full analysis"}
                      </Button>
                    )}
                  </div>

                  {showFullAnalysis && path.results && (
                    <div className="improve-full-results">
                      <ResultsPanel
                        results={path.results}
                        payload={{ ...activePayload, holdings: path.holdings }}
                        prevSnapshot={null}
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          <p className="pk-text-body-sm pk-ink-400 improve-disclaimer">
            These are structural examples, not recommendations. They use broad
            ETFs only as illustrations of risk exposures — not as endorsements.
            Past performance does not predict future results. Consult a
            financial advisor before making changes to your investments.
          </p>
        </>
      )}
    </div>
  );
}
