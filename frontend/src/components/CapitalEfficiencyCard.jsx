import { pct } from "../utils/formatters";

function effLabel(ratio) {
  // §6: no emoji icons; ⚠ and ◻ replaced with typographic glyphs.
  // Colors: brief tokens only.
  if (ratio > 1.5)  return { text: "Hidden Risk",        color: "var(--risk-red)",   icon: "!" };
  if (ratio > 1.15) return { text: "Slightly Over",      color: "var(--risk-amber)", icon: "↑" };
  if (ratio < 0.4)  return { text: "Possibly Redundant", color: "var(--ink-400)",    icon: "◇" };
  if (ratio < 0.7)  return { text: "Diluted",            color: "var(--ink-500)",    icon: "↓" };
  return            { text: "Proportional",              color: "var(--risk-green)", icon: "✓" };
}

export default function CapitalEfficiencyCard({ contributions }) {
  const sorted = [...contributions].sort((a, b) => b.pct_risk - a.pct_risk);
  const topHidden = sorted.filter((r) => r.weight > 0 && r.pct_risk / r.weight > 1.5);
  const topRedundant = sorted.filter((r) => r.weight > 0 && r.pct_risk / r.weight < 0.4);

  return (
    <div className="card">
      <h2>Capital Efficiency</h2>

      {topHidden.length > 0 && (
        <div className="insight-callout insight-callout--warn">
          <strong>Hidden concentration:</strong>{" "}
          {topHidden.map((r) => {
            const ratio = (r.pct_risk / r.weight).toFixed(2);
            return `${r.ticker} carries ${ratio}× its weight in risk (${pct(r.pct_risk)} risk vs ${pct(r.weight)} capital)`;
          }).join(" · ")}
        </div>
      )}
      {topRedundant.length > 0 && topHidden.length === 0 && (
        <div className="insight-callout insight-callout--neutral">
          <strong>Possible redundancy:</strong>{" "}
          {topRedundant.map((r) => r.ticker).join(", ")}{" "}
          {topRedundant.length === 1 ? "overlaps" : "overlap"} heavily with other holdings — similar factor exposure at double the position count.
        </div>
      )}

      <p className="chart-caption" style={{ marginTop: topHidden.length || topRedundant.length ? 12 : 0 }}>
        Efficiency = risk% ÷ weight%. Above 1.0× = carrying more risk than capital share.
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th style={{ textAlign: "right" }}>Weight</th>
            <th style={{ textAlign: "right" }}>Risk %</th>
            <th style={{ textAlign: "right" }}>Efficiency</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const ratio = r.weight > 0 ? r.pct_risk / r.weight : 0;
            const lbl = effLabel(ratio);
            return (
              <tr key={r.ticker}>
                <td style={{ fontWeight: 600 }}>{r.ticker}</td>
                <td style={{ textAlign: "right", color: "var(--ink-500)" }}>{pct(r.weight)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{pct(r.pct_risk)}</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: lbl.color }}>{ratio.toFixed(2)}×</td>
                <td>
                  <span style={{ color: lbl.color, fontSize: 12, whiteSpace: "nowrap" }}>
                    {lbl.icon} {lbl.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
