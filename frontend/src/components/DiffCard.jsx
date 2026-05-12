import { diffSnapshots } from "../utils/diff";

// Severity colors mapped to brief §2 risk tokens. The map is read in two
// places: (1) the severity icon glyph color, (2) the current value emphasis
// inside .diff-values. Keep them in sync if you add a new severity.
const SEV_COLOR = {
  critical: "var(--risk-red)",
  warning:  "var(--risk-amber)",
  improved: "var(--risk-green)",
  stable:   "var(--ink-400)",
};

// Semantic affordances — warning glyph, directional arrows, em-dash. Not
// decorative dingbats (those are forbidden by §6); each carries meaning.
const SEV_ICON = { critical: "⚠", warning: "↑", improved: "↓", stable: "—" };

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
              <span className="diff-comp-ticker" style={{ color: "var(--risk-green)" }}>
                + {t.ticker}
              </span>
              <span className="diff-comp-detail">added at {(t.weight * 100).toFixed(1)}%</span>
            </div>
          ))}
          {diff.removed_tickers.map((t) => (
            <div key={t.ticker} className="diff-comp-row">
              <span className="diff-comp-ticker" style={{ color: "var(--risk-red)" }}>
                − {t.ticker}
              </span>
              <span className="diff-comp-detail">removed (was {(t.prev_weight * 100).toFixed(1)}%)</span>
            </div>
          ))}
          {diff.changed_weights.map((t) => (
            <div key={t.ticker} className="diff-comp-row">
              <span
                className="diff-comp-ticker"
                style={{ color: t.delta > 0 ? "var(--risk-amber)" : "var(--ink-500)" }}
              >
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
