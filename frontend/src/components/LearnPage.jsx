// ── EXPERIMENTAL: cyberpunk skin for Learn page ──────────────────────
// Lives on the `cyberpunk-experiment` branch. Built from the user-supplied
// mock to test a dark / neon / Tailwind aesthetic against the brief's
// light / institutional one. Restore with `git checkout main`.
//
// Uses Tailwind utility classes (added on this branch only) + lucide-react.
// The brief's CSS variables and primitives are NOT used inside this file —
// it's an isolated experiment.

import { useState } from "react";
import {
  Search, Terminal, Activity, Crosshair, BarChart2,
  ShieldAlert, Cpu, ChevronDown, ChevronUp, Zap,
  Database, Eye,
} from "lucide-react";

export default function LearnPage({ initialMetricId }) {
  const [expandedMetric, setExpandedMetric] = useState(initialMetricId ?? "prc");
  const [activeFilter, setActiveFilter] = useState("All metrics");

  const filters = [
    { name: "All metrics",     icon: <Database     className="w-4 h-4" /> },
    { name: "Score",           icon: <Crosshair    className="w-4 h-4" /> },
    { name: "Performance",     icon: <Activity     className="w-4 h-4" /> },
    { name: "Risk",            icon: <ShieldAlert  className="w-4 h-4" /> },
    { name: "Capture Ratios",  icon: <BarChart2    className="w-4 h-4" /> },
    { name: "Diversification", icon: <Cpu          className="w-4 h-4" /> },
  ];

  const toggleMetric = (id) => {
    setExpandedMetric(expandedMetric === id ? null : id);
  };

  return (
    // Single dark canvas section. min-h-screen plus negative margins to
    // visually escape the parent app shell padding for the full-bleed look.
    <div className="cyber-root relative bg-slate-950 text-cyan-400 font-mono selection:bg-cyan-900 selection:text-cyan-100 -mx-8 -my-8 px-8 py-8 overflow-hidden">

      {/* Background grid + vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />

      <div className="relative z-10">

        {/* Status bar */}
        <header className="h-14 border border-cyan-800/50 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 text-xs uppercase tracking-widest mb-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-red-400">Market Closed</span>
            </div>
            <span className="text-slate-500 border-l border-slate-800 pl-6">SYS_TIME: 01:01 AM ET</span>
          </div>
          <div className="flex items-center gap-3 text-emerald-400 border border-emerald-900/50 bg-emerald-950/20 px-3 py-1 rounded-sm">
            <Eye className="w-4 h-4" />
            <span>PORTFOLIO_STATUS: NO_DATA_LOADED</span>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full">

          <div className="mb-8">
            <h2 className="text-3xl text-cyan-50 mb-2 uppercase tracking-wider font-light">
              Risk Metrics <span className="text-cyan-500 font-bold">// DATABANK</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Decrypting system metrics — operational definitions, strategic parameters, and core logic vectors.
            </p>
          </div>

          {/* Search + filters */}
          <div className="mb-8 space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-cyan-600 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Query databank..."
                className="w-full bg-slate-900/50 border border-cyan-800/50 text-cyan-100 placeholder-slate-600 py-4 pl-12 pr-4 rounded-none outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all uppercase tracking-widest text-sm"
              />
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-cyan-500/20" />
            </div>

            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button
                  key={filter.name}
                  onClick={() => setActiveFilter(filter.name)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border transition-all duration-300
                    ${activeFilter === filter.name
                      ? "border-cyan-400 bg-cyan-900/40 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                      : "border-slate-800 text-slate-500 hover:border-cyan-800 hover:text-cyan-400"}`}
                >
                  {filter.icon}
                  {filter.name}
                </button>
              ))}
            </div>
          </div>

          {/* Glossary */}
          <div className="space-y-4">

            {/* Collapsed sample item */}
            <div className="border border-slate-800 bg-slate-900/30 p-4 hover:border-cyan-800/70 transition-colors cursor-pointer flex justify-between items-center group">
              <div>
                <h3 className="text-slate-200 font-bold mb-1 uppercase text-sm group-hover:text-cyan-300 transition-colors">Stress Scenarios</h3>
                <p className="text-slate-500 text-xs">Projected portfolio impact under historical crisis events — recession, rate shock, dollar shock, etc.</p>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-600 group-hover:text-cyan-400" />
            </div>

            {/* Expanded PRC */}
            <div className={`border transition-all duration-500 ${expandedMetric === "prc" ? "border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.15)] bg-slate-900/60" : "border-slate-800"}`}>
              <div
                className="p-4 cursor-pointer flex justify-between items-center bg-cyan-950/30"
                onClick={() => toggleMetric("prc")}
              >
                <div>
                  <h3 className="text-cyan-300 font-bold mb-1 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 animate-pulse" />
                    Risk Contribution (PRC)
                  </h3>
                  <p className="text-cyan-600/80 text-xs">What percentage of total portfolio volatility this single holding actually drives.</p>
                </div>
                {expandedMetric === "prc" ? (
                  <div className="bg-cyan-500 text-slate-950 p-1">
                    <ChevronUp className="w-4 h-4" />
                  </div>
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </div>

              {expandedMetric === "prc" && (
                <div className="p-6 border-t border-cyan-900/50 space-y-6 text-sm">
                  <p className="text-slate-300 leading-relaxed border-l-2 border-cyan-800 pl-4">
                    PRC accounts for both a holding's weight AND its correlation with everything else. A 20% capital weight in a high-vol, highly-correlated holding might drive <span className="text-red-400 font-bold">40%+ of portfolio risk</span>. PRCs across all holdings sum to exactly 100%.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-cyan-500 text-xs tracking-widest uppercase font-bold flex items-center gap-2">
                        <span className="text-cyan-800">///</span> Why it matters
                      </h4>
                      <div className="bg-slate-950/50 p-4 border border-slate-800">
                        <p className="text-slate-400">
                          This is where 'capital weights are misleading' lives. You can be 20% capital in NVDA but 50% risk in NVDA — meaning NVDA <em className="text-cyan-300 not-italic">is</em> your portfolio for risk purposes, even though three other names exist.
                        </p>
                        <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
                          <span className="text-amber-500 font-bold uppercase">Warning:</span> <span className="text-slate-500">Using capital weights to estimate risk. They're often off by 1.5–3× for the largest position in a tech-heavy portfolio.</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-cyan-500 text-xs tracking-widest uppercase font-bold flex items-center gap-2">
                        <span className="text-cyan-800">///</span> How to improve it
                      </h4>
                      <div className="bg-slate-950/50 p-4 border border-slate-800">
                        <p className="text-slate-400">
                          Trim positions whose PRC dramatically exceeds their capital weight. The Capital Efficiency table flags these as 'hidden risk.' The fix is usually to reduce the position itself or add an offsetting low-correlation asset.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-cyan-950/20 border border-cyan-900/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 bg-cyan-900/50 text-[10px] text-cyan-400">SYS_RANGE</div>
                      <h4 className="text-cyan-600 text-xs uppercase mb-2">Typical Range</h4>
                      <p className="text-cyan-100">
                        Ideally each PRC ≤ <span className="text-emerald-400">~1.5×</span> its capital weight.
                        <br/><span className="text-red-400 mt-1 block">PRC &gt; 2× capital weight = serious concentration of risk.</span>
                      </p>
                    </div>

                    <div className="flex-1 bg-slate-900/50 border border-slate-800 p-4 font-mono text-xs relative">
                      <div className="absolute top-0 right-0 p-1 bg-slate-800/50 text-[10px] text-slate-400">MATH_PROTOCOL</div>
                      <h4 className="text-slate-500 uppercase mb-2">Formula</h4>
                      <code className="text-fuchsia-400 block bg-slate-950 p-2 border border-slate-800">
                        PRCᵢ = wᵢ × MCRᵢ / σₚ
                      </code>
                      <p className="text-slate-500 mt-2 text-[10px]">where MCR = (Σ × w)ᵢ / σₚ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 border border-slate-800 bg-slate-900/20 text-xs text-slate-500">
              <span className="text-cyan-500 uppercase font-bold">System Reminder:</span> These are educational descriptions, not financial advice. Numbers in the app come from real price data computed deterministically — no LLM is involved in the math itself.
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
