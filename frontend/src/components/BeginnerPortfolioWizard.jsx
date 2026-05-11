import { useState } from "react";
import { generateThesis } from "../api/client";
import { profileFirstName } from "../utils/profile";
import { normalizeWeights } from "../utils/normalizeWeights";
import { Button, Badge } from "./ui";

// Icons restricted to §6-approved geometric glyphs.
const GOALS = [
  {
    id: "long_term_growth",
    icon: "▲",
    label: "Grow my money long-term",
    sub: "10+ year horizon. I want my money to compound. I can ride out the dips.",
    thesis:
      "I'm investing for the long term — 10+ years. I want a portfolio focused on growth, with US and international equity, some technology exposure, and a small bond allocation as a stabilizer. I can tolerate short-term drops to capture long-run compounding.",
  },
  {
    id: "avoid_losses",
    icon: "◐",
    label: "Avoid big losses",
    sub: "Steady growth is fine. I can't stomach a 30% drop.",
    thesis:
      "Capital preservation is my main goal. I want steady, modest growth and to cap drawdowns under 15%. I'll accept lower returns to avoid big losses. Bonds, defensive equity, and gold are welcome. I'm okay underperforming the market in good years if it means I can sleep through bad years.",
  },
  {
    id: "tech_growth",
    icon: "◍",
    label: "Bet on tech and AI",
    sub: "I think the next decade is AI, semis, and cloud. I want exposure but not unhedged.",
    thesis:
      "I'm bullish on AI infrastructure and US large-cap technology for the next 5-10 years — semis, cloud providers, and the megacaps building the rails. Tilt the portfolio toward this thematic bet but include some hedges (bonds, gold) to soften a tech correction or rate shock.",
  },
  {
    id: "balanced_starter",
    icon: "◎",
    label: "I'm not sure — give me a balanced starter",
    sub: "First-time investor. Build me something reasonable I can learn from.",
    thesis:
      "I'm new to investing and want a balanced starter portfolio. Some growth potential from broad equity, some safety from bonds, some diversification from international and gold. Nothing too aggressive or too conservative — a sensible first portfolio that lets me learn how the metrics work.",
  },
];

export default function BeginnerPortfolioWizard({
  profile, onComplete, onAnalyze, onSkip,
}) {
  const [step, setStep] = useState("goal"); // goal | suggesting | review | error
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
            : "Something went wrong fetching suggestions. Try a different goal or use the regular Thesis tab."
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
      <div className="container">
        <div className="wizard-hero">
          <span className="wizard-step-pill">Step 1 of 2</span>
          <h1 className="wizard-title">
            {firstName ? `${firstName}, what` : "What"} do you want from your money?
          </h1>
          <p className="wizard-sub">
            Pick whichever feels closest. We'll build a real portfolio for you, run the
            risk analysis, and explain what the numbers mean.
          </p>
        </div>

        <div className="wizard-goals">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="wizard-goal-card"
              onClick={() => pickGoal(g)}
            >
              <span className="wizard-goal-icon">{g.icon}</span>
              <div className="wizard-goal-text">
                <div className="wizard-goal-label">{g.label}</div>
                <div className="wizard-goal-sub">{g.sub}</div>
              </div>
              <span className="wizard-goal-arrow">→</span>
            </button>
          ))}
        </div>

        <Button variant="tertiary" onClick={onSkip} className="wizard-skip">
          Skip — show me the full app instead
        </Button>
      </div>
    );
  }

  if (step === "suggesting") {
    return (
      <div className="container">
        <div className="wizard-loading">
          <div className="spinner spinner--dark wizard-loading-spinner" />
          <h2 className="wizard-loading-title">Building your portfolio…</h2>
          <p className="wizard-loading-body">
            Mapping your goal to specific tickers from a curated list of broad ETFs
            and well-known names. Takes about 5 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="container">
        <div className="wizard-error">
          <h2 className="pk-text-heading-lg pk-ink-900">Something went wrong</h2>
          <p className="pk-text-body pk-ink-500 wizard-error-body">{error}</p>
          <Button variant="primary" onClick={() => setStep("goal")}>
            Try a different goal
          </Button>
        </div>
      </div>
    );
  }

  // step === "review"
  return (
    <div className="container">
      <div className="wizard-hero">
        <span className="wizard-step-pill">Step 2 of 2</span>
        <h1 className="wizard-title">Here's the portfolio we'd suggest.</h1>
        <p className="wizard-sub">{summary}</p>
        {themes.length > 0 && (
          <div className="wizard-themes">
            {themes.map((t) => (
              <Badge key={t} variant="blue">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="card wizard-suggestions">
        {suggestions.map((s, i) => {
          const equalPct = ((1 / suggestions.length) * 100).toFixed(1);
          return (
            <div key={s.ticker} className="wizard-holding">
              <div className="wizard-holding-line">
                <span className="wizard-holding-ticker">{s.ticker}</span>
                <span className="wizard-holding-name">{s.name}</span>
                <span className="wizard-holding-weight">{equalPct}%</span>
              </div>
              <div className="wizard-holding-reason">{s.reason}</div>
            </div>
          );
        })}
      </div>

      <div className="wizard-explain">
        <strong>Why equal weights?</strong> For your first portfolio, dividing evenly
        across all picks is the simplest baseline. After we run the risk analysis you
        can adjust any position from the Simulate tab and see exactly how it changes
        your numbers.
      </div>

      <div className="wizard-actions">
        <Button variant="secondary" onClick={() => setStep("goal")}>
          ← Back
        </Button>
        <Button
          variant="gold"
          onClick={buildAndAnalyze}
          disabled={suggestions.length === 0}
          className="wizard-go-btn"
        >
          Analyze this portfolio →
        </Button>
      </div>
    </div>
  );
}
