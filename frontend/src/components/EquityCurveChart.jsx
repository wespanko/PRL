import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtMoney } from "../lib/format";

export default function EquityCurveChart({ curve }) {
  if (!curve.length) return null;
  const data = curve.map((p) => ({ i: p.i, equity: p.equity }));
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="text-xs uppercase tracking-wider text-zinc-500">Equity curve</div>
      <div className="mt-1 text-sm text-zinc-400">Cumulative net P&L trade by trade.</div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
            <XAxis dataKey="i" stroke="#52525b" fontSize={11} />
            <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => fmtMoney(v, { decimals: 0 })} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => `Trade #${v}`}
              formatter={(v) => fmtMoney(v)}
            />
            <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="equity" stroke="#34d399" strokeWidth={1.75} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
