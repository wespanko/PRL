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
      className="w-full text-left flex items-center gap-3 p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-900">{title}</div>
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
    s.kind === "stock" ? "bg-indigo-50 text-indigo-600" :
    s.kind === "trust" ? "bg-amber-100 text-amber-700" :
                         "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-mono font-bold text-slate-900">{s.ticker}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${kindTone}`}>
          {(s.kind || "etf").toUpperCase()}
        </span>
        <span className="text-sm text-slate-500 font-medium">{s.name}</span>
        {typeof s.weight === "number" && (
          <span className="ml-auto font-mono font-bold text-indigo-600 tabular-nums">
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
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 ml-auto"
          >
            {expanded ? "Hide" : `What is ${isStock ? "this company" : "this fund"}?`}
          </button>
        )}
      </div>
      {expanded && s.blurb && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
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
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Build a portfolio</h1>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl">
          Pick a goal, choose a diagnosis, or write your own thesis — Panko maps it to specific tickers from a curated universe.
        </p>
      </header>

      {/* Educational banner */}
      <div className="mb-8 flex gap-3 rounded-lg bg-amber-50 border border-amber-200 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <Info className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-700">Educational, not financial advice</p>
          <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">
            Suggestions are mechanical mappings to a curated list of broad ETFs and well-known names. Run any idea through Analyze to see real risk numbers before acting.
          </p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

        {/* Quick start */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">Quick start</div>
          <p className="text-sm text-slate-500 mb-4">Pick a goal. We'll suggest a curated portfolio.</p>
          <div className="space-y-2">
            {QUICK_START_GOALS.map((g) => (
              <PickCard key={g.id} icon={g.icon} title={g.label} sub={g.sub} onClick={() => pickQuickStart(g)} disabled={loading} />
            ))}
          </div>
        </section>

        {/* Diagnosis presets */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">Pick a diagnosis</div>
          <p className="text-sm text-slate-500 mb-4">A specific risk concern. Pre-fills your thesis below.</p>
          <div className="space-y-2">
            {DIAGNOSIS_PRESETS.map((d) => (
              <PickCard key={d.id} icon={d.icon} title={d.label} sub={d.summary} onClick={() => pickDiagnosis(d)} disabled={loading} />
            ))}
          </div>
        </section>

        {/* Custom thesis */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">Custom thesis</div>
          <p className="text-sm text-slate-500 mb-4">Write what matters to you in your own words.</p>

          <textarea
            value={thesis}
            onChange={(e) => { setThesis(e.target.value); setError(null); }}
            placeholder="e.g., I'm long AI infrastructure for 5+ years but want a meaningful hedge against rate shocks and inflation. Equity-tilted but not unhedged."
            rows={8}
            maxLength={4000}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors resize-none mb-4"
          />

          {/* Risk tolerance */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Risk tolerance</label>
            <div className="flex bg-slate-100 rounded-full p-1 gap-1">
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRisk(r.id)}
                  className={`flex-1 px-3 py-2 rounded-full text-xs font-bold transition-colors
                    ${risk === r.id ? "bg-transparent text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-lg font-bold py-4 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-indigo-200 disabled:shadow-none"
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
        <section className="bg-white border border-slate-200 rounded-xl p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Detected themes</div>
            <div className="flex flex-wrap gap-1.5">
              {result.themes.map((t) => (
                <span key={t} className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {result.summary && (
            <p className="text-slate-500 leading-relaxed mb-6">{result.summary}</p>
          )}

          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">
            Suggested holdings ({result.suggestions.length})
          </div>
          <div className="space-y-2">
            {result.suggestions.map((s) => (
              <SuggestionRow key={s.ticker} s={s} />
            ))}
          </div>

          {result.suggestions.length > 0 && onUseInAnalyze && (
            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleAddToPortfolio}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold px-6 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-indigo-200"
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
