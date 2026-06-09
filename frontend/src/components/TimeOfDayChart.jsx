import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { fmtMoney } from "../lib/format";

export default function TimeOfDayChart({ time }) {
  if (!time || !time.available) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Time of day</div>
        <div className="mt-3 text-sm text-zinc-400">
          Time analysis unavailable because your CSV does not include timestamps.
        </div>
      </div>
    );
  }

  const data = time.byHour
    .filter((h) => h.count > 0)
    .map((h) => ({ hour: `${h.hour}:00`, pnl: Math.round(h.pnl * 100) / 100 }));

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Time of day</div>
          <div className="mt-1 text-sm text-zinc-400">Net P&L per hour (local time of your data).</div>
        </div>
        {time.bestHour && time.worstHour && (
          <div className="text-right text-xs text-zinc-500">
            Best: <span className="text-emerald-400">{time.bestHour.hour}:00</span> ·
            Worst: <span className="text-rose-400 ml-1">{time.worstHour.hour}:00</span>
          </div>
        )}
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
            <XAxis dataKey="hour" stroke="#52525b" fontSize={11} />
            <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => fmtMoney(v, { decimals: 0 })} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => fmtMoney(v)}
            />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <Bar dataKey="pnl">
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "#34d399" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {time.bySession.map((s) => (
          <div key={s.key} className="rounded-lg border border-zinc-900 bg-zinc-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</div>
            <div className={`mt-1 text-sm font-semibold tabular-nums ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {fmtMoney(s.pnl)}
            </div>
            <div className="text-xs text-zinc-500">{s.count} trades</div>
          </div>
        ))}
      </div>
    </div>
  );
}
