import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { pct, num } from "../utils/formatters";

// §5: chart series colors come from the brief palette only. Brand-led
// metric (health) is --blue-700; risk-context metrics (volatility,
// drawdown) get --risk-amber / --risk-red; positive-direction metric
// (diversification) gets --risk-green. All from §2 tokens.
const METRICS = [
  {
    key: "health",
    label: "Portfolio Health",
    fmt: (v) => `${v.toFixed(1)}/10`,
    pick: (s) => s.results.risk_score != null ? +(10 - s.results.risk_score).toFixed(1) : null,
    domain: [0, 10],
    color: "#1E3A5F",        // --blue-700
    higherBetter: true,
  },
  {
    key: "volatility",
    label: "Volatility",
    fmt: (v) => pct(v / 100, 1),
    pick: (s) => s.results.annualized_volatility != null ? +(s.results.annualized_volatility * 100).toFixed(2) : null,
    color: "#C68A1A",        // --risk-amber
    higherBetter: false,
  },
  {
    key: "drawdown",
    label: "Max Drawdown",
    fmt: (v) => pct(v / 100, 1),
    pick: (s) => s.results.max_drawdown != null ? +(s.results.max_drawdown * 100).toFixed(2) : null,
    color: "#B33A3A",        // --risk-red
    higherBetter: true, // closer to 0 is better
  },
  {
    key: "enp",
    label: "Real Diversification",
    fmt: (v) => `${v.toFixed(1)} pos`,
    pick: (s) => s.results.concentration?.enp_risk != null ? +s.results.concentration.enp_risk.toFixed(2) : null,
    color: "#2D6A4F",        // --risk-green
    higherBetter: true,
  },
];

function shortDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByPortfolio(snaps) {
  const groups = {};
  for (const s of snaps) {
    const fp = s.fingerprint || "unknown";
    if (!groups[fp]) groups[fp] = { fingerprint: fp, tickers: s.results.tickers ?? [], snaps: [] };
    groups[fp].snaps.push(s);
  }
  return Object.values(groups)
    .map((g) => ({ ...g, snaps: [...g.snaps].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) }))
    .sort((a, b) => b.snaps.length - a.snaps.length);
}

function Sparkline({ metric, data }) {
  const values = data.map((d) => d.value).filter((v) => v != null);
  if (values.length < 2) {
    return (
      <div className="timeline-spark timeline-spark--empty">
        <div className="timeline-spark-label">{metric.label}</div>
        <div className="timeline-spark-empty">Need 2+ snapshots</div>
      </div>
    );
  }

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const better = metric.higherBetter ? delta > 0 : delta < 0;
  const small = Math.abs(delta) < 0.001 * Math.max(Math.abs(first), 1);
  const deltaColor = small ? "var(--ink-400)" : better ? "var(--risk-green)" : "var(--risk-red)";
  const deltaPrefix = small ? "" : delta > 0 ? "+" : "";

  return (
    <div className="timeline-spark">
      <div className="timeline-spark-header">
        <div className="timeline-spark-label">{metric.label}</div>
        <div className="timeline-spark-current" style={{ color: metric.color }}>
          {metric.fmt(last)}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={56}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={metric.domain ?? ["auto", "auto"]} />
          <XAxis dataKey="label" hide />
          <Tooltip
            cursor={{ stroke: "rgba(0,0,0,0.1)", strokeWidth: 1 }}
            formatter={(v) => [metric.fmt(v), metric.label]}
            labelFormatter={(l) => l}
            contentStyle={{ fontSize: 11, padding: "6px 8px", border: "0.5px solid rgba(0,0,0,0.13)", borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={metric.color}
            strokeWidth={1.8}
            dot={{ r: 2, strokeWidth: 0, fill: metric.color }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="timeline-spark-footer">
        <span className="timeline-spark-from">{metric.fmt(first)}</span>
        <span className="timeline-spark-delta" style={{ color: deltaColor }}>
          {small ? "stable" : `${deltaPrefix}${metric.fmt(delta)}`}
        </span>
      </div>
    </div>
  );
}

function DriftSummary({ group }) {
  const snaps = group.snaps;
  if (snaps.length < 2) return null;

  const baseline = snaps.find((s) => s.pinned) ?? snaps[0];
  const latest = snaps[snaps.length - 1];
  if (baseline.id === latest.id) return null;

  const items = METRICS.map((m) => {
    const prev = m.pick(baseline);
    const curr = m.pick(latest);
    if (prev == null || curr == null) return null;
    const delta = curr - prev;
    const small = Math.abs(delta) < 0.001 * Math.max(Math.abs(prev), 1);
    const better = m.higherBetter ? delta > 0 : delta < 0;
    return {
      label: m.label,
      prev: m.fmt(prev),
      curr: m.fmt(curr),
      severity: small ? "stable" : better ? "improved" : "worse",
    };
  }).filter(Boolean);

  const moved = items.filter((i) => i.severity !== "stable");
  const baselineLabel = baseline.pinned ? "baseline" : "first snapshot";
  const baselineDate = shortDate(baseline.timestamp);
  const latestDate = shortDate(latest.timestamp);

  return (
    <div className="timeline-drift">
      <div className="timeline-drift-headline">
        Since {baselineLabel} <span className="timeline-drift-dates">({baselineDate} → {latestDate})</span>
      </div>
      {moved.length === 0 ? (
        <div className="timeline-drift-stable">Profile is broadly stable across snapshots.</div>
      ) : (
        <div className="timeline-drift-list">
          {moved.map((i) => (
            <div key={i.label} className="timeline-drift-row">
              <span className={`timeline-drift-dot timeline-drift-dot--${i.severity}`} />
              <span className="timeline-drift-label">{i.label}</span>
              <span className="timeline-drift-prev">{i.prev}</span>
              <span className="timeline-drift-arrow">→</span>
              <span className={`timeline-drift-curr timeline-drift-curr--${i.severity}`}>{i.curr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MonitorTimeline({ snapshots }) {
  const groups = useMemo(() => groupByPortfolio(snapshots), [snapshots]);
  const [activeFp, setActiveFp] = useState(groups[0]?.fingerprint ?? null);

  if (groups.length === 0) return null;
  const active = groups.find((g) => g.fingerprint === activeFp) ?? groups[0];
  if (!active || active.snaps.length < 2) return null;

  const seriesData = METRICS.map((m) => ({
    metric: m,
    data: active.snaps.map((s) => ({
      label: shortDate(s.timestamp),
      value: m.pick(s),
    })),
  }));

  return (
    <div className="card timeline-card">
      <div className="timeline-header">
        <div>
          <div className="timeline-title">Portfolio over time</div>
          <div className="timeline-subtitle">
            {active.snaps.length} snapshots · {active.tickers.slice(0, 5).join(" · ")}
            {active.tickers.length > 5 && ` +${active.tickers.length - 5}`}
          </div>
        </div>
        {groups.length > 1 && (
          <div className="timeline-portfolio-pills">
            {groups.map((g) => (
              <button
                key={g.fingerprint}
                className={`timeline-pill ${g.fingerprint === active.fingerprint ? "timeline-pill--active" : ""}`}
                onClick={() => setActiveFp(g.fingerprint)}
                title={g.tickers.join(", ")}
              >
                {g.tickers.slice(0, 3).join("·")}
                {g.tickers.length > 3 && "…"}
                <span className="timeline-pill-count">{g.snaps.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <DriftSummary group={active} />

      <div className="timeline-grid">
        {seriesData.map(({ metric, data }) => (
          <Sparkline key={metric.key} metric={metric} data={data} />
        ))}
      </div>
    </div>
  );
}
