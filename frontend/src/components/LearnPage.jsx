// ── Duolingo × Robinhood Learn page ──────────────────────────────────
// Design system reference for the rest of the rollout:
//
//   • Canvas        : bg-slate-950 text-slate-100 font-sans
//   • Container     : max-w-3xl mx-auto, generous py
//   • Surface card  : bg-slate-950 border border-slate-800 rounded-3xl
//   • Active card   : border-2 border-cyan-500 shadow-sm shadow-cyan-500/20
//   • Hairline rule : 1px (border), reserved 2px for active/focus
//   • Primary CTA   : bg-cyan-500 hover:bg-cyan-600 text-white
//   • Secondary CTA : bg-slate-800/60 hover:bg-slate-700 text-slate-100
//   • Pill chip     : rounded-full px-4 py-2 text-sm font-semibold
//   • Soft chunks   : bg-{blue|emerald|amber|rose}-50 border border-{c}-200
//   • Inverted code : bg-slate-900 text-slate-100 (formula block)
//   • Easing        : ease-[cubic-bezier(0.34,1.56,0.64,1)] for spring feel
//   • Icons         : lucide-react, strokeWidth={2.25}

import { useState } from "react";
import {
  Search,
  TrendingUp,
  ShieldCheck,
  Layers,
  Target,
  BarChart3,
  ChevronDown,
  Flame,
  Sparkles,
  Trophy,
  CheckCircle2,
  Lightbulb,
  Wrench,
  Gauge,
  Sigma,
  AlertTriangle,
} from "lucide-react";

const CATEGORIES = [
  { id: "all",             label: "All",              icon: Sparkles    },
  { id: "performance",     label: "Performance",      icon: TrendingUp  },
  { id: "risk",            label: "Risk",             icon: ShieldCheck },
  { id: "diversification", label: "Diversification",  icon: Layers      },
  { id: "score",           label: "Score",            icon: Target      },
  { id: "capture",         label: "Capture Ratios",   icon: BarChart3   },
];

const METRICS = [
  {
    id: "prc",
    category: "risk",
    icon: ShieldCheck,
    title: "Risk Contribution (PRC)",
    short: "How much each holding actually drives your portfolio's volatility.",
    body: "PRC accounts for both a holding's weight AND its correlation with everything else. A 20% capital weight in a high-vol, highly-correlated holding might drive 40%+ of portfolio risk. PRCs across all holdings sum to exactly 100%.",
    why: "This is where 'capital weights are misleading' lives. You can be 20% capital in NVDA but 50% risk in NVDA — meaning NVDA is your portfolio for risk purposes, even though three other names exist.",
    how: "Trim positions whose PRC dramatically exceeds their capital weight. The Capital Efficiency table flags these as 'hidden risk.' The fix is usually to reduce the position itself or add an offsetting low-correlation asset.",
    range: "Ideally each PRC ≤ ~1.5× its capital weight. PRC > 2× capital weight is serious risk concentration.",
    formula: "PRCᵢ = wᵢ × MCRᵢ / σₚ",
    formulaNote: "where MCR = (Σ × w)ᵢ / σₚ",
    warning: "Don't use capital weights to estimate risk — they're often off by 1.5–3× for the largest position in a tech-heavy portfolio.",
  },
  { id: "sharpe", category: "performance",     icon: TrendingUp,  title: "Sharpe Ratio",                  short: "Return you earn per unit of risk you take. Higher is better.",  mastered: true },
  { id: "maxdd",  category: "risk",            icon: ShieldCheck, title: "Max Drawdown",                  short: "The worst peak-to-trough loss your portfolio has lived through.", mastered: true },
  { id: "enp",    category: "diversification", icon: Layers,      title: "Effective Number of Positions", short: "How many holdings you really have, weighted by concentration." },
  { id: "beta",   category: "risk",            icon: Gauge,       title: "Beta",                          short: "How much your portfolio moves when the market moves." },
  { id: "upside", category: "capture",         icon: BarChart3,   title: "Upside / Downside Capture",     short: "Are you keeping up with rallies and dodging the worst drops?" },
];

