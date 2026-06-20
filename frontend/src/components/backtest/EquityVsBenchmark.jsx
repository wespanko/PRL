import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { fmtMoney } from "../../lib/format";

export default function EquityVsBenchmark({ equity, benchmark, startingCash }) {
  if (!equity?.length) return null;

  // Merge by date for the chart
  const benchMap = new Map(benchmark.map((b) => [b.date.toISOString().slice(0, 10), b.equity]));
  const data = equity.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    equity: Math.round(e.equity),
    benchmark: Math.round(benchMap.get(e.date.toISOString().slice(0, 10)) ?? startingCash),
  }));

  // Sparse ticks
  const everyN = Math.max(1, Math.floor(data.length / 6));
  const tickIndexes = data.map((_, i) => i).filter((i) => i % everyN === 0);
  const ticks = tickIndexes.map((i) => data[i].date);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={10}
            ticks={ticks}
            tickFormatter={(d) => d?.slice(0, 7) || ""}
          />
          <YAxis
            stroke="#52525b"
            fontSize={10}
            tickFormatter={(v) => fmtMoney(v, { decimals: 0 })}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}
            labelFormatter={(d) => d}
            formatter={(v, name) => [fmtMoney(v), name === "equity" ? "Strategy" : "Buy & Hold"]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }} />
          <ReferenceLine y={startingCash} stroke="#3f3f46" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="benchmark" stroke="#71717a" strokeWidth={1.25} dot={false} name="Buy & Hold" />
          <Line type="monotone" dataKey="equity" stroke="#fbbf24" strokeWidth={1.75} dot={false} name="Strategy" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
