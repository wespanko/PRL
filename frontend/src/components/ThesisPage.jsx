// Build page — DESIGN_BRIEF.md §7
//
// Strict spec: Three-column grid (Quick Start | Pick a Diagnosis |
// Custom Thesis). Quick Start items are secondary buttons. Custom
// Thesis textarea uses the brief's "feel like a serious input" spec
// (ink-50 bg, ink-200 border, 4px radius, body-lg). Risk Tolerance is
// a segmented control with hairline borders, active filled blue-700.
// "Generate suggestions" is THE gold CTA — the page's single most
// important action per §4.

import { useState } from "react";
import { generateThesis } from "../api/client";
import { normalizeWeights } from "../utils/normalizeWeights";
import { Button, Card, Textarea, Badge, Banner } from "./ui";

// Beginner-friendly goal cards. preset_id matches a curated portfolio in
// backend/data/preset_portfolios.py — those clicks skip the LLM entirely.
// Icons use only the geometric glyphs §6 endorses (◍ ◎ ▲ ◆ ↕ ◐).
const QUICK_START_GOALS = [
  { id: "long_term_growth", icon: "▲", label: "Grow my money long-term", sub: "10+ year horizon. Compound through dips." },
  { id: "avoid_losses",     icon: "◐", label: "Avoid big losses",         sub: "Steady is fine. Cap drawdowns under 15%." },
  { id: "tech_growth",      icon: "◍", label: "Bet on tech and AI",       sub: "Tilt toward AI/semis, with hedges." },
  { id: "balanced_starter", icon: "◎", label: "Balanced starter",         sub: "First-time investor, sensible default." },
  { id: "stock_picker",     icon: "◆", label: "Pick individual stocks",   sub: "High-conviction names, not ETF-led." },
];

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
    icon: "↕",
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

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative" },
  { id: "balanced",     label: "Balanced" },
  { id: "aggressive",   label: "Aggressive" },
];

function PickButton({ icon, title, sub, onClick, disabled }) {
  return (
    <button
      type="button"
      className="pk-btn pk-btn--secondary build-pick"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="build-pick-icon" aria-hidden="true">{icon}</span>
      <span className="build-pick-text">
        <span className="build-pick-title">{title}</span>
        <span className="build-pick-sub">{sub}</span>
      </span>
    </button>
  );
}

