// Stress Scenarios — DESIGN_BRIEF.md §7 Analyze
//
// "Stress Scenarios row of 4 small cards." We render the four worst
// (most-negative) scenarios as small cards in a row. If more than 4
// scenarios are present, the rest open in an expandable detail panel
// at the bottom.
//
// Color rule: per §4, risk colors only in data context. Stress
// scenarios ARE data context. We use --risk-red for negative outcomes
// and --ink-900 for non-negative; no traffic-light gradient.

import { useState } from "react";
import { pct } from "../utils/formatters";

function scenarioColor(value) {
  if (value < 0) return "var(--risk-red)";
  return "var(--ink-900)";
}

export default function StressTable({ scenarios, breakdown }) {
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Sort ascending (worst first).
  const sorted = Object.entries(scenarios ?? {}).sort((a, b) => a[1] - b[1]);
  const featured = sorted.slice(0, 4);
  const rest = sorted.slice(4);

  if (sorted.length === 0) return null;

  return (
    <section className="stress-section card">
      <header className="stress-header">
        <h2 className="stress-title">Stress Scenarios</h2>
        <p className="stress-sub">
          Theme-aware shocks applied per holding. Worst-first.
        </p>
      </header>

      <div className="stress-row">
        {featured.map(([name, value]) => {
          const isOpen = expanded === name;
          const rows = breakdown?.[name] ?? [];
          const clickable = rows.length > 0;
          return (
            <button
              key={name}
              type="button"
              className={`stress-card ${isOpen ? "is-open" : ""}`}
              onClick={() => clickable && setExpanded(isOpen ? null : name)}
              disabled={!clickable}
              aria-expanded={isOpen}
            >
              <div className="pk-text-caption pk-ink-400 stress-card-label">
                {name}
              </div>
              <div
                className="stress-card-figure pk-text-mono-lg"
                style={{ color: scenarioColor(value) }}
              >
                {pct(value)}
              </div>
              <div className="pk-text-body-sm pk-ink-400">Estimated return</div>
            </button>
          );
        })}
      </div>

      {expanded && breakdown?.[expanded]?.length > 0 && (
        <div className="stress-detail">
          <div className="pk-text-heading-sm pk-ink-400 stress-detail-eyebrow">
            {expanded} — per-holding breakdown
          </div>
          <div className="pk-table-wrap">
            <table className="pk-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Theme</th>
                  <th className="pk-num">Applied shock</th>
                  <th className="pk-num">Weight</th>
                  <th className="pk-num">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {breakdown[expanded].map((r) => (
                  <tr key={r.ticker}>
                    <td className="pk-text-mono">{r.ticker}</td>
                    <td className="pk-ink-500">{r.theme}</td>
                    <td className="pk-num" style={{ color: scenarioColor(r.applied_shock) }}>
                      {pct(r.applied_shock)}
                    </td>
                    <td className="pk-num pk-ink-500">{pct(r.weight)}</td>
                    <td className="pk-num" style={{ color: scenarioColor(r.contribution), fontWeight: 600 }}>
                      {pct(r.contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="stress-more">
          <button
            type="button"
            className="pk-btn pk-btn--tertiary"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? `Hide ${rest.length} more`
              : `Show ${rest.length} more scenarios →`}
          </button>
          {showAll && (
            <div className="pk-table-wrap stress-rest-wrap">
              <table className="pk-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="pk-num">Estimated return</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td
                        className="pk-num"
                        style={{ color: scenarioColor(value), fontWeight: 600 }}
                      >
                        {pct(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
