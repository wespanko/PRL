import { useState, useMemo } from "react";
import { Play } from "lucide-react";
import { DEFAULT_SIM_INPUTS, runSimulation, suggestTradesPerDay } from "../lib/simulation";
import { fmtMoney, fmtPct } from "../lib/format";

export default function PropFirmSimulator({ trades, daily }) {
  const initial = useMemo(() => ({
    ...DEFAULT_SIM_INPUTS,
    tradesPerDay: suggestTradesPerDay(daily.map((d) => ({ count: 0 })).length ? daily : null, DEFAULT_SIM_INPUTS.tradesPerDay),
  }), [daily]);

  const tpdFromHistory = useMemo(() => {
    if (!daily.length) return DEFAULT_SIM_INPUTS.tradesPerDay;
    const total = trades.length;
    const days = daily.length;
    return Math.max(1, Math.round(total / days));
  }, [trades, daily]);

  const [cfg, setCfg] = useState({ ...initial, tradesPerDay: tpdFromHistory });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const update = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const r = runSimulation(trades, cfg);
      setResult(r);
      setRunning(false);
    }, 0);
  };

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Prop firm survival simulator</div>
          <div className="mt-1 text-sm text-zinc-400">Monte Carlo on your historical trade distribution.</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Account size" value={cfg.accountSize} onChange={(v) => update("accountSize", v)} />
        <Field label="Max drawdown" value={cfg.maxDrawdown} onChange={(v) => update("maxDrawdown", v)} />
        <Field label="Daily loss limit" value={cfg.dailyLossLimit} onChange={(v) => update("dailyLossLimit", v)} />
        <Field label="Profit target" value={cfg.profitTarget} onChange={(v) => update("profitTarget", v)} />
        <Field label="Sim days" value={cfg.simulationDays} onChange={(v) => update("simulationDays", v)} />
        <Field label="Trades / day" value={cfg.tradesPerDay} onChange={(v) => update("tradesPerDay", v)} />
        <Field label="Size multiplier" value={cfg.positionSizeMultiplier} onChange={(v) => update("positionSizeMultiplier", v)} step="0.1" />
        <Field label="Runs" value={cfg.runs} onChange={(v) => update("runs", v)} />
      </div>

      <button
        onClick={run}
        disabled={running}
        className="mt-5 inline-flex items-center gap-2 bg-zinc-50 text-zinc-950 hover:bg-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
      >
        <Play className="w-4 h-4" />
        {running ? "Running…" : "Run simulation"}
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Out label="Hit profit target" value={fmtPct(result.pTarget)} tone="positive" />
            <Out label="Hit max drawdown" value={fmtPct(result.pMddViolation)} tone="negative" />
            <Out label="Hit daily loss" value={fmtPct(result.pDailyViolation)} tone="negative" />
            <Out label="Survived all rules" value={fmtPct(result.survived)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Out label="Median end P&L" value={fmtMoney(result.medianEnd)} />
            <Out label="10th percentile" value={fmtMoney(result.p10End)} tone="negative" />
            <Out label="90th percentile" value={fmtMoney(result.p90End)} tone="positive" />
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-zinc-500 leading-relaxed">
        This is a rough simulation based on your historical trades, sampled with replacement.
        It is not financial advice and does not predict future results.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, step }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        type="number"
        step={step || "1"}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-sm text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-600"
      />
    </label>
  );
}

function Out({ label, value, tone }) {
  const toneClass =
    tone === "positive" ? "text-emerald-400" :
    tone === "negative" ? "text-rose-400" : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
