import { Globe } from "lucide-react";

const TITLES = {
  markets: "MARKETS · scanner",
  marketDetail: "MARKET · detail + edge calc",
  arbitrage: "ARBITRAGE · YES+NO basis",
  calibration: "CALIBRATION · your forecasts",
  learn: "LEARN · concepts",
};

export default function TopBar({ view, apiStatus }) {
  return (
    <header className="border-b border-zinc-900 bg-zinc-950 px-5 py-2.5 flex items-center justify-between font-mono text-[11px]">
      <div className="flex items-center gap-6">
        <div className="text-zinc-100 tracking-wider">{TITLES[view] || ""}</div>
        <div className="text-zinc-500">VENUE: <span className="text-zinc-300">POLYMARKET</span></div>
      </div>
      <div className="flex items-center gap-2 text-zinc-500">
        <Globe className={`w-3 h-3 ${apiStatus === "live" ? "text-emerald-400" : apiStatus === "demo" ? "text-amber-400" : "text-zinc-500"}`} />
        <span>{apiStatus === "live" ? "LIVE API" : apiStatus === "demo" ? "DEMO DATA" : "—"}</span>
      </div>
    </header>
  );
}
