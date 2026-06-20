import { useMemo } from "react";
import Panel from "../layout/Panel";
import EquityVsBenchmark from "./EquityVsBenchmark";
import DrawdownChartBT from "./DrawdownChartBT";
import MetricGrid from "./MetricGrid";
import TradesTable from "./TradesTable";
import { cagr, annualizedSharpe, dailyReturns, maxDrawdownEquity } from "../../lib/backtest";
import { fmtMoney, fmtPct, fmtNum } from "../../lib/format";

export default function BacktestView({ result }) {
  const stats = useMemo(() => {
    if (!result) return null;
    const rets = dailyReturns(result.equity);
    const sharpe = annualizedSharpe(rets);
    const c = cagr(result.equity);
    const { maxDD, maxDDPct } = maxDrawdownEquity(result.equity);

    const winners = result.trades.filter((t) => t.netPnl > 0);
    const losers = result.trades.filter((t) => t.netPnl < 0);
    const grossWin = winners.reduce((a, t) => a + t.netPnl, 0);
    const grossLoss = Math.abs(losers.reduce((a, t) => a + t.netPnl, 0));
    const profitFactor = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
    const expectancy = result.trades.length ? result.trades.reduce((a, t) => a + t.netPnl, 0) / result.trades.length : 0;

    // Benchmark CAGR
    const bm = result.benchmark;
    const bmCagr = bm.length > 1 ? cagr(bm.map((b) => ({ equity: b.equity })), 252) : 0;
    const bmReturn = bm.length ? bm[bm.length - 1].equity / bm[0].equity - 1 : 0;

    return {
      sharpe, cagr: c, maxDD, maxDDPct,
      winRate: result.trades.length ? winners.length / result.trades.length : 0,
      profitFactor, expectancy,
      bmCagr, bmReturn,
      grossWin, grossLoss, winners: winners.length, losers: losers.length,
    };
  }, [result]);

  if (!result) {
    return (
      <Panel title="NO BACKTEST">
        <div className="text-[12px] text-zinc-500">
          Configure a strategy and click <span className="text-amber-400">RUN BACKTEST</span> to see results here.
        </div>
      </Panel>
    );
  }

  const alpha = result.totalReturn - stats.bmReturn;

  const metrics = [
    { key: "totalReturn", label: "TOTAL RETURN", value: fmtPct(result.totalReturn, { decimals: 1 }), tone: result.totalReturn > 0 ? "text-emerald-400" : "text-rose-400", sub: fmtMoney(result.finalEquity - result.startingCash, { sign: true, decimals: 0 }) },
    { key: "cagr", label: "CAGR", value: fmtPct(stats.cagr, { decimals: 2 }), tip: "cagr", tone: stats.cagr > 0 ? "text-emerald-400" : "text-rose-400", sub: `vs B&H ${fmtPct(stats.bmCagr, { decimals: 2 })}` },
    { key: "sharpe", label: "SHARPE (ANNL)", value: fmtNum(stats.sharpe), tip: "sharpe", tone: stats.sharpe > 1 ? "text-emerald-400" : stats.sharpe > 0 ? "text-amber-400" : "text-rose-400", sub: "Daily returns × √252" },
    { key: "maxDD", label: "MAX DRAWDOWN", value: fmtPct(stats.maxDDPct, { decimals: 1 }), tip: "maxDrawdown", tone: "text-rose-400", sub: fmtMoney(stats.maxDD, { decimals: 0 }) },
    { key: "wr", label: "WIN RATE", value: fmtPct(stats.winRate, { decimals: 0 }), tip: "winRate", sub: `${stats.winners}W / ${stats.losers}L` },
    { key: "pf", label: "PROFIT FACTOR", value: stats.profitFactor === Infinity ? "∞" : fmtNum(stats.profitFactor), tip: "profitFactor", tone: stats.profitFactor > 1.5 ? "text-emerald-400" : "text-amber-400" },
    { key: "exp", label: "EXPECTANCY", value: fmtMoney(stats.expectancy), tip: "expectancy" },
    { key: "exp", label: "EXPOSURE", value: fmtPct(result.timeInMarketPct, { decimals: 0 }), tip: "exposure", sub: `${result.daysInMarket}/${result.daysTotal} days` },
    { key: "alpha", label: "ALPHA vs B&H", value: fmtPct(alpha, { sign: true, decimals: 1 }), tone: alpha > 0 ? "text-emerald-400" : "text-rose-400", sub: `B&H ${fmtPct(stats.bmReturn, { decimals: 1 })}` },
    { key: "trades", label: "# TRADES", value: result.trades.length.toString() },
    { key: "avgWin", label: "AVG WIN", value: fmtMoney(stats.grossWin / Math.max(1, stats.winners)), tone: "text-emerald-400" },
    { key: "avgLoss", label: "AVG LOSS", value: fmtMoney(-stats.grossLoss / Math.max(1, stats.losers)), tone: "text-rose-400" },
  ];

  return (
    <div className="space-y-4">
      <Panel title="EQUITY · STRATEGY vs BUY & HOLD" sub="Mark-to-market daily. Amber = strategy. Gray = benchmark.">
        <EquityVsBenchmark equity={result.equity} benchmark={result.benchmark} startingCash={result.startingCash} />
      </Panel>

      <Panel title="KEY METRICS" inner={false}>
        <MetricGrid metrics={metrics} />
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="DRAWDOWN" sub="Distance from peak equity, percent.">
          <DrawdownChartBT equity={result.equity} />
        </Panel>
        <Panel title="EXECUTION DETAILS" sub="Round-trip cost model used in this backtest.">
          <div className="space-y-2 font-mono text-[11px]">
            <Row label="STARTING CASH" value={fmtMoney(result.startingCash, { decimals: 0 })} />
            <Row label="FINAL EQUITY" value={fmtMoney(result.finalEquity, { decimals: 0 })} />
            <Row label="COMMISSION / TRADE" value={fmtMoney(result.cfg.commissionPerTrade)} />
            <Row label="SLIPPAGE" value={`${result.cfg.slippageBps} bps`} />
            <Row label="LOOKAHEAD GUARD" value="Signal at close, fill next open" />
            <Row label="SAMPLE BARS" value={`${result.daysTotal} trading days`} />
          </div>
        </Panel>
      </div>

      <Panel title="TRADES" sub={`${result.trades.length} round trips. Most recent first.`}>
        <TradesTable trades={result.trades} />
      </Panel>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-zinc-900/60 py-1.5">
      <span className="text-zinc-500 tracking-widest">{label}</span>
      <span className="text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}
