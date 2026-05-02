function cellBackground(value) {
  if (value == null) return "transparent";
  // positive correlation → blue tint, negative → red tint, 1.0 → solid color
  const intensity = Math.round(Math.abs(value) * 160);
  return value >= 0
    ? `rgb(${255 - intensity}, ${255 - intensity}, 255)`
    : `rgb(255, ${255 - intensity}, ${255 - intensity})`;
}

export default function CorrelationMatrix({ matrix, tickers }) {
  return (
    <div className="card">
      <h2>Correlation Matrix</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            {tickers.map((t) => (
              <th key={t} style={{ textAlign: "center" }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((row) => (
            <tr key={row}>
              <td style={{ fontWeight: 600, color: "#6b7280", fontSize: 11, textTransform: "uppercase" }}>
                {row}
              </td>
              {tickers.map((col) => {
                const val = matrix[row]?.[col] ?? null;
                return (
                  <td
                    key={col}
                    style={{
                      textAlign: "center",
                      backgroundColor: cellBackground(val),
                      fontWeight: row === col ? 600 : 400,
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
  );
}
