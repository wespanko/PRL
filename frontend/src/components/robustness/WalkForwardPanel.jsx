import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from "recharts";
import Panel from "../layout/Panel";
import { walkForward } from "../../lib/walkForward";
import { getBars } from "../../lib/sampleData";
import { fmtPct, fmtNum } from "../../lib/format";
import InfoTip from "../common/InfoTip";

export default function WalkForwardPanel({ result, symbol, folds = 5 }) {
  const wf = useMemo(() => {
    if (!result) return null;
    const bars = getBars(symbol);
    if (!bars.length) return null;
    return walkForward(bars, result.strategyId, result.params, { folds, startingCash: result.startingCash });
  }, [result, symbol, folds]);

  if (!wf || !wf.valid) {
    return (
      <Panel title="WALK-FORWARD" sub="Fold-by-fold stability check.">
        <div className="text-[12px] text-zinc-500">
          {wf?.reason || "Run a backtest first."}
        </div>
      </Panel>
    );
  }

  const chartData = wf.folds.map((f) => ({
    name: `F${f.fold}`,
    return: Math.round(f.totalReturn * 1000) / 10,
    sharpe: f.sharpe,
  }));

  return (
    <Panel title={`WALK-FORWARD · ${folds} FOLDS`} sub="Strategy run on consecutive equal slices of the data.">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}%`} width={50} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}
                  formatter={(v) => `${v}%`}
                />
                <ReferenceLine y={0} stroke="#3f3f46" />
                <Bar dataKey="return">
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.return >= 0 ? "#34d399" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-2 text-center">
            Total return per fold (%)
          </div>
        </div>

        <div className="space-y-2 font-mono text-[11px]">
          <Row label={<InfoTip text="Folds that ended profitable / total folds. A strong edge holds across most regimes; one or two profitable folds is a red flag."><span>POSITIVE FOLDS</span></InfoTip>} value={`${wf.summary.positiveCount}/${wf.summary.foldsTotal}`} tone={wf.summary.positiveRate > 0.7 ? "text-emerald-400" : wf.summary.positiveRate > 0.5 ? "text-amber-400" : "text-rose-400"} />
          <Row label="MEAN SHARPE" value={fmtNum(wf.summary.meanSharpe)} />
          <Row label={<InfoTip text="Mean Sharpe / std-dev of Sharpe across folds. Higher = more stable. Below 1 = strategy depends on a regime."><span>STABILITY</span></InfoTip>} value={fmtNum(wf.summary.stability)} tone={wf.summary.stability > 1 ? "text-emerald-400" : "text-amber-400"} />
          <Row label="MEAN RETURN" value={fmtPct(wf.summary.meanReturn)} />
          <Row label="BEST FOLD" value={`F${wf.summary.bestFold.fold} · ${fmtPct(wf.summary.bestFold.totalReturn)}`} tone="text-emerald-400" />
          <Row label="WORST FOLD" value={`F${wf.summary.worstFold.fold} · ${fmtPct(wf.summary.worstFold.totalReturn)}`} tone="text-rose-400" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-900 overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
              <th className="text-left py-2 px-2">FOLD</th>
              <th className="text-left py-2 px-2">RANGE</th>
              <th className="text-right py-2 px-2">RETURN</th>
              <th className="text-right py-2 px-2">CAGR</th>
              <th className="text-right py-2 px-2">SHARPE</th>
              <th className="text-right py-2 px-2">MAX DD</th>
              <th className="text-right py-2 px-2">TRADES</th>
              <th className="text-right py-2 px-2">EXPOSURE</th>
            </tr>
          </thead>
          <tbody>
            {wf.folds.map((f) => (
              <tr key={f.fold} className="border-b border-zinc-900/60">
                <td className="py-1.5 px-2 text-zinc-300">F{f.fold}</td>
                <td className="py-1.5 px-2 text-zinc-400">
                  {f.startDate?.toISOString().slice(0, 7)} → {f.endDate?.toISOString().slice(0, 7)}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums ${f.totalReturn > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmtPct(f.totalReturn)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-zinc-300">{fmtPct(f.cagr)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-zinc-300">{fmtNum(f.sharpe)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-rose-400">{fmtPct(f.maxDDPct)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-zinc-300">{f.trades}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-zinc-400">{fmtPct(f.timeInMarketPct, { decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed">
        <span className="text-zinc-400">How to read this:</span> a strategy that only works in 1-2 of {wf.summary.foldsTotal} folds
        is over-fit to a regime. A real edge should be profitable across most folds — even if returns vary. This is the
        simplest test that catches "looks great over the full sample, doesn't actually work."
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
