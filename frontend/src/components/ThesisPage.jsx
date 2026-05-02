import { useState } from "react";
import { generateThesis } from "../api/client";
import { normalizeWeights } from "../utils/normalizeWeights";

const DIAGNOSIS_PRESETS = [
  {
    id: "retirement_safety",
    label: "Retirement Safety",
    icon: "◐",
    summary: "Capital preservation with some equity participation; cap drawdowns; inflation protection.",
    text: "I'm 5-7 years from retirement and need capital preservation with some equity participation. Drawdowns over 15% are unacceptable — I don't have time to recover from a 2008 or 2022 again. Inflation protection matters because I'll be drawing from this in real terms. I'm okay underperforming in bull markets if it means I can sleep through bear markets.",
  },
  {
    id: "inflation_defense",
    label: "Inflation Defense",
    icon: "▲",
    summary: "Persistent-inflation hedge: TIPS, gold, commodities, real assets, low-duration.",
    text: "I'm worried about persistent inflation and rate shocks. I want explicit inflation protection (TIPS, gold, real assets) and a portfolio that doesn't get crushed when long-duration bonds sell off. Equities are fine but not rate-sensitive growth — more value, energy, and pricing-power names.",
  },
  {
    id: "ai_bubble_risk",
    label: "AI Bubble Risk",
    icon: "✦",
    summary: "Hedge concentration in AI/megacap tech without leaving the trade entirely.",
    text: "I'm worried about an AI / megacap tech valuation bubble. I have meaningful exposure to NVDA, MSFT, GOOGL — I don't want to fully exit that position because the long-term thesis is real, but I need explicit hedges against a violent correction. International, defensive sectors, gold, and bonds that won't crash with tech.",
  },
  {
    id: "recession_shock",
    label: "Recession Shock",
    icon: "↻",
    summary: "Portfolio that holds up in a recession: long-duration treasuries, defensives, gold.",
    text: "I want a portfolio engineered to hold up specifically in a recession scenario. Long-duration treasuries to benefit from rate cuts, defensive sectors (staples, healthcare, utilities), gold for crisis hedge, minimal cyclical exposure. I'm fine giving up some bull-market upside.",
  },
];

const EXAMPLE_THESES = [
  {
    label: "Long AI infrastructure, hedged for rate shocks",
    text: "I'm bullish on AI infrastructure for the next 5+ years — semis, cloud providers, and the megacaps building the rails. But I want meaningful protection against another rate shock and inflation re-acceleration. Balanced toward growth but not unhedged.",
  },
  {
    label: "Diversified beyond US tech concentration",
    text: "I currently own a lot of US large-cap tech and I want to diversify beyond it without abandoning equities. International exposure, defensive sectors, real assets. I want to reduce my correlation to QQQ.",
  },
];

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative", body: "Capital preservation first" },
  { id: "balanced",     label: "Balanced",     body: "Growth with risk control" },
  { id: "aggressive",   label: "Aggressive",   body: "Growth-tilted, higher volatility tolerance" },
];