// ── progress ring ────────────────────────────────────────────────────
function ProgressRing({ percent, size = 64, stroke = 6 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: "drop-shadow(0 0 8px rgba(6, 182, 212, 0.35))" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#1E293B" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#06B6D4" strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold text-slate-100 tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

// ── soft content chunk ───────────────────────────────────────────────
function Chunk({ tone, icon: Icon, title, children }) {
  // "emerald" key kept for backward compat with existing prop usage —
  // routes to indigo so "Why it matters" (blue) and "How to improve"
  // stay visually distinct now that brand green is gone.
  const tones = {
    blue:    { bg: "bg-cyan-500/10",    ring: "border-cyan-500/30",    badge: "bg-cyan-500",    text: "text-cyan-100",    label: "text-cyan-200"    },
    emerald: { bg: "bg-indigo-500/10",  ring: "border-indigo-500/30",  badge: "bg-indigo-500",  text: "text-indigo-200",  label: "text-indigo-300"  },
    amber:   { bg: "bg-amber-500/10",   ring: "border-amber-500/30",   badge: "bg-amber-500",   text: "text-amber-200",   label: "text-amber-200"   },
    rose:    { bg: "bg-rose-500/10",    ring: "border-rose-500/30",    badge: "bg-rose-500",    text: "text-rose-200",    label: "text-rose-200"    },
  }[tone];
  return (
    <div className={`rounded-2xl border ${tones.bg} ${tones.ring} p-5`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones.badge} text-white`}>
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <h4 className={`font-bold text-[13px] uppercase tracking-wide ${tones.label}`}>
          {title}
        </h4>
      </div>
      <div className={`text-sm leading-relaxed ${tones.text}/80`}>
        {children}
      </div>
    </div>
  );
}

export default function LearnPage({ initialMetricId }) {
  const [expanded, setExpanded] = useState(initialMetricId ?? "prc");
  const [activeCategory, setActiveCategory] = useState("all");
  const [mastered, setMastered] = useState(new Set(["sharpe", "maxdd"]));
  const [query, setQuery] = useState("");

  const filtered = METRICS.filter((m) => {
    const matchCat = activeCategory === "all" || m.category === activeCategory;
    const matchQuery = !query || m.title.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  const masteredCount = mastered.size;
  const totalCount = METRICS.length;
  const percent = Math.round((masteredCount / totalCount) * 100);

  function toggleMastered(id) {
    setMastered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased -mx-8 -my-8 px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="flex items-start justify-between gap-6 mb-7">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100">
              Learn
            </h1>
            <p className="text-slate-500 mt-1 text-[15px]">
              Master the math behind your portfolio risk.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ProgressRing percent={percent} />
            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-100 tabular-nums">
                {masteredCount} / {totalCount}
              </div>
              <div className="text-xs font-medium text-slate-500">mastered</div>
            </div>
          </div>
        </header>

        {/* Streak callout */}
        <div className="mb-7 flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-3xl px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <Flame className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100">3-day learning streak</p>
            <p className="text-xs text-slate-500">Master one more metric today to keep it alive.</p>
          </div>
          <Trophy className="h-5 w-5 text-amber-500 shrink-0" strokeWidth={2.25} />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" strokeWidth={2.25} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search metrics…"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
          />
        </div>

        {/* Category chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors
                  ${active
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-800/60 text-slate-600 hover:bg-slate-700"}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Metric cards */}
        <div className="space-y-3 pb-24">
          {filtered.map((metric) => {
            const isExpanded = expanded === metric.id;
            const isMastered = mastered.has(metric.id);
            const Icon = metric.icon;

            return (
              <div
                key={metric.id}
                className={`bg-slate-950 rounded-3xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  ${isExpanded
                    ? "border-2 border-cyan-500 shadow-sm"
                    : "border border-slate-800 hover:border-slate-700"}`}
              >
                {/* Header (collapsed view) */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : metric.id)}
                  className="w-full text-left p-5 md:px-6 flex items-center gap-4"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors
                    ${isExpanded ? "bg-cyan-500 text-white" : "bg-slate-800/60 text-slate-500"}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base md:text-lg text-slate-100 truncate">
                        {metric.title}
                      </h3>
                      {isMastered && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan-500/15 text-cyan-400 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2.75} />
                          Mastered
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 truncate">
                      {metric.short}
                    </p>
                  </div>

                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 shrink-0 transition-transform duration-300
                      ${isExpanded ? "rotate-180 text-cyan-400" : ""}`}
                    strokeWidth={2.5}
                  />
                </button>

                {/* Expanded body */}
                {isExpanded && metric.body && (
                  <div className="px-5 md:px-6 pb-6 space-y-4">

                    <div className="border-t border-slate-800 pt-5">
                      <p className="text-slate-600 leading-relaxed text-[15px]">
                        {metric.body}
                      </p>
                    </div>

                    <Chunk tone="blue" icon={Lightbulb} title="Why it matters">
                      {metric.why}
                    </Chunk>

                    <Chunk tone="emerald" icon={Wrench} title="How to improve it">
                      {metric.how}
                    </Chunk>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Chunk tone="amber" icon={Gauge} title="Typical range">
                        {metric.range}
                      </Chunk>

                      {/* Formula chunk — inverted dark variant, not a Chunk because of the different visual treatment */}
                      <div className="rounded-2xl bg-slate-900 text-slate-100 border border-slate-900 p-5">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-slate-100">
                            <Sigma className="h-4 w-4" strokeWidth={2.5} />
                          </div>
                          <h4 className="font-bold text-[13px] uppercase tracking-wide text-slate-100">
                            Formula
                          </h4>
                        </div>
                        <code className="block font-mono text-base text-cyan-300 mt-2">
                          {metric.formula}
                        </code>
                        <p className="text-slate-500 text-xs mt-2 font-mono">
                          {metric.formulaNote}
                        </p>
                      </div>
                    </div>

                    {metric.warning && (
                      <div className="flex gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4">
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <p className="text-sm text-rose-200 leading-relaxed">
                          <span className="font-bold">Watch out: </span>
                          {metric.warning}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMastered(metric.id); }}
                      className={`w-full rounded-2xl font-bold text-base py-4 transition-colors active:scale-[0.99]
                        ${isMastered
                          ? "bg-slate-800/60 hover:bg-slate-700 text-slate-600 border border-slate-800"
                          : "bg-cyan-500 hover:bg-cyan-600 text-white"}`}
                    >
                      {isMastered ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                          Mastered — tap to unmark
                        </span>
                      ) : (
                        "Got it — mark as mastered"
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-700 p-12 text-center">
              <p className="text-slate-500 font-medium">No metrics match your search.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
