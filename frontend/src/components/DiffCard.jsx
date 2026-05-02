import { diffSnapshots } from "../utils/diff";

const SEV_COLOR = {
  critical: "var(--negative)",
  warning: "var(--warning)",
  improved: "var(--positive)",
  stable: "var(--label-4)",
};
const SEV_ICON  = { critical: "⚠", warning: "↑", improved: "↓", stable: "—" };

export default function DiffCard({ prevSnapshot, results }) {
  const diff = diffSnapshots(prevSnapshot, results);
  const notable = diff.metric_changes.filter((m) => m.severity !== "stable");
  const date = new Date(prevSnapshot.timestamp).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="card diff-card">
      <div className="diff-header">
        <span className="diff-title">What changed since {date}</span>
      </div>
      <p className="diff-summary">{diff.summary}</p>

      {notable.length > 0 && (
        <div className="diff-metrics">
          {notable.map((m) => (
            <div key={m.key} className="diff-metric-row">
              <span className="diff-icon" style={{ color: SEV_COLOR[m.severity] }}>
                {SEV_ICON[m.severity]}
              </span>
              <span className="diff-label">{m.label}</span>
              <span className="diff-values">
                <span className="diff-prev">{m.fmt(m.prev)}</span>
                <span className="diff-arrow">→</span>
                <span className="diff-curr" style={{ color: SEV_COLOR[m.severity] }}>
                  {m.fmt(m.curr)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {(diff.new_tickers.length > 0 || diff.removed_tickers.length > 0 || diff.changed_weights.length > 0) && (
        <div className="diff-composition">
          <div className="diff-section-label">Composition</div>
          {diff.new_tickers.map((t) => (
            <div key={t.ticker} className="diff-comp-row">
              <span style={{ color: "var(--positive)", fontWeight: 600 }}>+ {t.ticker}</span>
              <span className="diff-comp-detail">added at {(t.weight * 100).toFixed(1)}%</span>
            </div>
          ))}
          {diff.removed_tickers.map((t) => (
            <div key={t.ticker} className="diff-comp-row">
              <span style={{ color: "var(--negative)", fontWeight: 600 }}>− {t.ticker}</span>
              <span className="diff-comp-detail">removed (was {(t.prev_weight * 100).toFixed(1)}%)</span>
            </div>
          ))}
          {diff.changed_weights.map((t) => (
            <div key={t.ticker} className="diff-comp-row">
              <span style={{ color: t.delta > 0 ? "var(--warning)" : "var(--label-3)", fontWeight: 600 }}>
                {t.delta > 0 ? "↑" : "↓"} {t.ticker}
              </span>
              <span className="diff-comp-detail">
                {(t.prev_weight * 100).toFixed(1)}% → {(t.curr_weight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
