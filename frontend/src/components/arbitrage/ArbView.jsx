import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import Panel from "../layout/Panel";
import InfoTip from "../common/InfoTip";
import { listActiveMarkets } from "../../lib/polymarket";
import { fmtCents, fmtCompact, fmtDaysUntil } from "../../lib/format";
import { GLOSSARY } from "../../lib/glossary";

export default function ArbView({ onOpenMarket }) {
  const [state, setState] = useState({ loading: true, markets: [], error: null, fromCache: false });
  const [minLiquidity, setMinLiquidity] = useState(5000);
  const [minBasis, setMinBasis] = useState(0.5); // cents

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { markets, error, fromCache } = await listActiveMarkets({ limit: 250 });
    setState({ loading: false, markets, error, fromCache });
  };

  useEffect(() => { load(); }, []);

  const opportunities = useMemo(() => {
    return state.markets
      .filter((m) => m.isBinary && m.yesNoBasis !== null)
      .filter((m) => m.liquidity >= minLiquidity)
      .filter((m) => Math.abs(m.yesNoBasis) * 100 >= minBasis)
      .map((m) => ({
        ...m,
        basisCents: m.yesNoBasis * 100,
        direction: m.yesNoBasis > 0 ? "YES+NO RICH" : "YES+NO CHEAP",
        edgeCents: -m.yesNoBasis * 100,
      }))
      .sort((a, b) => Math.abs(b.basisCents) - Math.abs(a.basisCents))
      .slice(0, 60);
  }, [state.markets, minLiquidity, minBasis]);

  return (
    <div className="space-y-4">
      <Panel title="ARBITRAGE · YES + NO BASIS" sub="Markets where the YES and NO prices don't sum to $1.00. The bigger the deviation, the cleaner the trade.">
        <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
          <span className="text-zinc-300">How it works:</span> on a clean binary market, YES + NO should equal $1.00. When YES + NO ≠ 1, the AMM
          has drifted (usually on illiquid contracts) and there's a basis trade. <span className="text-amber-400">Negative basis (Y+N &lt; 1)</span>: buy both
          sides and collect the spread on resolution. <span className="text-rose-400">Positive basis (Y+N &gt; 1)</span>: sell both. Caveat: the printed YES and NO prices
          are the AMM's mid; actual fills move with the book. Always verify with the orderbook before sizing up.
        </p>

        {state.error && state.fromCache && (
          <div className="mb-3 rounded border border-amber-900/50 bg-amber-950/30 p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div className="text-[11px] text-amber-200">API unreachable; showing demo data. Underlying: <span className="font-mono">{state.error}</span></div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end mb-3">
          <Field label="MIN LIQUIDITY ($)" value={minLiquidity} onChange={setMinLiquidity} step={500} />
          <Field label="MIN BASIS (¢)" value={minBasis} onChange={setMinBasis} step={0.1} />
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400">
            <RefreshCw className={`w-3 h-3 ${state.loading ? "animate-spin" : ""}`} /> REFRESH
          </button>
        </div>

        {state.loading && (
          <div className="text-center py-12 font-mono text-[11px] tracking-widest text-zinc-500">SCANNING...</div>
        )}

        {!state.loading && (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
                  <th className="text-left py-2 px-2">MARKET</th>
                  <th className="text-right py-2 px-2">YES</th>
                  <th className="text-right py-2 px-2">NO</th>
                  <th className="text-right py-2 px-2">
                    <InfoTip text={GLOSSARY.basis}><span>BASIS</span></InfoTip>
                  </th>
                  <th className="text-right py-2 px-2">EDGE</th>
                  <th className="text-right py-2 px-2">DIRECTION</th>
                  <th className="text-right py-2 px-2">LIQ</th>
                  <th className="text-right py-2 px-2">RESOLVES</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/40 cursor-pointer" onClick={() => onOpenMarket(m)}>
                    <td className="py-2 px-2 text-zinc-100 truncate max-w-[420px]">{m.question}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-400">{fmtCents(m.yesPrice)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-rose-400">{fmtCents(m.noPrice)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums ${m.basisCents > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {m.basisCents > 0 ? "+" : ""}{m.basisCents.toFixed(2)}¢
                    </td>
                    <td className={`py-2 px-2 text-right tabular-nums ${m.edgeCents > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {m.edgeCents > 0 ? "+" : ""}{m.edgeCents.toFixed(2)}¢
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400 text-[10px] tracking-wider">{m.direction}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">${fmtCompact(m.liquidity)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">{fmtDaysUntil(m.endDate)}</td>
                    <td className="py-2 px-2 text-right">
                      <a
                        href={`https://polymarket.com/market/${m.slug}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-600 hover:text-amber-400 inline-block"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && !state.loading && (
                  <tr><td colSpan={9} className="py-8 text-center text-zinc-500">No opportunities at current filters. Try lowering MIN BASIS.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500 leading-relaxed">
          <span className="text-amber-400">Important caveat:</span> the AMM mid is not your fill. On thin contracts you may pay 2–5¢ more in spread,
          which eats most small-basis trades. The opportunities listed above are an upper bound; check the book before trading.
        </p>
      </Panel>
    </div>
  );
}

function Field({ label, value, onChange, step }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 tabular-nums focus:outline-none focus:border-amber-500"
      />
    </label>
  );
}
