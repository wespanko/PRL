import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import Panel from "../layout/Panel";
import { listActiveMarkets } from "../../lib/polymarket";
import { fmtCents, fmtCompact, fmtDaysUntil } from "../../lib/format";

const SORT_OPTIONS = [
  { key: "volume24hr", label: "24H VOL", get: (m) => m.volume24hr },
  { key: "volume", label: "VOL", get: (m) => m.volume },
  { key: "liquidity", label: "LIQUIDITY", get: (m) => m.liquidity },
  { key: "endDate", label: "RESOLVES", get: (m) => m.endDate?.getTime() || Infinity, ascending: true },
  { key: "yesPrice", label: "YES PX", get: (m) => m.yesPrice ?? 0 },
];

export default function MarketsView({ onOpenMarket }) {
  const [state, setState] = useState({ loading: true, markets: [], error: null, fromCache: false });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("volume24hr");
  const [category, setCategory] = useState("all");

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { markets, error, fromCache } = await listActiveMarkets({ limit: 250 });
    setState({ loading: false, markets, error, fromCache });
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set();
    state.markets.forEach((m) => m.category && set.add(m.category));
    return ["all", ...Array.from(set).sort()];
  }, [state.markets]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sortDef = SORT_OPTIONS.find((s) => s.key === sortKey) || SORT_OPTIONS[0];
    const ascending = !!sortDef.ascending;
    return state.markets
      .filter((m) => m.isBinary)
      .filter((m) => category === "all" || m.category === category)
      .filter((m) => !q || m.question.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = sortDef.get(a);
        const bv = sortDef.get(b);
        return ascending ? av - bv : bv - av;
      })
      .slice(0, 200);
  }, [state.markets, query, sortKey, category]);

  return (
    <div className="space-y-4">
      {state.error && state.fromCache && (
        <div className="rounded border border-amber-900/50 bg-amber-950/30 p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-[12px] text-amber-200 leading-relaxed">
            <div className="font-mono text-amber-400 tracking-wider text-[11px] mb-0.5">CORS / NETWORK ERROR</div>
            Could not reach Polymarket Gamma API directly from the browser. Showing embedded demo markets so you can explore the
            terminal. Likely fix: proxy the API through a tiny serverless function (or run the dev server with a Vite proxy).
            Underlying error: <span className="font-mono">{state.error}</span>
          </div>
        </div>
      )}

      <Panel
        title={`MARKETS · ${filtered.length} ACTIVE`}
        sub={state.fromCache ? "Demo data — API unreachable" : "Live from Polymarket Gamma API"}
        right={
          <button onClick={load} className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400">
            <RefreshCw className={`w-3 h-3 ${state.loading ? "animate-spin" : ""}`} /> REFRESH
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[11px] tracking-wider text-zinc-100"
          >
            {categories.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[11px] tracking-wider text-zinc-100"
          >
            {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>SORT: {s.label}</option>)}
          </select>
        </div>

        {state.loading && (
          <div className="text-center py-12 font-mono text-[11px] tracking-widest text-zinc-500">
            LOADING POLYMARKET...
          </div>
        )}

        {!state.loading && (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
                  <th className="text-left py-2 px-2">MARKET</th>
                  <th className="text-right py-2 px-2">YES</th>
                  <th className="text-right py-2 px-2">NO</th>
                  <th className="text-right py-2 px-2">BASIS</th>
                  <th className="text-right py-2 px-2">24H VOL</th>
                  <th className="text-right py-2 px-2">LIQUIDITY</th>
                  <th className="text-right py-2 px-2">RESOLVES</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/40 cursor-pointer" onClick={() => onOpenMarket(m)}>
                    <td className="py-2 px-2">
                      <div className="text-zinc-100 truncate max-w-[460px]">{m.question}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{m.category || "—"}</div>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-400">{fmtCents(m.yesPrice)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-rose-400">{fmtCents(m.noPrice)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums ${Math.abs(m.yesNoBasis ?? 0) > 0.02 ? "text-amber-400" : "text-zinc-500"}`}>
                      {m.yesNoBasis !== null ? `${(m.yesNoBasis * 100).toFixed(1)}¢` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">${fmtCompact(m.volume24hr)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">${fmtCompact(m.liquidity)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">{fmtDaysUntil(m.endDate)}</td>
                    <td className="py-2 px-2 text-right">
                      <a
                        href={`https://polymarket.com/market/${m.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-600 hover:text-amber-400 inline-block"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
