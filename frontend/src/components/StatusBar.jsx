import { useState, useEffect } from "react";

function getMarketSession(now) {
  // US equity hours: 09:30–16:00 ET. Browser local time used as-is for display;
  // we use UTC offset of America/New_York for the gate. Crude but works for an indicator.
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay(); // 0=Sun
  if (day === 0 || day === 6) return { state: "closed", label: "Market closed (weekend)" };

  const minutes = ny.getHours() * 60 + ny.getMinutes();
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const preStart = 4 * 60;
  const afterEnd = 20 * 60;

  if (minutes < preStart || minutes >= afterEnd) return { state: "closed", label: "Market closed" };
  if (minutes < open) return { state: "pre", label: "Pre-market" };
  if (minutes < close) return { state: "open", label: "Market open" };
  return { state: "after", label: "After-hours" };
}

function pctSigned(v) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

export default function StatusBar({ results, payload }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const session = getMarketSession(now);
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });

  const tickers = results?.tickers ?? [];
  const tickerLine = tickers.length > 0
    ? tickers.slice(0, 6).join(" · ")
    : "No portfolio loaded";

  return (
    <div className="status-bar">
      <div className="status-bar-section status-bar-left">
        <span className={`status-dot status-dot--${session.state}`} aria-hidden="true" />
        <span className="status-bar-label">{session.label}</span>
        <span className="status-bar-divider" />
        <span className="status-bar-mono">{time} ET</span>
      </div>

      <div className="status-bar-section status-bar-center">
        <span className="status-bar-label-muted">PORTFOLIO</span>
        <span className="status-bar-mono">{tickerLine}</span>
      </div>

      <div className="status-bar-section status-bar-right">
        {results ? (
          <>
            <span className="status-bar-stat">
              <span className="status-bar-stat-label">SHARPE</span>
              <span className="status-bar-mono">{Number(results.sharpe_ratio).toFixed(2)}</span>
            </span>
            <span className="status-bar-stat">
              <span className="status-bar-stat-label">VOL</span>
              <span className="status-bar-mono">{pctSigned(results.annualized_volatility)}</span>
            </span>
            <span className="status-bar-stat">
              <span className="status-bar-stat-label">β</span>
              <span className="status-bar-mono">{Number(results.beta).toFixed(2)}</span>
            </span>
            <span className="status-bar-stat">
              <span className="status-bar-stat-label">DD</span>
              <span className="status-bar-mono status-bar-mono--neg">{pctSigned(results.max_drawdown)}</span>
            </span>
          </>
        ) : (
          <span className="status-bar-label-muted">RUN ANALYSIS TO POPULATE</span>
        )}
      </div>
    </div>
  );
}
