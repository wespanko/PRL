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

function Sparkline({ points, positive }) {
  if (!points || points.length < 2) return null;
  const w = 140;
  const h = 38;
  const pad = 1.5;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const xy = points.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y];
  });
  const d = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  const stroke = positive ? "var(--positive)" : "var(--negative)";
  const fillId = positive ? "spark-fill-pos" : "spark-fill-neg";
  const areaD = `${d} L${last[0].toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="dash-spark">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={stroke} />
    </svg>
  );
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
  const series = results.cumulative_return_series ?? [];
  const last = series.length ? series[series.length - 1] : null;
  const periodReturn = last && Number.isFinite(last.portfolio) ? last.portfolio : null;
  const benchDelta = last && Number.isFinite(last.portfolio) && Number.isFinite(last.benchmark)
    ? last.portfolio - last.benchmark
    : null;
  const sparkPoints = series.length >= 2 ? series.map((d) => d.portfolio) : null;
  const benchmarkLabel = results.benchmark ?? "SPY";

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
          <div className="dash-portfolio-value-main">
            <div className="dash-portfolio-value-label">Portfolio value</div>
            <div className="dash-portfolio-value-amount">{fmtMoney(totalValue)}</div>
            {periodReturn != null && (
              <div className="dash-portfolio-value-deltas">
                <span className={`dash-portfolio-value-delta ${periodReturn >= 0 ? "is-pos" : "is-neg"}`}>
                  {periodReturn >= 0 ? "▲" : "▼"} {periodReturn >= 0 ? "+" : ""}{(periodReturn * 100).toFixed(2)}%
                </span>
                {benchDelta != null && (
                  <span className={`dash-portfolio-value-vs ${benchDelta >= 0 ? "is-pos" : "is-neg"}`}>
                    {benchDelta >= 0 ? "+" : ""}{(benchDelta * 100).toFixed(1)}% vs {benchmarkLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {sparkPoints && (
            <div className="dash-portfolio-value-spark-wrap">
              <Sparkline points={sparkPoints} positive={(periodReturn ?? 0) >= 0} />
            </div>
          )}
          <div className="dash-portfolio-value-stats">
            <div className="dash-mini-stat">
              <div className="dash-mini-stat-label">Worst drawdown</div>
              <div className="dash-mini-stat-value is-neg">
                {fmtMoneySigned(totalValue * (results.max_drawdown ?? 0))}
              </div>
            </div>
            <div className="dash-mini-stat">
              <div className="dash-mini-stat-label">VaR 95%</div>
              <div className="dash-mini-stat-value is-neg">
                {fmtMoneySigned(totalValue * (results.var_95 ?? 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardCard results={results} prevSnapshot={prevSnapshot} />

      <CumulativeReturnsChart series={results.cumulative_return_series} benchmark={results.benchmark} />

      <button
        className="dash-deepdive-link"
        onClick={() => setActiveTab("analyze")}
      >
        <span className="dash-deepdive-text">See full breakdown</span>
        <span className="dash-deepdive-sub">DNA · risk contributions · stress tests · correlations</span>
        <span className="dash-deepdive-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  );
}
