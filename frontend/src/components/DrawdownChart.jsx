import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fmtMoney } from "../lib/format";

export default function DrawdownChart({ dd, ddStats }) {
  if (!dd.length) return null;
  const data = dd.map((p) => ({ i: p.i, dd: p.dd }));
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Drawdown</div>
          <div className="mt-1 text-sm text-zinc-400">Distance from peak equity, per trade.</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Max drawdown</div>
          <div className="text-lg font-semibold text-rose-400 tabular-nums">
            {fmtMoney(ddStats.maxDrawdown)}
          </div>
        </div>
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" stroke="#52525b" fontSize={11} />
            <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => fmtMoney(v, { decimals: 0 })} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => `Trade #${v}`}
              formatter={(v) => fmtMoney(v)}
            />
            <Area type="monotone" dataKey="dd" stroke="#f43f5e" strokeWidth={1.5} fill="url(#ddFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
