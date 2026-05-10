// Correlation Matrix — DESIGN_BRIEF.md §5
//
// Strict palette rule: blue scale only, --blue-100 to --blue-900.
// NO red-green diverging. Negative correlations get the same blue
// ramp on the negative side via cell intensity, not a different hue.

// Blue ramp at 5 stops. From token values:
//   --blue-100 #E8EEF5  (lightest tint)
//   --blue-300 #6B8CAE
//   --blue-500 #2B5582
//   --blue-700 #1E3A5F
//   --blue-900 #0B1F3A  (darkest)
const BLUE_RAMP = ["#E8EEF5", "#6B8CAE", "#2B5582", "#1E3A5F", "#0B1F3A"];

function cellBackground(value) {
  if (value == null) return "transparent";
  // Map |value| ∈ [0,1] → ramp index. Higher abs correlation = darker blue.
  // Negative correlations are still represented in blue (per §5: blue
  // scale only); the sign is conveyed by the printed number itself.
  const abs = Math.min(1, Math.abs(value));
  const idx = Math.min(
    BLUE_RAMP.length - 1,
    Math.floor(abs * BLUE_RAMP.length),
  );
  return BLUE_RAMP[idx];
}

function cellColor(value) {
  // Text contrast against the cell background — switch to white once
  // the blue is dark enough for legibility.
  if (value == null) return "var(--ink-400)";
  const abs = Math.min(1, Math.abs(value));
  return abs >= 0.55 ? "var(--canvas)" : "var(--ink-900)";
}

export default function CorrelationMatrix({ matrix, tickers }) {
  return (
    <div className="card corr-card">
      <h2 className="corr-title">Correlation Matrix</h2>
      <div className="corr-table-wrap">
        <table className="corr-table">
          <thead>
            <tr>
              <th aria-hidden="true"></th>
              {tickers.map((t) => (
                <th key={t} className="corr-th">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((row) => (
              <tr key={row}>
                <th scope="row" className="corr-th-row">{row}</th>
                {tickers.map((col) => {
                  const val = matrix[row]?.[col] ?? null;
                  return (
                    <td
                      key={col}
                      className="corr-cell"
                      style={{
                        backgroundColor: cellBackground(val),
                        color: cellColor(val),
                      }}
                    >
                      {val != null ? val.toFixed(2) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
