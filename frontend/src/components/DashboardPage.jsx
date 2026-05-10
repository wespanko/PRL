// Dashboard — DESIGN_BRIEF.md §7
//
// Strict spec:
//   • Panko Score is the dramatic hero (§5: 96px Libre Baskerville
//     gold-500, /100 at 32px ink-300, DNA caption, ≥64px breathing room,
//     no card around it).
//   • Three-column grid below: Top Risk Driver | Main Vulnerability |
//     Suggested Focus. Each card: heading-sm label, body description,
//     single pulled-out mono figure.
//   • See-full-breakdown link to Analyze.
//
// Empty state: gold CTA "Try with example portfolio" + secondary
// "Or enter your own" (§4: gold reserved for the page's single most
// important CTA — empty dashboard's bootstrap action qualifies).

import { Button, Card } from "./ui";
import { useAnimatedNumber } from "../utils/useAnimatedNumber";
import {
  topRiskDriver,
  suggestedFocus,
  biggestVulnerability,
} from "../utils/dashboardMetrics";
import { pct } from "../utils/formatters";

function MetricCard({ label, figure, body }) {
  return (
    <Card className="dash-metric-card">
      <div className="pk-text-heading-sm pk-ink-400 dash-metric-label">{label}</div>
      <div className="pk-text-mono-lg pk-ink-900 dash-metric-figure">{figure}</div>
      <div className="pk-text-body pk-ink-500">{body}</div>
    </Card>
  );
}

export default function DashboardPage({
  results,
  prevSnapshot, // unused — Dashboard per §7 has no diff/changed tile
  setActiveTab,
  onRunDemo,
  loading,
}) {
  const hasResults = !!results;

  if (!hasResults) {
    return (
      <div className="container">
        <div className="dash-empty-state">
          <h1 className="pk-text-display-lg pk-ink-300 dash-empty-headline">
            No analysis yet
          </h1>
          <p className="pk-text-body-lg pk-ink-500 dash-empty-body">
            Add your tickers and weights and Panko will compute the full risk profile in seconds.
          </p>
          <div className="dash-empty-actions">
            {onRunDemo && (
              <Button variant="gold" onClick={onRunDemo} disabled={loading}>
                {loading ? "Loading example…" : "Try with example portfolio"}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setActiveTab("analyze")}
              disabled={loading}
            >
              Or enter your own
            </Button>
          </div>
          <p className="pk-text-caption pk-ink-400 dash-empty-note">
            The example is a tech-tilted balanced mix (NVDA, MSFT, AAPL, SPY, TLT, GLD…)
          </p>
        </div>
      </div>
    );
  }

  const panko = results.panko_score ?? null;
  const score = panko?.total ?? null;
  const dnaType = results.portfolio_dna?.type ?? null;

  const animatedScore = useAnimatedNumber(score ?? 0, 900);

  const top = topRiskDriver(results);
  const focus = suggestedFocus(results);
  const vuln = biggestVulnerability(results);

  return (
    <div className="container">
      {/* §5 Panko Score hero — the one moment the design is dramatic.
          96px Libre Baskerville in gold-500. /100 at 32px in ink-300.
          Caption below. ≥64px breathing room. No card. */}
      <section className="dash-score-hero" aria-label="Panko Score">
        {score != null ? (
          <>
            <div className="dash-score-line">
              <span className="dash-score-num">{Math.round(animatedScore)}</span>
              <span className="dash-score-denom">/100</span>
            </div>
            <div className="dash-score-caption pk-text-caption pk-ink-400">
              {dnaType ?? "Unscored"}
            </div>
          </>
        ) : (
          <div className="dash-score-caption pk-text-caption pk-ink-400">
            Unscored
          </div>
        )}
      </section>

      {/* §7: Three-column grid. */}
      <section className="dash-3col" aria-label="Headline risk findings">
        <MetricCard
          label="Top Risk Driver"
          figure={top ? pct(top.pctRisk, 0) : "—"}
          body={
            top
              ? `${top.ticker} drives this share of total risk from ${pct(top.pctCapital, 0)} of capital${top.overweight ? "; overweight." : "."}`
              : "No risk-contribution data available yet."
          }
        />
        <MetricCard
          label="Main Vulnerability"
          figure={vuln ? vuln.figure : "—"}
          body={vuln ? vuln.body : "No structural vulnerabilities detected."}
        />
        <MetricCard
          label="Suggested Focus"
          figure={focus.figure}
          body={
            <>
              <strong className="pk-ink-900">{focus.title}.</strong>{" "}
              {focus.body}
            </>
          }
        />
      </section>

      <div className="dash-deepdive">
        <Button variant="tertiary" onClick={() => setActiveTab("analyze")}>
          See full breakdown →
        </Button>
      </div>
    </div>
  );
}
