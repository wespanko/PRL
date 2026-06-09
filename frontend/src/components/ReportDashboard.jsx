import { ArrowLeft, AlertCircle } from "lucide-react";
import RiskScoreCard from "./RiskScoreCard";
import MetricCard from "./MetricCard";
import EquityCurveChart from "./EquityCurveChart";
import DrawdownChart from "./DrawdownChart";
import OutlierAnalysis from "./OutlierAnalysis";
import BehaviorLeaks from "./BehaviorLeaks";
import TimeOfDayChart from "./TimeOfDayChart";
import PropFirmSimulator from "./PropFirmSimulator";
import RecommendedRules from "./RecommendedRules";
import Footer from "./Footer";
import { fmtMoney, fmtPct, fmtInt, tone } from "../lib/format";

export default function ReportDashboard({ report, trades, onBack, sourceLabel }) {
  const { basic, curve, dd, ddStats, streaks, daily, dailyStats, sharpe, outliers, leaks, time, score, label, confidence, rules, anyEstimated } = report;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-900 sticky top-0 z-10 bg-zinc-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" /> New analysis
          </button>
          <div className="text-xs text-zinc-500">
            {sourceLabel} · {fmtInt(basic.numTrades)} trades · analyzed in-browser
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-50">Reality Check Report</h2>
            <p className="mt-2 text-zinc-400">
              A direct read on your edge, outlier dependence, drawdown risk, and behavior leaks.
            </p>
          </div>

          {anyEstimated && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Some P&L values were estimated from entry/exit/side because the file did not include a net P&L column.
                Estimated P&L treats one unit of price movement as $1 per contract — for futures, the dollar value per point may be different.
              </div>
            </div>
          )}

          <RiskScoreCard score={score} label={label} confidence={confidence} />

          <SectionHeader title="Key metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total P&L" value={fmtMoney(basic.totalPnl, { sign: true })} tone={basic.totalPnl > 0 ? "positive" : "negative"} />
            <MetricCard label="Win rate" value={fmtPct(basic.winRate)} sublabel={`${basic.winners} wins / ${basic.losers} losses`} />
            <MetricCard label="Profit factor" value={basic.profitFactor === Infinity ? "∞" : basic.profitFactor.toFixed(2)} sublabel="Gross win / gross loss" tone={basic.profitFactor > 1.2 ? "positive" : basic.profitFactor < 1 ? "negative" : "neutral"} />
            <MetricCard label="Expectancy / trade" value={fmtMoney(basic.expectancy, { sign: true })} tone={basic.expectancy > 0 ? "positive" : "negative"} />
            <MetricCard label="Avg win" value={fmtMoney(basic.avgWin)} tone="positive" />
            <MetricCard label="Avg loss" value={fmtMoney(basic.avgLoss)} tone="negative" />
            <MetricCard label="Best trade" value={fmtMoney(basic.best)} tone="positive" />
            <MetricCard label="Worst trade" value={fmtMoney(basic.worst)} tone="negative" />
          </div>

          <SectionHeader title="Risk" />
          <div className="grid md:grid-cols-2 gap-6">
            <EquityCurveChart curve={curve} />
            <DrawdownChart dd={dd} ddStats={ddStats} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Max drawdown" value={fmtMoney(ddStats.maxDrawdown)} tone="negative" />
            <MetricCard label="Worst losing streak" value={`${streaks.worstLosingStreak} trades`} tone={streaks.worstLosingStreak > 5 ? "warn" : "neutral"} />
            <MetricCard label="Best day" value={dailyStats.bestDay ? fmtMoney(dailyStats.bestDay.pnl) : "—"} sublabel={dailyStats.bestDay?.date || ""} tone="positive" />
            <MetricCard label="Worst day" value={dailyStats.worstDay ? fmtMoney(dailyStats.worstDay.pnl) : "—"} sublabel={dailyStats.worstDay?.date || ""} tone="negative" />
            <MetricCard label="Std dev / trade" value={fmtMoney(basic.stddev)} sublabel="Trade-level volatility" />
            <MetricCard label="Sharpe-like" value={sharpe.toFixed(2)} sublabel="Mean / stddev per trade" />
            <MetricCard label="Trading days" value={fmtInt(dailyStats.days)} />
            <MetricCard label="Trades / day" value={dailyStats.days ? (basic.numTrades / dailyStats.days).toFixed(1) : "—"} />
          </div>

          <SectionHeader title="Outlier dependence" />
          <OutlierAnalysis basic={basic} outliers={outliers} />

          <SectionHeader title="Behavior leaks" />
          <BehaviorLeaks leaks={leaks} />

          <SectionHeader title="Time analysis" />
          <TimeOfDayChart time={time} />

          <SectionHeader title="Prop firm survival" />
          <PropFirmSimulator trades={trades} daily={daily} />

          <SectionHeader title="Recommended rules" />
          <RecommendedRules rules={rules} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="pt-4">
      <h3 className="text-lg font-medium text-zinc-100">{title}</h3>
      <div className="mt-1 h-px bg-zinc-900" />
    </div>
  );
}
