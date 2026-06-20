import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import Panel from "../layout/Panel";
import { bootstrapTradeReturns } from "../../lib/monteCarlo";
import { fmtMoney, fmtPct } from "../../lib/format";
import InfoTip from "../common/InfoTip";

export default function MonteCarloPanel({ result, runs = 500 }) {
  const mc = useMemo(() => {
    if (!result?.trades?.length) return null;
    return bootstrapTradeReturns(result.trades, { runs, startingCash: result.startingCash });
  }, [result, runs]);

  if (!mc) {
    return (
      <Panel title="MONTE CARLO" sub="Bootstrap of trade returns.">
        <div className="text-[12px] text-zinc-500">Need at least one trade to run Monte Carlo.</div>
      </Panel>
    );
  }

  // Prep trajectories for chart — sample 50 paths, normalize to indexed array
  const trajData = useMemo(() => {
    const sample = mc.trajectories.slice(0, 60);
    const maxLen = Math.max(...sample.map((p) => p.length));
    const data = [];
    for (let i = 0; i < maxLen; i++) {
      const row = { i };
      sample.forEach((p, idx) => {
        if (p[i] !== undefined) row[`p${idx}`] = p[i];
      });
      data.push(row);
    }
    return { data, count: sample.length };
  }, [mc]);

  return (
    <Panel
      title="MONTE CARLO · BOOTSTRAP"
      sub={`${mc.runs} runs · ${mc.sampleSize} resampled trades per run`}
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajData.data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="i" stroke="#52525b" fontSize={10} />
                <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => fmtMoney(v, { decimals: 0 })} width={70} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}
                  formatter={(v) => fmtMoney(v)}
                  labelFormatter={(v) => `Trade ${v}`}
                />
                {Array.from({ length: trajData.count }, (_, i) => (
                  <Line key={i} type="monotone" dataKey={`p${i}`} stroke="#fbbf24" strokeOpacity={0.15} strokeWidth={1} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2 text-center">
            60 sampled equity paths · trade returns resampled with replacement
          </div>
        </div>

        <div className="space-y-2 font-mono text-[11px]">
          <Row label={<InfoTip text="The result you actually got."><span>REALIZED END P&L</span></InfoTip>} value={fmtMoney(mc.realizedEnd, { sign: true })} tone={mc.realizedEnd > 0 ? "text-emerald-400" : "text-rose-400"} />
          <Row label="MEDIAN END P&L" value={fmtMoney(mc.median, { sign: true })} />
          <Row label="95% RANGE" value={`${fmtMoney(mc.p5)} → ${fmtMoney(mc.p95)}`} />
          <Row label="50% RANGE" value={`${fmtMoney(mc.p25)} → ${fmtMoney(mc.p75)}`} />
          <Row label={<InfoTip text="Probability a randomly-ordered version of your trades ends profitable."><span>PROFITABLE PATHS</span></InfoTip>} value={fmtPct(mc.profitableRate, { decimals: 0 })} tone={mc.profitableRate > 0.7 ? "text-emerald-400" : mc.profitableRate > 0.5 ? "text-amber-400" : "text-rose-400"} />
          <Row label="MEDIAN MAX DD" value={fmtMoney(mc.medianMaxDD)} tone="text-rose-400" />
          <Row label="5th %ILE MAX DD" value={fmtMoney(mc.p5MaxDD)} tone="text-rose-400" />
        </div>
      </div>

      <p className="mt-4 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500 leading-relaxed">
        <span className="text-zinc-400">How to read this:</span> we bootstrap your trade returns into {mc.runs} random orderings to estimate the
        distribution of outcomes you could have plausibly seen. If your realized end falls near the median, the result is typical.
        Near the 95th percentile, you got lucky. Caveat: bootstrap assumes trades are independent — in trending markets they aren't, and
        MC tends to understate real drawdown risk.
      </p>
    </Panel>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex justify-between border-b border-zinc-900/60 py-1.5">
      <span className="text-zinc-500 tracking-widest">{label}</span>
      <span className={`tabular-nums ${tone || "text-zinc-200"}`}>{value}</span>
    </div>
  );
}
