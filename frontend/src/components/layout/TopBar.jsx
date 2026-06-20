import { STRATEGIES } from "../../lib/strategies";

export default function TopBar({ symbol, strategyId, params, hasResult, onRun, onClear, running }) {
  const strat = STRATEGIES[strategyId];

  return (
    <header className="border-b border-zinc-900 bg-zinc-950 px-5 py-3 flex items-center justify-between font-mono text-[11px]">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-zinc-500 tracking-widest">SYMBOL</div>
          <div className="text-zinc-100 mt-0.5 tracking-wider">{symbol || "—"}</div>
        </div>
        <div>
          <div className="text-zinc-500 tracking-widest">STRATEGY</div>
          <div className="text-zinc-100 mt-0.5 tracking-wider">{strat?.name || "—"}</div>
        </div>
        <div className="hidden md:block">
          <div className="text-zinc-500 tracking-widest">PARAMS</div>
          <div className="text-zinc-400 mt-0.5">
            {strat?.params?.length
              ? strat.params.map((p) => `${p.key}=${params[p.key]}`).join(" · ")
              : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasResult && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-[11px] font-mono tracking-wider text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded transition-colors"
          >
            CLEAR
          </button>
        )}
        <button
          onClick={onRun}
          disabled={running}
          className="px-4 py-1.5 text-[11px] font-mono tracking-wider bg-amber-500 hover:bg-amber-400 text-black rounded transition-colors disabled:opacity-50"
        >
          {running ? "RUNNING..." : "RUN BACKTEST"}
        </button>
      </div>
    </header>
  );
}
