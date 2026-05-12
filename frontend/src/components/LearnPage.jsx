// ── EXPERIMENTAL: Duolingo × Robinhood Learn page ────────────────────
// White canvas + Robinhood-green accent + Duolingo-style gamification.
// Single-file React component, Tailwind + lucide-react only.
// Restore previous (cyberpunk) version with:
//   git reset --hard pre-duolingo-experiment

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

// ── mock data ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",          label: "All",              icon: Sparkles    },
  { id: "performance",  label: "Performance",      icon: TrendingUp  },
  { id: "risk",         label: "Risk",             icon: ShieldCheck },
  { id: "diversification", label: "Diversification", icon: Layers    },
  { id: "score",        label: "Score",            icon: Target      },
  { id: "capture",      label: "Capture Ratios",   icon: BarChart3   },
];

const METRICS = [
  {
    id: "prc",
    category: "risk",
    icon: ShieldCheck,
    title: "Risk Contribution (PRC)",
    short: "How much each holding actually drives your portfolio's volatility.",
    body: "PRC accounts for both a holding's weight AND its correlation with everything else. A 20% capital weight in a high-vol, highly-correlated holding might drive 40%+ of portfolio risk. PRCs across all holdings sum to exactly 100%.",
    why: "This is where 'capital weights are misleading' lives. You can be 20% capital in NVDA but 50% risk in NVDA — meaning NVDA *is* your portfolio for risk purposes, even though three other names exist.",
    how: "Trim positions whose PRC dramatically exceeds their capital weight. The Capital Efficiency table flags these as 'hidden risk.' The fix is usually to reduce the position itself or add an offsetting low-correlation asset.",
    range: "Ideally each PRC ≤ ~1.5× its capital weight. PRC > 2× capital weight = serious concentration of risk.",
    formula: "PRCᵢ = wᵢ × MCRᵢ / σₚ",
    formulaNote: "where MCR = (Σ × w)ᵢ / σₚ",
    warning: "Don't use capital weights to estimate risk — they're often off by 1.5–3× for the largest position in a tech-heavy portfolio.",
  },
  { id: "sharpe",  category: "performance",     icon: TrendingUp,  title: "Sharpe Ratio",                short: "Return you earn per unit of risk you take. Higher is better.", mastered: true },
  { id: "maxdd",   category: "risk",            icon: ShieldCheck, title: "Max Drawdown",                short: "The worst peak-to-trough loss your portfolio has lived through.", mastered: true },
  { id: "enp",     category: "diversification", icon: Layers,      title: "Effective Number of Positions", short: "How many holdings you really have, weighted by concentration." },
  { id: "beta",    category: "risk",            icon: Gauge,       title: "Beta",                        short: "How much your portfolio moves when the market moves." },
  { id: "upside",  category: "capture",         icon: BarChart3,   title: "Upside / Downside Capture",   short: "Are you keeping up with rallies — and dodging the worst drops?" },
];

// ── helpers ──────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 72, stroke = 7 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E5E7EB" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#00D26A" strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-900 tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

// ── component ────────────────────────────────────────────────────────
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased -mx-8 -my-8 px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">

        {/* ── header ────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Learn
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Master the math behind your portfolio risk.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing percent={percent} />
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {masteredCount} / {totalCount}
              </div>
              <div className="text-xs text-slate-500">mastered</div>
            </div>
          </div>
        </header>

        {/* ── streak callout (Duolingo flair) ───────────────────── */}
        <div className="mb-8 flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
            <Flame className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">3-day learning streak</p>
            <p className="text-xs text-slate-500">Master one more metric today to keep it alive.</p>
          </div>
          <Trophy className="h-5 w-5 text-amber-400" strokeWidth={2.25} />
        </div>

        {/* ── search ────────────────────────────────────────────── */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" strokeWidth={2.25} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search metrics…"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
          />
        </div>

        {/* ── category chips ────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  ${active
                    ? "bg-emerald-500 text-white shadow-sm scale-[1.02]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── metric cards ──────────────────────────────────────── */}
        <div className="space-y-3 pb-24">
          {filtered.map((metric) => {
            const isExpanded = expanded === metric.id;
            const isMastered = mastered.has(metric.id);
            const Icon = metric.icon;

            return (
              <div
                key={metric.id}
                className={`bg-white border-2 rounded-3xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  ${isExpanded ? "border-emerald-400 shadow-lg shadow-emerald-100" : "border-slate-200 hover:border-slate-300"}`}
              >
                {/* ── card header (collapsed view) ──────────────── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : metric.id)}
                  className="w-full text-left p-5 md:p-6 flex items-center gap-4"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors
                      ${isExpanded ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base md:text-lg text-slate-900 truncate">
                        {metric.title}
                      </h3>
                      {isMastered && (
                        <CheckCircle2
                          className="h-5 w-5 text-emerald-500 shrink-0"
                          strokeWidth={2.5}
                          fill="#D1FAE5"
                        />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 truncate">
                      {metric.short}
                    </p>
                  </div>

                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                      ${isExpanded ? "rotate-180 text-emerald-500" : ""}`}
                    strokeWidth={2.5}
                  />
                </button>

                {/* ── expanded body ────────────────────────────── */}
                {isExpanded && metric.body && (
                  <div className="px-5 md:px-6 pb-6 space-y-5 animate-[fadeUp_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">

                    <p className="text-slate-700 leading-relaxed text-[15px]">
                      {metric.body}
                    </p>

                    {/* Why it matters — blue chunk */}
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white">
                          <Lightbulb className="h-4 w-4" strokeWidth={2.5} />
                        </div>
                        <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">
                          Why it matters
                        </h4>
                      </div>
                      <p className="text-blue-950/80 text-sm leading-relaxed">
                        {metric.why}
                      </p>
                    </div>

                    {/* How to improve — green chunk */}
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
                          <Wrench className="h-4 w-4" strokeWidth={2.5} />
                        </div>
                        <h4 className="font-bold text-emerald-900 text-sm uppercase tracking-wide">
                          How to improve it
                        </h4>
                      </div>
                      <p className="text-emerald-950/80 text-sm leading-relaxed">
                        {metric.how}
                      </p>
                    </div>

                    {/* Typical range + Formula — side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                            <Gauge className="h-4 w-4" strokeWidth={2.5} />
                          </div>
                          <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wide">
                            Typical range
                          </h4>
                        </div>
                        <p className="text-amber-950/80 text-sm leading-relaxed">
                          {metric.range}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-900 text-slate-100 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-slate-100">
                            <Sigma className="h-4 w-4" strokeWidth={2.5} />
                          </div>
                          <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
                            Formula
                          </h4>
                        </div>
                        <code className="block font-mono text-base text-emerald-300 mt-2">
                          {metric.formula}
                        </code>
                        <p className="text-slate-400 text-xs mt-2 font-mono">
                          {metric.formulaNote}
                        </p>
                      </div>
                    </div>

                    {/* Watch-out callout */}
                    {metric.warning && (
                      <div className="flex gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4">
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <p className="text-sm text-rose-950/80 leading-relaxed">
                          <span className="font-bold text-rose-900">Watch out: </span>
                          {metric.warning}
                        </p>
                      </div>
                    )}

                    {/* Mastered CTA — Duolingo "Got it!" button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMastered(metric.id); }}
                      className={`w-full rounded-2xl font-bold text-base py-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98]
                        ${isMastered
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200"}`}
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
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <p className="text-slate-500 font-medium">No metrics match your search.</p>
            </div>
          )}
        </div>

      </div>

      {/* fadeUp keyframe — slight rise + opacity for the expand reveal */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
