import DashboardCard from "./DashboardCard";
import CumulativeReturnsChart from "./CumulativeReturnsChart";
import InfoTip from "./InfoTip";
import { profileFirstName } from "../utils/profile";
import { pct, num } from "../utils/formatters";

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n).toLocaleString("en-US")}`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtMoneySigned(n) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  return sign + fmtMoney(Math.abs(n));
}

function QuickStat({ label, value, color, metric, onLearnMore }) {
  return (
    <div className="dash-quick-stat">
      <div className="dash-quick-stat-label">
        {label}
        {metric && <InfoTip metric={metric} onLearnMore={onLearnMore} />}
      </div>
      <div className="dash-quick-stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage({ profile, results, payload, prevSnapshot, setActiveTab, onLearnMore, onRunDemo, loading }) {
  const greeting = `Welcome back, ${profileFirstName(profile.name)}`;
  const hasResults = !!results;

  if (!hasResults) {
    return (
      <div className="container">
        <div className="dash-greeting">
          <h1 className="dash-greeting-headline">{greeting}.</h1>
          <p className="dash-greeting-sub">
            Let's start with an analysis — enter your holdings and we'll handle the math.
          </p>
        </div>

        <div className="empty-state dash-empty-cta">
          <div className="empty-state-icon">▷</div>
          <div className="empty-state-title">No analysis yet</div>
          <div className="empty-state-body">
            Add your tickers and weights, pick a date range, and Panko will compute the
            full risk profile in seconds.
          </div>
          <div className="dash-empty-cta-actions">
            {onRunDemo && (
              <button
                className="btn btn-primary dash-empty-cta-btn"
                onClick={onRunDemo}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Loading example…</> : "Try with example portfolio →"}
              </button>
            )}
            <button
              className="btn btn-secondary dash-empty-cta-btn"
              onClick={() => setActiveTab("analyze")}
              disabled={loading}
            >
              Or enter your own
            </button>
          </div>
          <div className="dash-empty-cta-note">
            The example is a tech-tilted balanced mix (NVDA, MSFT, AAPL, SPY, TLT, GLD…).
            Useful for seeing what every screen looks like with real numbers.
          </div>
        </div>
      </div>
    );
  }

  const tickers = results.tickers ?? [];
  const period = results.actual_period ?? results.period ?? {};
  const totalValue = results.total_value;

  return (
    <div className="container">
      <div className="dash-greeting">
        <h1 className="dash-greeting-headline">{greeting}.</h1>
        <p className="dash-greeting-sub">
          {tickers.slice(0, 5).join(" · ")}
          {tickers.length > 5 && ` +${tickers.length - 5}`}
          {" · "}
          {period.start} → {period.end}
        </p>
      </div>

      {totalValue != null && totalValue > 0 && (
        <div className="dash-portfolio-value">
          <div className="dash-portfolio-value-label">Portfolio value</div>
          <div className="dash-portfolio-value-amount">{fmtMoney(totalValue)}</div>
          <div className="dash-portfolio-value-stress">
            <span className="dash-portfolio-value-stress-item">
              <span className="dash-portfolio-value-stress-label">Worst observed drawdown</span>
              <span className="dash-portfolio-value-stress-value" style={{ color: "var(--negative)" }}>
                {fmtMoneySigned(totalValue * (results.max_drawdown ?? 0))}
              </span>
            </span>
            <span className="dash-portfolio-value-stress-item">
              <span className="dash-portfolio-value-stress-label">VaR 95% (typical bad month)</span>
              <span className="dash-portfolio-value-stress-value" style={{ color: "var(--negative)" }}>
                {fmtMoneySigned(totalValue * (results.var_95 ?? 0))}
              </span>
            </span>
          </div>
        </div>
      )}

      <DashboardCard results={results} prevSnapshot={prevSnapshot} />

      <CumulativeReturnsChart series={results.cumulative_return_series} benchmark={results.benchmark} />

      <button
        className="dash-deepdive-link"
        onClick={() => setActiveTab("analyze")}
      >
        See full breakdown — DNA, risk contributions, stress tests, correlations →
      </button>
    </div>
  );
}
