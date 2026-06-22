import { TrendingUp, Zap, Target, BookOpen } from "lucide-react";

const NAV = [
  { id: "markets", label: "MARKETS", icon: TrendingUp },
  { id: "arbitrage", label: "ARBITRAGE", icon: Zap },
  { id: "calibration", label: "CALIBRATION", icon: Target },
  { id: "learn", label: "LEARN", icon: BookOpen },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="w-44 shrink-0 border-r border-zinc-900 bg-black flex flex-col">
      <div className="px-3 py-4 border-b border-zinc-900">
        <div className="font-mono text-[11px] tracking-widest text-amber-400">PANKO//PM</div>
        <div className="font-mono text-[10px] text-zinc-500 mt-0.5">PREDICTION TERMINAL</div>
      </div>
      <nav className="flex-1 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id || (active === "marketDetail" && item.id === "markets");
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-mono tracking-wider transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-400"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 border-l-2 border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-zinc-900 font-mono text-[10px] text-zinc-600 leading-relaxed">
        <div>POLYMARKET ONLY · MVP</div>
        <div className="mt-1">EDU TOOL · NO ADVICE</div>
      </div>
    </aside>
  );
}
