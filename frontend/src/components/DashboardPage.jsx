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

function HeroChart({ points, positive }) {
  if (!points || points.length < 2) return null;
  const w = 1000;
  const h = 140;
  const pad = 0;
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
  const stroke = positive ? "#22d3a3" : "#ff5d52";
  const fillId = positive ? "hero-fill-pos" : "hero-fill-neg";
  const areaD = `${d} L${last[0].toFixed(1)} ${h} L${pad} ${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="dash-hero-chart">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={stroke} />
      <circle cx={last[0]} cy={last[1]} r="8" fill={stroke} fillOpacity="0.25" />
    </svg>
  );
}

function ScoreRing({ score, color }) {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dash-score-ring">
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
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

  const positive = (periodReturn ?? 0) >= 0;

  return (
    <div className="dash-page">
      <div className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-greeting">{greeting}</div>
          <div className="dash-hero-tickers">
            {tickers.slice(0, 6).join(" · ")}
            {tickers.length > 6 && ` +${tickers.length - 6}`}
            <span className="dash-hero-tickers-sep">·</span>
            {period.start} → {period.end}
          </div>

          {totalValue != null && totalValue > 0 && (
            <>
              <div className="dash-hero-amount-row">
                <div className="dash-hero-amount">{fmtMoney(totalValue)}</div>
                {periodReturn != null && (
                  <div className={`dash-hero-delta ${positive ? "is-pos" : "is-neg"}`}>
                    <span className="dash-hero-delta-arrow">{positive ? "▲" : "▼"}</span>
                    <span className="dash-hero-delta-pct">
                      {positive ? "+" : ""}{(periodReturn * 100).toFixed(2)}%
                    </span>
                    {benchDelta != null && (
                      <span className="dash-hero-delta-vs">
                        {benchDelta >= 0 ? "+" : ""}{(benchDelta * 100).toFixed(1)}% vs {benchmarkLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="dash-hero-period-row">
                <div className="dash-hero-period-tabs" role="tablist">
                  {["1W", "1M", "3M", "1Y", "5Y", "ALL"].map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      className={`dash-hero-period-tab ${i === 5 ? "is-active" : ""}`}
                      onClick={() => setActiveTab && setActiveTab("analyze")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {sparkPoints && (
          <div className="dash-hero-chart-wrap">
            <HeroChart points={sparkPoints} positive={positive} />
          </div>
        )}
      </div>

      <div className="container dash-body">
        {totalValue != null && totalValue > 0 && (
          <div className="dash-stat-strip">
            <div className="dash-stat-strip-item">
              <div className="dash-stat-strip-label">Worst drawdown</div>
              <div className="dash-stat-strip-value is-neg">
                {fmtMoneySigned(totalValue * (results.max_drawdown ?? 0))}
              </div>
              <div className="dash-stat-strip-sub">{((results.max_drawdown ?? 0) * 100).toFixed(1)}%</div>
            </div>
            <div className="dash-stat-strip-item">
              <div className="dash-stat-strip-label">VaR 95%</div>
              <div className="dash-stat-strip-value is-neg">
                {fmtMoneySigned(totalValue * (results.var_95 ?? 0))}
              </div>
              <div className="dash-stat-strip-sub">monthly · 95% confidence</div>
            </div>
            <div className="dash-stat-strip-item">
              <div className="dash-stat-strip-label">Volatility</div>
              <div className="dash-stat-strip-value">
                {results.annualized_volatility != null ? `${(results.annualized_volatility * 100).toFixed(1)}%` : "—"}
              </div>
              <div className="dash-stat-strip-sub">annualized</div>
            </div>
            <div className="dash-stat-strip-item">
              <div className="dash-stat-strip-label">Sharpe</div>
              <div className="dash-stat-strip-value">
                {results.sharpe_ratio != null ? results.sharpe_ratio.toFixed(2) : "—"}
              </div>
              <div className="dash-stat-strip-sub">return per unit of risk</div>
            </div>
          </div>
        )}

        <DashboardCard results={results} prevSnapshot={prevSnapshot} ScoreRing={ScoreRing} />

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
    </div>
  );
}
