import { useState, useEffect } from "react";

function getMarketSession(now) {
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay();
  if (day === 0 || day === 6) return { state: "closed", label: "Markets closed" };

  const minutes = ny.getHours() * 60 + ny.getMinutes();
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const preStart = 4 * 60;
  const afterEnd = 20 * 60;

  if (minutes < preStart || minutes >= afterEnd) return { state: "closed", label: "Markets closed" };
  if (minutes < open) return { state: "pre", label: "Pre-market" };
  if (minutes < close) return { state: "open", label: "Markets open" };
  return { state: "after", label: "After-hours" };
}

function pctSigned(v) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

const DOT_TONE = {
  open:   "bg-indigo-600",
  pre:    "bg-amber-500",
  after:  "bg-amber-500",
  closed: "bg-slate-300",
};

export default function StatusBar({ results, payload }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const session = getMarketSession(now);
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });

  const tickers = results?.tickers ?? [];
  const tickerLine = tickers.length > 0
    ? tickers.slice(0, 6).join(" · ")
    : "No portfolio loaded";

  return (
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between gap-6 px-6 md:px-8 text-sm">
      {/* Left: market session + clock */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-2 w-2 rounded-full ${DOT_TONE[session.state]} shrink-0`} />
        <span className="font-semibold text-slate-900 whitespace-nowrap">{session.label}</span>
        <span className="text-slate-500">·</span>
        <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">{time} ET</span>
      </div>

      {/* Center: portfolio tickers */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
          Portfolio
        </span>
        <span className="font-mono text-xs text-slate-500 truncate">{tickerLine}</span>
      </div>

      {/* Right: live stats */}
      <div className="flex items-center gap-5 shrink-0">
        {results ? (
          <>
            <Stat label="Sharpe" value={Number(results.sharpe_ratio).toFixed(2)} />
            <Stat label="Vol"    value={pctSigned(results.annualized_volatility)} />
            <Stat label="Beta"   value={Number(results.beta).toFixed(2)} />
            <Stat label="Drawdown" value={pctSigned(results.max_drawdown)} tone="rose" />
          </>
        ) : (
          <span className="text-xs text-slate-500">Run an analysis to populate</span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const valueColor = tone === "rose" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className={`font-mono text-xs font-semibold tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
