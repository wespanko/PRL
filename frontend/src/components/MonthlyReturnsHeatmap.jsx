const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// §4: monthly returns are data context — risk colors permitted.
// rgba mirrors of --risk-green (#2D6A4F) and --risk-red (#B33A3A).
function colorForReturn(value, scale) {
  if (value == null) return "transparent";
  if (Math.abs(value) < 0.001) return "rgba(17, 24, 39, 0.04)";
  const intensity = Math.min(1, Math.abs(value) / scale);
  if (value > 0) {
    const a = 0.12 + intensity * 0.55;
    return `rgba(45, 106, 79, ${a.toFixed(3)})`;
  }
  const a = 0.12 + intensity * 0.55;
  return `rgba(179, 58, 58, ${a.toFixed(3)})`;
}

function textColor(value, scale) {
  if (value == null) return "transparent";
  const intensity = Math.min(1, Math.abs(value) / scale);
  if (intensity > 0.45) return "var(--canvas)";
  return value > 0 ? "var(--risk-green)" : "var(--risk-red)";
}

export default function MonthlyReturnsHeatmap({ monthlyReturns }) {
  if (!monthlyReturns || monthlyReturns.length === 0) return null;

  const byYear = new Map();
  for (const r of monthlyReturns) {
    if (!byYear.has(r.year)) byYear.set(r.year, new Array(12).fill(null));
    byYear.get(r.year)[r.month - 1] = r.value;
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const allValues = monthlyReturns.map((r) => r.value).filter((v) => v != null);
  const scale = Math.max(0.04, ...allValues.map(Math.abs)) * 0.9;

  const yearTotals = years.map((y) => {
    const months = byYear.get(y);
    const compounded = months.reduce(
      (acc, m) => (m == null ? acc : acc * (1 + m)),
      1.0
    );
    return compounded - 1.0;
  });

  return (
    <div className="card">
      <div className="chart-header">
        <h2>Monthly Returns</h2>
        <div className="chart-meta">
          <span className="heatmap-legend">
            <span className="heatmap-legend-cell" style={{ background: colorForReturn(-scale, scale) }} />
            <span className="heatmap-legend-cell" style={{ background: colorForReturn(-scale * 0.4, scale) }} />
            <span className="heatmap-legend-cell" style={{ background: "rgba(17, 24, 39, 0.04)" }} />
            <span className="heatmap-legend-cell" style={{ background: colorForReturn(scale * 0.4, scale) }} />
            <span className="heatmap-legend-cell" style={{ background: colorForReturn(scale, scale) }} />
            <span className="heatmap-legend-label">−{(scale * 100).toFixed(0)}% to +{(scale * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>

      <div className="heatmap-table-wrap">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-year-col">Year</th>
              {MONTH_LABELS.map((m) => <th key={m} className="heatmap-month-col">{m}</th>)}
              <th className="heatmap-total-col">YTD</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y, idx) => {
              const months = byYear.get(y);
              const total = yearTotals[idx];
              return (
                <tr key={y}>
                  <td className="heatmap-year-col">{y}</td>
                  {months.map((value, m) => (
                    <td
                      key={m}
                      className="heatmap-cell"
                      style={{
                        background: colorForReturn(value, scale),
                        color: textColor(value, scale),
                      }}
                      title={value != null ? `${y}-${String(m + 1).padStart(2, "0")}: ${(value * 100).toFixed(2)}%` : ""}
                    >
                      {value != null ? `${(value * 100).toFixed(1)}` : ""}
                    </td>
                  ))}
                  <td
                    className="heatmap-cell heatmap-total-col"
                    style={{
                      background: colorForReturn(total, scale * 4),
                      color: textColor(total, scale * 4),
                      fontWeight: 700,
                    }}
                  >
                    {total != null ? `${total > 0 ? "+" : ""}${(total * 100).toFixed(1)}%` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
