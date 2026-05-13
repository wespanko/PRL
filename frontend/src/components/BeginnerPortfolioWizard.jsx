import { useState } from "react";
import {
  TrendingUp, ShieldCheck, Cpu, Scale,
  ArrowRight, ArrowLeft, Loader2, Sparkles,
} from "lucide-react";
import { generateThesis } from "../api/client";
import { profileFirstName } from "../utils/profile";
import { normalizeWeights } from "../utils/normalizeWeights";

const GOALS = [
  { id: "long_term_growth", icon: TrendingUp,  label: "Grow my money long-term",                        sub: "10+ year horizon. I want my money to compound. I can ride out the dips.", thesis: "I'm investing for the long term — 10+ years. I want a portfolio focused on growth, with US and international equity, some technology exposure, and a small bond allocation as a stabilizer. I can tolerate short-term drops to capture long-run compounding." },
  { id: "avoid_losses",     icon: ShieldCheck, label: "Avoid big losses",                              sub: "Steady growth is fine. I can't stomach a 30% drop.",                       thesis: "Capital preservation is my main goal. I want steady, modest growth and to cap drawdowns under 15%. I'll accept lower returns to avoid big losses. Bonds, defensive equity, and gold are welcome. I'm okay underperforming the market in good years if it means I can sleep through bad years." },
  { id: "tech_growth",      icon: Cpu,         label: "Bet on tech and AI",                            sub: "I think the next decade is AI, semis, and cloud. I want exposure but not unhedged.", thesis: "I'm bullish on AI infrastructure and US large-cap technology for the next 5-10 years — semis, cloud providers, and the megacaps building the rails. Tilt the portfolio toward this thematic bet but include some hedges (bonds, gold) to soften a tech correction or rate shock." },
  { id: "balanced_starter", icon: Scale,       label: "I'm not sure — give me a balanced starter",     sub: "First-time investor. Build me something reasonable I can learn from.",     thesis: "I'm new to investing and want a balanced starter portfolio. Some growth potential from broad equity, some safety from bonds, some diversification from international and gold. Nothing too aggressive or too conservative — a sensible first portfolio that lets me learn how the metrics work." },
];

function StepPill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
      <Sparkles className="h-3 w-3" strokeWidth={2.75} />
      {children}
    </span>
  );
}

export default function BeginnerPortfolioWizard({
  profile, onComplete, onAnalyze, onSkip,
}) {
  const [step, setStep] = useState("goal");
  const [goalId, setGoalId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [themes, setThemes] = useState([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState(null);

  const firstName = profileFirstName(profile.name);

  async function pickGoal(goal) {
    setGoalId(goal.id);
    setStep("suggesting");
    setError(null);
    try {
      const data = await generateThesis({
        thesis: goal.thesis,
        risk_tolerance: profile.riskTolerance ?? "balanced",
      });
      if (data.error) {
        setError(
          data.error === "no_api_key"
            ? "AI suggestions are temporarily unavailable. You can still pick tickers manually."
            : "Something went wrong fetching suggestions. Try a different goal or use the regular Thesis tab.",
        );
        setStep("error");
        return;
      }
      setSuggestions(data.suggestions || []);
      setThemes(data.themes || []);
      setSummary(data.summary || "");
      setStep("review");
    } catch (e) {
      setError(e.message || "Network error");
      setStep("error");
    }
  }

  function buildAndAnalyze() {
    const n = suggestions.length;
    if (n === 0) return;
    const raw = suggestions.map((s) => ({ ticker: s.ticker, weight: 1 / n }));
    const holdings = normalizeWeights(raw);
    onComplete?.();
    onAnalyze?.({
      holdings,
      start_date: "2022-01-01",
      end_date: "2025-01-01",
      benchmark: "SPY",
      risk_free_rate: 0.045,
    });
  }

  if (step === "goal") {
    return (
      <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <StepPill>Step 1 of 2</StepPill>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {firstName ? `${firstName}, what` : "What"} do you want from your money?
          </h1>
          <p className="mt-3 text-slate-500 text-base md:text-lg leading-relaxed">
            Pick whichever feels closest. We'll build a real portfolio for you, run the risk analysis, and explain what the numbers mean.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => pickGoal(g)}
                className="w-full text-left bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm rounded-xl p-5 flex items-center gap-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icon className="h-6 w-6" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{g.label}</div>
                  <div className="text-sm text-slate-500 mt-0.5 leading-relaxed">{g.sub}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={2.5} />
              </button>
            );
          })}
        </div>

        <button
          onClick={onSkip}
          className="block mx-auto text-sm font-bold text-slate-500 hover:text-slate-500"
        >
          Skip — show me the full app instead
        </button>
      </div>
    );
  }

  if (step === "suggesting") {
    return (
      <div className="px-6 py-16 md:px-10 max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Loader2 className="h-8 w-8 animate-spin" strokeWidth={2.25} />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
          Building your portfolio…
        </h2>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed">
          Mapping your goal to specific tickers from a curated list of broad ETFs and well-known names. Takes about 5 seconds.
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="px-6 py-16 md:px-10 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => setStep("goal")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold px-6 py-3.5 transition-colors active:scale-[0.99]"
        >
          Try a different goal
        </button>
      </div>
    );
  }

  // step === "review"
  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <StepPill>Step 2 of 2</StepPill>
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Here's the portfolio we'd suggest.
        </h1>
        <p className="mt-3 text-slate-500 text-base md:text-lg leading-relaxed">{summary}</p>
        {themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <span key={t} className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5">
        {suggestions.map((s) => {
          const equalPct = ((1 / suggestions.length) * 100).toFixed(1);
          return (
            <div key={s.ticker} className="p-4 md:p-5">
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <span className="font-mono font-bold text-slate-900">{s.ticker}</span>
                <span className="text-sm text-slate-500 font-medium">{s.name}</span>
                <span className="ml-auto font-mono font-bold text-indigo-600 tabular-nums">{equalPct}%</span>
              </div>
              {s.reason && (
                <div className="text-sm text-slate-500 leading-relaxed">{s.reason}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 mb-6 text-sm leading-relaxed text-indigo-800/90">
        <strong className="text-indigo-900">Why equal weights?</strong> For your first portfolio, dividing evenly across all picks is the simplest baseline. After we run the risk analysis you can adjust any position from the Simulate tab and see exactly how it changes your numbers.
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep("goal")}
          className="px-6 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Back
        </button>
        <button
          onClick={buildAndAnalyze}
          disabled={suggestions.length === 0}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-lg font-bold py-3.5 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-indigo-200 disabled:shadow-none"
        >
          Analyze this portfolio
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