export default function ThesisPage({ onUseInAnalyze }) {
  const [thesis, setThesis] = useState("");
  const [risk, setRisk] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleGenerate() {
    if (!thesis.trim()) {
      setError("Write your thesis first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateThesis({ thesis: thesis.trim(), risk_tolerance: risk });
      if (data.error) {
        setError(data.error === "no_api_key"
          ? "ANTHROPIC_API_KEY not set in backend/.env."
          : data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildEqualWeightHoldings() {
    if (!result?.suggestions?.length) return [];
    const n = result.suggestions.length;
    // Equal-weight raw, then normalize so the total is exactly 1.0
    const raw = result.suggestions.map((s) => ({ ticker: s.ticker, weight: 1 / n }));
    return normalizeWeights(raw);
  }

  function handleAddToPortfolio() {
    const holdings = buildEqualWeightHoldings();
    if (!holdings.length) return;
    onUseInAnalyze?.(holdings);
  }

  return (
    <div className="container">
      <div className="thesis-hero">
        <h1 className="thesis-hero-title">Thesis → Portfolio</h1>
        <p className="thesis-hero-sub">
          Write what you believe — your view, your concerns, your timeline. We'll map it to
          specific tickers from a curated universe with reasoning. <strong>Educational, not advice.</strong>
        </p>
      </div>

      <div className="thesis-disclaimer">
        Suggestions are mechanical mappings from your thesis to a curated universe of broad
        ETFs and well-known names. They are <strong>not financial advice</strong>. They have
        not been vetted for your individual situation, taxes, or liquidity needs. Run any idea
        through the Analyze tab to see real risk numbers before acting.
      </div>

      <div className="card">
        <div className="thesis-section-label">Pick a diagnosis</div>
        <div className="thesis-diagnosis-grid">
          {DIAGNOSIS_PRESETS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="thesis-diagnosis-card"
              onClick={() => { setThesis(d.text); setError(null); }}
            >
              <span className="thesis-diagnosis-icon">{d.icon}</span>
              <div className="thesis-diagnosis-text">
                <div className="thesis-diagnosis-label">{d.label}</div>
                <div className="thesis-diagnosis-summary">{d.summary}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="thesis-section-label" style={{ marginTop: 24 }}>
          Or write your own thesis
        </div>
        <textarea
          className="thesis-textarea"
          placeholder="e.g., I'm long AI infrastructure for 5+ years but want a meaningful hedge against rate shocks and inflation. Equity-tilted but not unhedged."
          value={thesis}
          onChange={(e) => { setThesis(e.target.value); setError(null); }}
          rows={6}
          maxLength={4000}
        />

        <div className="thesis-examples">
          <span className="thesis-examples-label">Or start from an example:</span>
          {EXAMPLE_THESES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="thesis-example-btn"
              onClick={() => { setThesis(ex.text); setError(null); }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="thesis-section-label" style={{ marginTop: 18 }}>Risk tolerance</div>
        <div className="thesis-risk-grid">
          {RISK_LEVELS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`thesis-risk-card ${risk === r.id ? "thesis-risk-card--active" : ""}`}
              onClick={() => setRisk(r.id)}
            >
              <div className="thesis-risk-label">{r.label}</div>
              <div className="thesis-risk-body">{r.body}</div>
            </button>
          ))}
        </div>

        {error && <div className="error" style={{ marginTop: 14 }}>{error}</div>}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={loading}
          style={{ marginTop: 18 }}
        >
          {loading ? <><span className="spinner" /> Mapping thesis…</> : "Generate suggestions →"}
        </button>
      </div>

      {result && (
        <div className="card">
          <div className="thesis-result-header">
            <div>
              <div className="thesis-section-label">Detected themes</div>
              <div className="thesis-themes">
                {result.themes.map((t) => (
                  <span key={t} className="thesis-theme-pill">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {result.summary && (
            <p className="thesis-summary">{result.summary}</p>
          )}

          <div className="thesis-section-label" style={{ marginTop: 22 }}>
            Suggested holdings ({result.suggestions.length})
          </div>
          <div className="thesis-suggestions">
            {result.suggestions.map((s) => (
              <div key={s.ticker} className="thesis-suggestion">
                <div className="thesis-suggestion-head">
                  <span className="thesis-suggestion-ticker">{s.ticker}</span>
                  <span className="thesis-suggestion-name">{s.name}</span>
                  <span className="thesis-suggestion-theme">{s.theme}</span>
                </div>
                <div className="thesis-suggestion-reason">{s.reason}</div>
                <div className="thesis-suggestion-role">{s.role}</div>
              </div>
            ))}
          </div>

          {result.suggestions.length > 0 && onUseInAnalyze && (
            <div className="thesis-actions">
              <button className="btn btn-primary" onClick={handleAddToPortfolio}>
                Use as starting portfolio (equal-weight) →
              </button>
              <span className="thesis-actions-note">
                Loads tickers into the Analyze form at equal weight. Adjust before running.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
