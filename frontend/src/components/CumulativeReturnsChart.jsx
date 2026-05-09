import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

export default function CumulativeReturnsChart({ series, benchmark = "SPY" }) {
  if (!series || series.length === 0) return null;

  const data = series.map((d) => ({
    date: d.date,
    portfolio: +(d.portfolio * 100).toFixed(2),
    benchmark: +(d.benchmark * 100).toFixed(2),
  }));

  const last = data[data.length - 1];
  const positive = last.portfolio >= 0;
  const portfolioColor = positive ? "#10b981" : "#ef4444";
  const delta = last.portfolio - last.benchmark;

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-header-titles">
          <h2 className="chart-title">Cumulative return</h2>
          <div className="chart-subtitle">Portfolio vs {benchmark} over the selected period</div>
        </div>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: portfolioColor }} />
            <span className="chart-legend-label">Portfolio</span>
            <span className="chart-legend-value" style={{ color: portfolioColor }}>
              {last.portfolio > 0 ? "+" : ""}{last.portfolio.toFixed(1)}%
            </span>
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#9ca3af" }} />
            <span className="chart-legend-label">{benchmark}</span>
            <span className="chart-legend-value" style={{ color: "var(--label-2)" }}>
              {last.benchmark > 0 ? "+" : ""}{last.benchmark.toFixed(1)}%
            </span>
          </span>
          <span className={`chart-legend-delta ${delta >= 0 ? "is-pos" : "is-neg"}`}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs benchmark
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="portfolio-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={portfolioColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={portfolioColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10.5, fill: "#9ca3af" }}
            tickFormatter={(d) => d.slice(0, 7)}
            interval="preserveStartEnd"
            minTickGap={56}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            width={48}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "rgba(17, 24, 39, 0.16)", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              fontSize: 12,
              padding: "8px 12px",
              border: "1px solid rgba(17, 24, 39, 0.08)",
              borderRadius: 10,
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(17, 24, 39, 0.08)",
            }}
            labelStyle={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}
            formatter={(v, n) => [`${v > 0 ? "+" : ""}${v}%`, n === "portfolio" ? "Portfolio" : benchmark]}
          />
          <ReferenceLine y={0} stroke="rgba(17, 24, 39, 0.08)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke={portfolioColor}
            strokeWidth={2.2}
            fill="url(#portfolio-area)"
            dot={false}
            isAnimationActive={true}
            animationDuration={650}
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={true}
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
