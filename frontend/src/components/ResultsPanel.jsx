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

  return (
    <div>
      <div className="results-header">
        <div className="results-header-text">
          <span className="results-tickers">{results.tickers.join(" · ")}</span>
          <span className="results-period">{displayPeriod.start} → {displayPeriod.end}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SaveSnapshotButton payload={payload} results={results} />
          <DownloadButton payload={payload} />
        </div>
      </div>

      <PeriodWarning results={results} payload={payload} />
      {prevSnapshot && <DiffCard prevSnapshot={prevSnapshot} results={results} />}

      <PortfolioDNA dna={results.portfolio_dna} />
      <AnalystSummary summary={results.analyst_summary} />
      <MetricsSummary results={results} onLearnMore={onLearnMore} />
      <BenchmarkAttribution attribution={results.benchmark_attribution} benchmark={results.benchmark ?? "SPY"} />
      <RiskContributionChart contributions={results.risk_contributions} />
      <CapitalEfficiencyCard contributions={results.risk_contributions} />
      <ConcentrationCard concentration={results.concentration} results={results} />
      <ExposuresCard exposures={results.exposures} />
      <CumulativeReturnsChart series={results.cumulative_return_series} benchmark={results.benchmark} />
      <DrawdownChart series={results.drawdown_series} />
      <MonthlyReturnsHeatmap monthlyReturns={results.monthly_returns} />
      <WorstPeriodsTable worstPeriods={results.worst_periods} bestPeriods={results.best_periods} />
      {results.tickers.length > 1 && (
        <CorrelationMatrix matrix={results.correlation_matrix} tickers={results.tickers} />
      )}
      <StressTable scenarios={results.stress_scenarios} breakdown={results.stress_breakdown} />
    </div>
  );
}
