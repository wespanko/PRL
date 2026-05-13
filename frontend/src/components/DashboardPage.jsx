import {
  TrendingUp, AlertTriangle, Target, ArrowRight, Sparkles, PlayCircle,
} from "lucide-react";
import { useAnimatedNumber } from "../utils/useAnimatedNumber";
import {
  topRiskDriver,
  suggestedFocus,
  biggestVulnerability,
} from "../utils/dashboardMetrics";
import { pct } from "../utils/formatters";

// ── score ring (large hero variant of the Learn ProgressRing) ────────
function ScoreRing({ score, size = 200, stroke = 14 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((score ?? 0) / 100) * circumference;

  // Tone-shift based on score band — JARVIS palette.
  const tone =
    score == null   ? "#475569" : // slate-600
    score >= 75     ? "#38BDF8" : // cyan-500 (good)
    score >= 50     ? "#F59E0B" : // amber  (ok)
                      "#F43F5E";  // rose   (bad)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} >
      <svg width={size} height={size} className="-rotate-90" style={{ filter: score >= 75 ? "drop-shadow(0 0 12px rgba(56, 189, 248, 0.4))" : undefined }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1E293B" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={tone} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-extrabold text-slate-100 tabular-nums leading-none">
          {Math.round(score ?? 0)}
        </span>
        <span className="text-xs font-bold text-slate-500 tracking-wider mt-1.5 uppercase">
          / 100
        </span>
      </div>
    </div>
  );
}

// ── soft metric card ────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, figure, body, tone = "slate" }) {
  const tones = {
    rose:    { iconBg: "bg-rose-500/15",  iconColor: "text-rose-400",  figure: "text-rose-400"  },
    amber:   { iconBg: "bg-amber-500/15", iconColor: "text-amber-400", figure: "text-amber-400" },
    emerald: { iconBg: "bg-sky-400/25",  iconColor: "text-sky-400",  figure: "text-sky-400"  },
    slate:   { iconBg: "bg-slate-800/60", iconColor: "text-slate-400", figure: "text-slate-100" },
  }[tone];
  return (
    <div className="bg-slate-900/70 border border-slate-700/60 rounded-3xl p-5 md:p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones.iconBg} ${tones.iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </div>
      </div>
      <div className={`text-3xl font-extrabold tabular-nums mb-2 ${tones.figure}`}>
        {figure}
      </div>
      <div className="text-sm text-slate-500 leading-relaxed">
        {body}
      </div>
    </div>
  );
}

export default function DashboardPage({
  results,
  prevSnapshot,
  setActiveTab,
  onRunDemo,
  loading,
}) {
  const hasResults = !!results;

  // ── empty state ─────────────────────────────────────────────────
  if (!hasResults) {
    return (
      <div className="px-6 py-12 md:px-10 md:py-16 max-w-3xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-400/25 text-sky-400">
            <Sparkles className="h-10 w-10" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center text-slate-100 mb-3">
          No analysis yet
        </h1>
        <p className="text-center text-slate-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Add your tickers and weights and Panko will compute the full risk profile in seconds.
        </p>

        <div className="space-y-3 max-w-md mx-auto">
          {onRunDemo && (
            <button
              onClick={onRunDemo}
              disabled={loading}
              className="w-full bg-sky-400 hover:bg-sky-500 disabled:bg-sky-400/30 text-white rounded-2xl font-bold text-base py-4 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-sky-400/40"
            >
              <PlayCircle className="h-5 w-5" strokeWidth={2.5} />
              {loading ? "Loading example…" : "Try with example portfolio"}
            </button>
          )}
          <button
            onClick={() => setActiveTab("analyze")}
            disabled={loading}
            className="w-full bg-slate-800/60 hover:bg-slate-700 text-slate-100 rounded-2xl font-bold text-base py-4 transition-colors"
          >
            Or enter your own
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-500 text-center max-w-md mx-auto leading-relaxed">
          The example is a tech-tilted balanced mix (NVDA, MSFT, AAPL, SPY, TLT, GLD…).
        </p>
      </div>
    );
  }

  // ── populated state ─────────────────────────────────────────────
  const panko = results.panko_score ?? null;
  const score = panko?.total ?? null;
  const dnaType = results.portfolio_dna?.type ?? null;
  const animatedScore = useAnimatedNumber(score ?? 0, 900);

  const top = topRiskDriver(results);
  const focus = suggestedFocus(results);
  const vuln = biggestVulnerability(results);

  return (
    <div className="px-6 py-10 md:px-10 md:py-12 max-w-5xl mx-auto">

      {/* Panko Score hero */}
      <section className="flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12 mb-12">
        <ScoreRing score={animatedScore} />
        <div className="flex-1 flex flex-col justify-center text-center md:text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
            Panko Score
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
            {dnaType ?? "Unscored"}
          </h1>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-md md:max-w-none">
            Your portfolio's overall health — a blend of return quality, drawdown control, diversification, and market sensitivity.
          </p>
          <button
            onClick={() => setActiveTab("analyze")}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-sky-400 hover:text-sky-300 self-center md:self-start"
          >
            See full breakdown
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* 3-card grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <MetricCard
          tone="rose"
          icon={AlertTriangle}
          label="Top risk driver"
          figure={top ? pct(top.pctRisk, 0) : "—"}
          body={
            top
              ? <>
                  <strong className="text-slate-100 font-bold">{top.ticker}</strong> drives this share of total risk from {pct(top.pctCapital, 0)} of capital{top.overweight ? "; overweight." : "."}
                </>
              : "No risk-contribution data available yet."
          }
        />
        <MetricCard
          tone="amber"
          icon={TrendingUp}
          label="Main vulnerability"
          figure={vuln ? vuln.figure : "—"}
          body={vuln ? vuln.body : "No structural vulnerabilities detected."}
        />
        <MetricCard
          tone="emerald"
          icon={Target}
          label="Suggested focus"
          figure={focus.figure}
          body={
            <>
              <strong className="text-slate-100 font-bold">{focus.title}.</strong>{" "}
              {focus.body}
            </>
          }
        />
      </section>
    </div>
  );
}
