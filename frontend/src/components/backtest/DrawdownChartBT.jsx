import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fmtPct } from "../../lib/format";

export default function DrawdownChartBT({ equity }) {
  if (!equity?.length) return null;
  let peak = equity[0].equity;
  const data = equity.map((p) => {
    if (p.equity > peak) peak = p.equity;
    return {
      date: p.date.toISOString().slice(0, 10),
      dd: peak > 0 ? p.equity / peak - 1 : 0,
    };
  });
  const everyN = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % everyN === 0).map((d) => d.date);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ddFill2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#52525b" fontSize={10} ticks={ticks} tickFormatter={(d) => d?.slice(0, 7) || ""} />
          <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => fmtPct(v, { decimals: 0 })} width={50} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}
            labelFormatter={(d) => d}
            formatter={(v) => fmtPct(v)}
          />
          <Area type="monotone" dataKey="dd" stroke="#f43f5e" strokeWidth={1.5} fill="url(#ddFill2)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
