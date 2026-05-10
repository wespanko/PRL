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
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#1F2937", fontWeight: 600 }}
            width={52}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v, name) => [`${v}%`, name]}
            contentStyle={{
              fontSize: 12,
              padding: "8px 12px",
              border: "1px solid rgba(17, 24, 39, 0.08)",
              borderRadius: 8,
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(17, 24, 39, 0.08)",
            }}
            cursor={{ fill: "rgba(17, 24, 39, 0.04)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {/* §5 charts: primary --blue-700, secondary --blue-300.
              Weight is the secondary (informational); risk is the
              primary (the metric that matters). */}
          <Bar dataKey="Capital Weight" fill="#6B8CAE" radius={[0, 2, 2, 0]} />
          <Bar dataKey="Risk Contribution" fill="#1E3A5F" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
