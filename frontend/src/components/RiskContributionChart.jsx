import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function RiskContributionChart({ contributions }) {
  if (!contributions || contributions.length === 0) return null;

  const data = contributions.map((c) => ({
    name: c.ticker,
    "Capital Weight": parseFloat((c.weight * 100).toFixed(1)),
    "Risk Contribution": parseFloat((c.pct_risk * 100).toFixed(1)),
  }));

  const chartHeight = Math.max(160, contributions.length * 58);

  return (
    <div className="card">
      <h2>Risk Contribution by Holding</h2>
      <p className="chart-caption">
        Which position is actually driving portfolio volatility? A 20% weight can contribute 50% of total risk.
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 0, left: 8 }}
          barGap={3}
          barCategoryGap="30%"
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, "auto"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
            width={52}
          />
          <Tooltip
            formatter={(v, name) => [`${v}%`, name]}
            contentStyle={{ fontSize: 12 }}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Capital Weight" fill="#93c5fd" radius={[0, 3, 3, 0]} />
          <Bar dataKey="Risk Contribution" fill="#dc2626" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
