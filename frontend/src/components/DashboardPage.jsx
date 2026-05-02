import DashboardCard from "./DashboardCard";
import CumulativeReturnsChart from "./CumulativeReturnsChart";
import InfoTip from "./InfoTip";
import { profileFirstName } from "../utils/profile";
import { pct, num } from "../utils/formatters";

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

export default function DashboardPage({ profile, results, payload, prevSnapshot, setActiveTab, onLearnMore }) {
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
          <button
            className="btn btn-primary dash-empty-cta-btn"
            onClick={() => setActiveTab("analyze")}
          >
            Start an analysis →
          </button>
        </div>
      </div>
    );
  }

  const tickers = results.tickers ?? [];
  const period = results.actual_period ?? results.period ?? {};

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

      <DashboardCard results={results} prevSnapshot={prevSnapshot} />

      <CumulativeReturnsChart series={results.cumulative_return_series} benchmark={results.benchmark} />

      <div className="dash-quick-stats">
        <QuickStat label="Sharpe" value={num(results.sharpe_ratio, 2)} metric="sharpe_ratio" onLearnMore={onLearnMore} />
        <QuickStat label="Volatility" value={pct(results.annualized_volatility)} metric="annualized_volatility" onLearnMore={onLearnMore} />
        <QuickStat
          label="Max Drawdown"
          value={pct(results.max_drawdown)}
          color="var(--negative)"
          metric="max_drawdown"
          onLearnMore={onLearnMore}
        />
        <QuickStat label="Beta" value={num(results.beta, 2)} metric="beta" onLearnMore={onLearnMore} />
        <QuickStat
          label="Real Diversification"
          value={results.concentration?.enp_risk != null ? `${results.concentration.enp_risk.toFixed(1)} pos` : "—"}
          metric="enp_risk"
          onLearnMore={onLearnMore}
        />
      </div>

      <div className="dash-actions">
        <button className="dash-action-card" onClick={() => setActiveTab("analyze")}>
          <span className="dash-action-icon">▷</span>
          <span className="dash-action-text">
            <span className="dash-action-title">Re-analyze</span>
            <span className="dash-action-sub">Update tickers, weights, or date range</span>
          </span>
        </button>
        <button className="dash-action-card" onClick={() => setActiveTab("simulate")}>
          <span className="dash-action-icon">◇</span>
          <span className="dash-action-text">
            <span className="dash-action-title">Simulate trades</span>
            <span className="dash-action-sub">See impact before you commit</span>
          </span>
        </button>
        <button className="dash-action-card" onClick={() => setActiveTab("improve")}>
          <span className="dash-action-icon">✦</span>
          <span className="dash-action-text">
            <span className="dash-action-title">Improve</span>
            <span className="dash-action-sub">Optimizer-driven trade ideas</span>
          </span>
        </button>
        <button className="dash-action-card" onClick={() => setActiveTab("monitor")}>
          <span className="dash-action-icon">↻</span>
          <span className="dash-action-text">
            <span className="dash-action-title">Monitor</span>
            <span className="dash-action-sub">Track drift over time</span>
          </span>
        </button>
      </div>
    </div>
  );
}