function SuggestionRow({ s }) {
  const [expanded, setExpanded] = useState(false);
  const isStock = s.kind === "stock";
  const kindLabel = (s.kind || "etf").toUpperCase();
  const kindVariant = s.kind === "stock" ? "blue" : s.kind === "trust" ? "gold" : "default";

  return (
    <div className="build-sugg">
      <div className="build-sugg-head">
        <span className="build-sugg-ticker pk-text-mono">{s.ticker}</span>
        <Badge variant={kindVariant}>{kindLabel}</Badge>
        <span className="build-sugg-name">{s.name}</span>
        {typeof s.weight === "number" && (
          <span className="build-sugg-weight pk-text-mono-sm">
            {(s.weight * 100).toFixed(0)}%
          </span>
        )}
        {s.theme && <span className="build-sugg-theme">{s.theme}</span>}
      </div>
      {s.reason && <div className="build-sugg-reason">{s.reason}</div>}
      <div className="build-sugg-foot">
        {s.role && <span className="build-sugg-role">{s.role}</span>}
        {s.blurb && (
          <button
            type="button"
            className="pk-btn pk-btn--tertiary"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide" : `What is ${isStock ? "this company" : "this fund"}?`}
          </button>
        )}
      </div>
      {expanded && s.blurb && (
        <div className="build-sugg-blurb">{s.blurb}</div>
      )}
    </div>
  );
}

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
        setError(
          data.error === "no_api_key"
            ? "ANTHROPIC_API_KEY not set in backend/.env."
            : data.error,
        );
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
    if (!thesis.trim()) {
      setError("Write your thesis first.");
      return;
    }
    await callBackend({ thesis });
  }

  function pickQuickStart(goal) {
    setThesis("");
    setError(null);
    callBackend({ presetId: goal.id });
  }

  function pickDiagnosis(diag) {
    setThesis(diag.text);
    setError(null);
    callBackend({ presetId: diag.id });
  }

  function buildHoldings() {
    if (!result?.suggestions?.length) return [];
    const hasCuratedWeights = result.suggestions.every(
      (s) => typeof s.weight === "number" && s.weight > 0,
    );
    if (hasCuratedWeights) {
      return normalizeWeights(
        result.suggestions.map((s) => ({ ticker: s.ticker, weight: s.weight })),
      );
    }
    const n = result.suggestions.length;
    return normalizeWeights(
      result.suggestions.map((s) => ({ ticker: s.ticker, weight: 1 / n })),
    );
  }

  function handleAddToPortfolio() {
    const holdings = buildHoldings();
    if (!holdings.length) return;
    onUseInAnalyze?.(holdings);
  }

  return (
    <div className="container">
      <header className="build-header">
        <h1 className="pk-text-heading-lg pk-ink-900">Build a portfolio</h1>
        <p className="pk-text-body-lg pk-ink-500 build-header-sub">
          Pick a goal, choose a diagnosis, or write your own thesis — Panko
          maps it to specific tickers from a curated universe.
        </p>
      </header>

      <Banner variant="warning" title="Educational, not financial advice">
        Suggestions are mechanical mappings to a curated list of broad ETFs and
        well-known names. Run any idea through Analyze to see real risk numbers
        before acting.
      </Banner>

      <div className="build-3col">
        {/* Column 1: Quick Start — secondary buttons. §7 */}
        <Card className="build-col">
          <Card.Eyebrow>Quick start</Card.Eyebrow>
          <p className="pk-text-body-sm pk-ink-500 build-col-lead">
            Pick a goal. We'll suggest a curated portfolio.
          </p>
          <div className="build-col-stack">
            {QUICK_START_GOALS.map((g) => (
              <PickButton
                key={g.id}
                icon={g.icon}
                title={g.label}
                sub={g.sub}
                disabled={loading}
                onClick={() => pickQuickStart(g)}
              />
            ))}
          </div>
        </Card>

        {/* Column 2: Pick a Diagnosis. §7 */}
        <Card className="build-col">
          <Card.Eyebrow>Pick a diagnosis</Card.Eyebrow>
          <p className="pk-text-body-sm pk-ink-500 build-col-lead">
            A specific risk concern. Pre-fills your thesis below.
          </p>
          <div className="build-col-stack">
            {DIAGNOSIS_PRESETS.map((d) => (
              <PickButton
                key={d.id}
                icon={d.icon}
                title={d.label}
                sub={d.summary}
                disabled={loading}
                onClick={() => pickDiagnosis(d)}
              />
            ))}
          </div>
        </Card>

        {/* Column 3: Custom Thesis. §7 */}
        <Card className="build-col build-col--custom">
          <Card.Eyebrow>Custom thesis</Card.Eyebrow>
          <p className="pk-text-body-sm pk-ink-500 build-col-lead">
            Write what matters to you in your own words.
          </p>

          <Textarea
            value={thesis}
            onChange={(e) => {
              setThesis(e.target.value);
              setError(null);
            }}
            placeholder="e.g., I'm long AI infrastructure for 5+ years but want a meaningful hedge against rate shocks and inflation. Equity-tilted but not unhedged."
            rows={8}
            maxLength={4000}
          />

          {/* Risk Tolerance — segmented control, hairline borders,
              active filled blue-700. §5 */}
          <div className="build-risk">
            <div className="pk-text-caption pk-ink-400 build-risk-label">
              Risk tolerance
            </div>
            <div className="build-risk-seg" role="radiogroup" aria-label="Risk tolerance">
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={risk === r.id}
                  className={`build-risk-seg-item ${
                    risk === r.id ? "is-active" : ""
                  }`}
                  onClick={() => setRisk(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="build-error">
              <Banner variant="error">{error}</Banner>
            </div>
          )}

          {/* THE gold CTA per §7. */}
          <Button
            variant="gold"
            onClick={handleGenerate}
            disabled={loading}
            className="build-generate"
          >
            {loading ? "Mapping thesis…" : "Generate suggestions →"}
          </Button>
        </Card>
      </div>

      {result && (
        <Card className="build-result">
          <div className="build-result-head">
            <Card.Eyebrow>Detected themes</Card.Eyebrow>
            <div className="build-themes">
              {result.themes.map((t) => (
                <Badge key={t} variant="blue">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          {result.summary && (
            <p className="pk-text-body pk-ink-500 build-result-summary">
              {result.summary}
            </p>
          )}

          <div className="build-result-section">
            <Card.Eyebrow>
              Suggested holdings ({result.suggestions.length})
            </Card.Eyebrow>
            <div className="build-suggs">
              {result.suggestions.map((s) => (
                <SuggestionRow key={s.ticker} s={s} />
              ))}
            </div>
          </div>

          {result.suggestions.length > 0 && onUseInAnalyze && (
            <div className="build-result-actions">
              <Button variant="primary" onClick={handleAddToPortfolio}>
                Use as starting portfolio (equal-weight) →
              </Button>
              <span className="pk-text-body-sm pk-ink-400">
                Loads tickers into the Analyze form at equal weight. Adjust before running.
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
