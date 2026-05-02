import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

export default function DrawdownChart({ series }) {
  if (!series || series.length === 0) return null;
  const data = series.map((d) => ({
    date: d.date,
    value: parseFloat((d.value * 100).toFixed(2)),
  }));

  return (
    <div className="card">
      <h2>Drawdown Over Time</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(d) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
            domain={["auto", 0]}
          />
          <Tooltip
            formatter={(v) => [`${v}%`, "Drawdown"]}
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#dc2626"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
