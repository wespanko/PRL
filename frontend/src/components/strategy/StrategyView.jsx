import { STRATEGY_LIST, defaultParams } from "../../lib/strategies";
import { getSampleSymbols } from "../../lib/sampleData";
import Panel from "../layout/Panel";

export default function StrategyView({
  strategyId, setStrategyId,
  params, setParams,
  symbol, setSymbol,
  startingCash, setStartingCash,
  commissionPerTrade, setCommissionPerTrade,
  slippageBps, setSlippageBps,
}) {
  const strat = STRATEGY_LIST.find((s) => s.id === strategyId);
  const sampleSymbols = getSampleSymbols();

  const pick = (id) => {
    setStrategyId(id);
    setParams(defaultParams(id));
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Panel title="01 · STRATEGY" className="md:col-span-2">
        <div className="grid sm:grid-cols-2 gap-2.5">
          {STRATEGY_LIST.map((s) => {
            const active = strategyId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                className={`text-left p-3 rounded border transition-all ${
                  active
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] text-zinc-100 tracking-wider">{s.name}</div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    {s.category}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-zinc-400 leading-relaxed">{s.description}</p>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="02 · PARAMETERS">
          {strat && strat.params.length === 0 && (
            <div className="text-[12px] text-zinc-500">This strategy has no tunable parameters.</div>
          )}
          {strat && strat.params.map((p) => (
            <div key={p.key} className="mb-3 last:mb-0">
              <div className="flex justify-between items-baseline mb-1">
                <label className="font-mono text-[10px] tracking-widest text-zinc-500">{p.label.toUpperCase()}</label>
                <span className="font-mono text-[12px] text-amber-400 tabular-nums">{params[p.key]}</span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key]}
                onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
                <span>{p.min}</span>
                <span>{p.max}</span>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="03 · MARKET">
          <label className="block mb-3">
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">SYMBOL</div>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              {sampleSymbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
              Synthetic price series for the MVP. Upload your own bars in DATA.
            </div>
          </label>
        </Panel>

        <Panel title="04 · EXECUTION">
          <Number label="STARTING CASH" value={startingCash} onChange={setStartingCash} step={1000} />
          <Number label="COMMISSION ($)" value={commissionPerTrade} onChange={setCommissionPerTrade} step={0.5} />
          <Number label="SLIPPAGE (BPS)" value={slippageBps} onChange={setSlippageBps} step={1} />
        </Panel>
      </div>
    </div>
  );
}

function Number({ label, value, onChange, step = 1 }) {
  return (
    <label className="block mb-2 last:mb-0">
      <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 tabular-nums focus:outline-none focus:border-amber-500"
      />
    </label>
  );
}
