import { useState } from "react";
import {
  TrendingUp, ShieldCheck, Cpu, Scale, Target,
  Flame, AlertTriangle, TrendingDown,
  ArrowRight, Sparkles, Loader2, Info,
} from "lucide-react";
import { generateThesis } from "../api/client";
import { normalizeWeights } from "../utils/normalizeWeights";

const QUICK_START_GOALS = [
  { id: "long_term_growth", icon: TrendingUp,  label: "Grow my money long-term", sub: "10+ year horizon. Compound through dips." },
  { id: "avoid_losses",     icon: ShieldCheck, label: "Avoid big losses",         sub: "Steady is fine. Cap drawdowns under 15%." },
  { id: "tech_growth",      icon: Cpu,         label: "Bet on tech and AI",       sub: "Tilt toward AI/semis, with hedges." },
  { id: "balanced_starter", icon: Scale,       label: "Balanced starter",         sub: "First-time investor, sensible default." },
  { id: "stock_picker",     icon: Target,      label: "Pick individual stocks",   sub: "High-conviction names, not ETF-led." },
];

const DIAGNOSIS_PRESETS = [
  { id: "retirement_safety", icon: ShieldCheck,    label: "Retirement Safety", summary: "Capital preservation with some equity participation; cap drawdowns; inflation protection.",
    text: "I'm 5-7 years from retirement and need capital preservation with some equity participation. Drawdowns over 15% are unacceptable — I don't have time to recover from a 2008 or 2022 again. Inflation protection matters because I'll be drawing from this in real terms. I'm okay underperforming in bull markets if it means I can sleep through bear markets." },
  { id: "inflation_defense", icon: Flame,          label: "Inflation Defense", summary: "Persistent-inflation hedge: TIPS, gold, commodities, real assets, low-duration.",
    text: "I'm worried about persistent inflation and rate shocks. I want explicit inflation protection (TIPS, gold, real assets) and a portfolio that doesn't get crushed when long-duration bonds sell off. Equities are fine but not rate-sensitive growth — more value, energy, and pricing-power names." },
  { id: "ai_bubble_risk",    icon: AlertTriangle,  label: "AI Bubble Risk",    summary: "Hedge concentration in AI/megacap tech without leaving the trade entirely.",
    text: "I'm worried about an AI / megacap tech valuation bubble. I have meaningful exposure to NVDA, MSFT, GOOGL — I don't want to fully exit that position because the long-term thesis is real, but I need explicit hedges against a violent correction. International, defensive sectors, gold, and bonds that won't crash with tech." },
  { id: "recession_shock",   icon: TrendingDown,   label: "Recession Shock",   summary: "Portfolio that holds up in a recession: long-duration treasuries, defensives, gold.",
    text: "I want a portfolio engineered to hold up specifically in a recession scenario. Long-duration treasuries to benefit from rate cuts, defensive sectors (staples, healthcare, utilities), gold for crisis hedge, minimal cyclical exposure. I'm fine giving up some bull-market upside." },
];

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative" },
  { id: "balanced",     label: "Balanced" },
  { id: "aggressive",   label: "Aggressive" },
];

// ── pick card ────────────────────────────────────────────────────────
function PickCard({ icon: Icon, title, sub, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left flex items-center gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/60 text-slate-500">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</div>
      </div>
    </button>
  );
}

