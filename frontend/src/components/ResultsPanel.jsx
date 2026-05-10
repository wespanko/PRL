// Analyze results — DESIGN_BRIEF.md §7 Analyze
//
// Strict primary stack order:
//   1. AI Analyst Summary (full-width, --ink-50 bg)
//   2. Benchmark Attribution + Capital Efficiency side-by-side
//   3. Correlation Matrix full-width
//   4. Stress Scenarios row of 4 small cards
//   5. Drawdown chart full-width
//
// Other analytical sections (DNA, MetricsSummary, RiskContribution,
// Concentration, Exposures, CumulativeReturns, MonthlyHeatmap,
// WorstPeriods) are kept under "Supplementary analysis" below — not
// in §7 spec but preserve existing functionality. Tell me to drop any
// of them and I will.

import PortfolioDNA from "./PortfolioDNA";
import AnalystSummary from "./AnalystSummary";
import MetricsSummary from "./MetricsSummary";
import RiskContributionChart from "./RiskContributionChart";
import ConcentrationCard from "./ConcentrationCard";
import CapitalEfficiencyCard from "./CapitalEfficiencyCard";
import BenchmarkAttribution from "./BenchmarkAttribution";
import ExposuresCard from "./ExposuresCard";
import DrawdownChart from "./DrawdownChart";
import CumulativeReturnsChart from "./CumulativeReturnsChart";
import MonthlyReturnsHeatmap from "./MonthlyReturnsHeatmap";
import WorstPeriodsTable from "./WorstPeriodsTable";
import CorrelationMatrix from "./CorrelationMatrix";
import StressTable from "./StressTable";
import DownloadButton from "./DownloadButton";
import DiffCard from "./DiffCard";
import PeriodWarning from "./PeriodWarning";
import SaveSnapshotButton from "./SaveSnapshotButton";

export default function ResultsPanel({ results, payload, prevSnapshot, onLearnMore }) {
  const displayPeriod = results.actual_period ?? results.period;
  const hasMultipleTickers = results.tickers.length > 1;

  return (
    <div className="analyze-results">
      <header className="analyze-results-header">
        <div className="analyze-results-meta">
          <div className="pk-text-mono pk-ink-900 analyze-results-tickers">
            {results.tickers.join(" · ")}
          </div>
          <div className="pk-text-mono-sm pk-ink-400">
            {displayPeriod.start} → {displayPeriod.end}
          </div>
        </div>
        <div className="analyze-results-actions">
          <SaveSnapshotButton payload={payload} results={results} />
          <DownloadButton payload={payload} />
        </div>
      </header>

      <PeriodWarning results={results} payload={payload} />
      {prevSnapshot && <DiffCard prevSnapshot={prevSnapshot} results={results} />}

      {/* §7 #1 — AI Analyst Summary, full-width, --ink-50 bg */}
      <AnalystSummary summary={results.analyst_summary} />

      {/* §7 #2 — Benchmark Attribution + Capital Efficiency side-by-side */}
      <div className="analyze-2col">
        <BenchmarkAttribution
          attribution={results.benchmark_attribution}
          benchmark={results.benchmark ?? "SPY"}
        />
        <CapitalEfficiencyCard contributions={results.risk_contributions} />
      </div>

      {/* §7 #3 — Correlation Matrix, full-width */}
      {hasMultipleTickers && (
        <CorrelationMatrix
          matrix={results.correlation_matrix}
          tickers={results.tickers}
        />
      )}

      {/* §7 #4 — Stress Scenarios, row of 4 small cards */}
      <StressTable
        scenarios={results.stress_scenarios}
        breakdown={results.stress_breakdown}
      />

      {/* §7 #5 — Drawdown chart, full-width */}
      <DrawdownChart series={results.drawdown_series} />

      {/* Supplementary analysis — preserves existing components below
          the brief's primary stack. Not in §7 but valuable. */}
      <section className="analyze-supplementary" aria-label="Supplementary analysis">
        <div className="pk-text-heading-sm pk-ink-400 analyze-supplementary-label">
          Supplementary analysis
        </div>
        <PortfolioDNA dna={results.portfolio_dna} />
        <MetricsSummary results={results} onLearnMore={onLearnMore} />
        <RiskContributionChart contributions={results.risk_contributions} />
        <ConcentrationCard concentration={results.concentration} results={results} />
        <ExposuresCard exposures={results.exposures} />
        <CumulativeReturnsChart
          series={results.cumulative_return_series}
          benchmark={results.benchmark}
        />
        <MonthlyReturnsHeatmap monthlyReturns={results.monthly_returns} />
        <WorstPeriodsTable
          worstPeriods={results.worst_periods}
          bestPeriods={results.best_periods}
        />
      </section>
    </div>
  );
}
