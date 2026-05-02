import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";

export default function CumulativeReturnsChart({ series, benchmark = "SPY" }) {
  if (!series || series.length === 0) return null;

  const data = series.map((d) => ({
    date: d.date,
    portfolio: +(d.portfolio * 100).toFixed(2),
    benchmark: +(d.benchmark * 100).toFixed(2),
  }));

  const last = data[data.length - 1];
  const portfolioWon = last.portfolio > last.benchmark;
  const portfolioColor = portfolioWon ? "#34c759" : "#ff3b30";

  return (
    <div className="card">
      <div className="chart-header">
        <h2>Cumulative Return</h2>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: portfolioColor }} />
            <span className="chart-legend-label">Portfolio</span>
            <span className="chart-legend-value" style={{ color: portfolioColor }}>
              {last.portfolio > 0 ? "+" : ""}{last.portfolio.toFixed(1)}%
            </span>
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#8e8e93" }} />
            <span className="chart-legend-label">{benchmark}</span>
            <span className="chart-legend-value" style={{ color: "#8e8e93" }}>
              {last.benchmark > 0 ? "+" : ""}{last.benchmark.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            tickFormatter={(d) => d.slice(0, 7)}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            width={50}
          />
          <Tooltip
            cursor={{ stroke: "rgba(0,0,0,0.12)", strokeWidth: 1 }}
            contentStyle={{
              fontSize: 11,
              padding: "6px 10px",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
            }}
            formatter={(v, n) => [`${v > 0 ? "+" : ""}${v}%`, n === "portfolio" ? "Portfolio" : benchmark]}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#8e8e93"
            strokeWidth={1.4}
            dot={false}
            isAnimationActive={true}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke={portfolioColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