// ── suggestion row ──────────────────────────────────────────────────
function SuggestionRow({ s }) {
  const [expanded, setExpanded] = useState(false);
  const isStock = s.kind === "stock";

  const kindTone =
    s.kind === "stock" ? "bg-cyan-500/15 text-cyan-400" :
    s.kind === "trust" ? "bg-amber-500/15 text-amber-300" :
                         "bg-slate-800/60 text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-mono font-bold text-slate-100">{s.ticker}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${kindTone}`}>
          {(s.kind || "etf").toUpperCase()}
        </span>
        <span className="text-sm text-slate-600 font-medium">{s.name}</span>
        {typeof s.weight === "number" && (
          <span className="ml-auto font-mono font-bold text-cyan-400 tabular-nums">
            {(s.weight * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {s.theme && (
        <div className="text-xs text-slate-500 italic mb-2">{s.theme}</div>
      )}
      {s.reason && (
        <div className="text-sm text-slate-500 leading-relaxed">{s.reason}</div>
      )}
      <div className="flex items-center gap-3 mt-3">
        {s.role && (
          <span className="text-xs font-semibold text-slate-500">{s.role}</span>
        )}
        {s.blurb && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 ml-auto"
          >
            {expanded ? "Hide" : `What is ${isStock ? "this company" : "this fund"}?`}
          </button>
        )}
      </div>
      {expanded && s.blurb && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
          {s.blurb}
        </div>
      )}
    </div>
  );
}

// ── main ────────────────────────────────────────────────────────────
export default function ThesisPage({ onUseInAnalyze, profile }) {
  const [thesis, setThesis] = useState("");
  const [risk, setRisk] = useState(profile?.riskTolerance ?? "balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function callBackend({ thesis: thesisText, presetId, riskOverride }) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateThesis({
        thesis: thesisText ?? "",
        risk_tolerance: riskOverride ?? risk,
        ...(presetId ? { preset_id: presetId } : {}),
      });
      if (data.error) {
        setError(data.error === "no_api_key" ? "ANTHROPIC_API_KEY not set in backend/.env." : data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!thesis.trim()) { setError("Write your thesis first."); return; }
    await callBackend({ thesis });
  }

  function pickQuickStart(goal) { setThesis(""); setError(null); callBackend({ presetId: goal.id }); }
  function pickDiagnosis(diag)  { setThesis(diag.text); setError(null); callBackend({ presetId: diag.id }); }

  function buildHoldings() {
    if (!result?.suggestions?.length) return [];
    const hasCuratedWeights = result.suggestions.every((s) => typeof s.weight === "number" && s.weight > 0);
    if (hasCuratedWeights) {
      return normalizeWeights(result.suggestions.map((s) => ({ ticker: s.ticker, weight: s.weight })));
    }
    const n = result.suggestions.length;
    return normalizeWeights(result.suggestions.map((s) => ({ ticker: s.ticker, weight: 1 / n })));
  }

  function handleAddToPortfolio() {
    const holdings = buildHoldings();
    if (holdings.length) onUseInAnalyze?.(holdings);
  }

  return (
    <div className="px-6 py-10 md:px-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 mb-2">Build a portfolio</h1>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl">
          Pick a goal, choose a diagnosis, or write your own thesis — Panko maps it to specific tickers from a curated universe.
        </p>
      </header>

      {/* Educational banner */}
      <div className="mb-8 flex gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <Info className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-200">Educational, not financial advice</p>
          <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
            Suggestions are mechanical mappings to a curated list of broad ETFs and well-known names. Run any idea through Analyze to see real risk numbers before acting.
          </p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

        {/* Quick start */}
        <section className="bg-slate-950 border border-slate-800 rounded-3xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Quick start</div>
          <p className="text-sm text-slate-500 mb-4">Pick a goal. We'll suggest a curated portfolio.</p>
          <div className="space-y-2">
            {QUICK_START_GOALS.map((g) => (
              <PickCard key={g.id} icon={g.icon} title={g.label} sub={g.sub} onClick={() => pickQuickStart(g)} disabled={loading} />
            ))}
          </div>
        </section>

        {/* Diagnosis presets */}
        <section className="bg-slate-950 border border-slate-800 rounded-3xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Pick a diagnosis</div>
          <p className="text-sm text-slate-500 mb-4">A specific risk concern. Pre-fills your thesis below.</p>
          <div className="space-y-2">
            {DIAGNOSIS_PRESETS.map((d) => (
              <PickCard key={d.id} icon={d.icon} title={d.label} sub={d.summary} onClick={() => pickDiagnosis(d)} disabled={loading} />
            ))}
          </div>
        </section>

        {/* Custom thesis */}
        <section className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Custom thesis</div>
          <p className="text-sm text-slate-500 mb-4">Write what matters to you in your own words.</p>

          <textarea
            value={thesis}
            onChange={(e) => { setThesis(e.target.value); setError(null); }}
            placeholder="e.g., I'm long AI infrastructure for 5+ years but want a meaningful hedge against rate shocks and inflation. Equity-tilted but not unhedged."
            rows={8}
            maxLength={4000}
            className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:bg-slate-950 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none mb-4"
          />

          {/* Risk tolerance */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Risk tolerance</label>
            <div className="flex bg-slate-800/60 rounded-full p-1 gap-1">
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRisk(r.id)}
                  className={`flex-1 px-3 py-2 rounded-full text-xs font-bold transition-colors
                    ${risk === r.id ? "bg-slate-950 text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-100"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 mb-4 text-sm font-medium text-rose-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-auto w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl font-bold py-4 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-cyan-500/25 disabled:shadow-none"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />Mapping thesis…</>
            ) : (
              <>Generate suggestions <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></>
            )}
          </button>
        </section>
      </div>

      {/* Results */}
      {result && (
        <section className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Detected themes</div>
            <div className="flex flex-wrap gap-1.5">
              {result.themes.map((t) => (
                <span key={t} className="bg-cyan-500/15 text-cyan-400 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {result.summary && (
            <p className="text-slate-600 leading-relaxed mb-6">{result.summary}</p>
          )}

          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
            Suggested holdings ({result.suggestions.length})
          </div>
          <div className="space-y-2">
            {result.suggestions.map((s) => (
              <SuggestionRow key={s.ticker} s={s} />
            ))}
          </div>

          {result.suggestions.length > 0 && onUseInAnalyze && (
            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleAddToPortfolio}
                className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl font-bold px-6 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-cyan-500/25"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                Use as starting portfolio (equal-weight)
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <p className="text-xs text-slate-500 leading-relaxed">
                Loads tickers into the Analyze form at equal weight. Adjust before running.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
