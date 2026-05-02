export default function ExposuresCard({ exposures }) {
  if (!exposures) return null;
  const { themes, sectors, classified_tickers } = exposures;

  const topThemes = Object.entries(themes).filter(([, w]) => w > 0.01).slice(0, 6);
  const topSectors = Object.entries(sectors).filter(([, w]) => w > 0.01).slice(0, 6);

  return (
    <div className="card">
      <h2>Theme &amp; Sector Exposure</h2>
      <div className="exposures-grid">
        <div>
          <div className="exposures-header">Themes</div>
          <div className="exposure-bars">
            {topThemes.map(([name, weight]) => (
              <div key={name} className="exposure-row">
                <div className="exposure-label">{name}</div>
                <div className="exposure-track">
                  <div className="exposure-fill" style={{ width: `${Math.min(weight * 100, 100)}%` }} />
                </div>
                <div className="exposure-pct">{(weight * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="exposures-header">Sectors</div>
          <div className="exposure-bars">
            {topSectors.map(([name, weight]) => (
              <div key={name} className="exposure-row">
                <div className="exposure-label">{name}</div>
                <div className="exposure-track">
                  <div className="exposure-fill exposure-fill--sector"
                    style={{ width: `${Math.min(weight * 100, 100)}%` }} />
                </div>
                <div className="exposure-pct">{(weight * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {classified_tickers && (
        <div style={{ marginTop: 20 }}>
          <div className="exposures-header">Holdings Classification</div>
          <table className="data-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Theme</th>
                <th>Sector</th>
                <th style={{ color: "#9ca3af", fontWeight: 400 }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(classified_tickers).map(([ticker, info]) => (
                <tr key={ticker}>
                  <td style={{ fontWeight: 700 }}>{ticker}</td>
                  <td style={{ color: "#2563eb" }}>{info.theme}</td>
                  <td style={{ color: "#6b7280" }}>{info.sector}</td>
                  <td style={{ color: "#9ca3af", fontSize: 12 }}>{info.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
