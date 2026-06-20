import { useState, useMemo } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import StrategyView from "./components/strategy/StrategyView";
import BacktestView from "./components/backtest/BacktestView";
import RobustnessView from "./components/robustness/RobustnessView";
import DataView from "./components/data/DataView";
import LearnView from "./components/learn/LearnView";
import Footer from "./components/Footer";
import { defaultParams, STRATEGY_LIST } from "./lib/strategies";
import { getBars, getSampleSymbols } from "./lib/sampleData";
import { backtest } from "./lib/backtest";

export default function App() {
  const [view, setView] = useState("strategy");

  const [strategyId, setStrategyId] = useState("sma_cross");
  const [params, setParams] = useState(defaultParams("sma_cross"));
  const [symbol, setSymbol] = useState(getSampleSymbols()[0] || "");
  const [customBars, setCustomBars] = useState(null);

  const [startingCash, setStartingCash] = useState(100000);
  const [commissionPerTrade, setCommissionPerTrade] = useState(1);
  const [slippageBps, setSlippageBps] = useState(5);

  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const bars = useMemo(() => {
    if (customBars && customBars.symbol === symbol) return customBars.bars;
    return getBars(symbol);
  }, [symbol, customBars]);

  const runBacktest = () => {
    if (!bars.length) return;
    setRunning(true);
    setTimeout(() => {
      const r = backtest(bars, strategyId, params, { startingCash, commissionPerTrade, slippageBps });
      setResult(r);
      setRunning(false);
      setView("backtest");
    }, 16);
  };

  const clearResult = () => {
    setResult(null);
    setView("strategy");
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar active={view} onChange={setView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          symbol={symbol}
          strategyId={strategyId}
          params={params}
          hasResult={!!result}
          onRun={runBacktest}
          onClear={clearResult}
          running={running}
        />
        <main className="flex-1 overflow-auto bg-black p-4">
          {view === "strategy" && (
            <StrategyView
              strategyId={strategyId} setStrategyId={setStrategyId}
              params={params} setParams={setParams}
              symbol={symbol} setSymbol={setSymbol}
              startingCash={startingCash} setStartingCash={setStartingCash}
              commissionPerTrade={commissionPerTrade} setCommissionPerTrade={setCommissionPerTrade}
              slippageBps={slippageBps} setSlippageBps={setSlippageBps}
            />
          )}
          {view === "backtest" && <BacktestView result={result} />}
          {view === "robustness" && <RobustnessView result={result} symbol={symbol} />}
          {view === "data" && <DataView symbol={symbol} setSymbol={setSymbol} customBars={customBars} setCustomBars={setCustomBars} />}
          {view === "learn" && <LearnView />}
          <Footer />
        </main>
      </div>
    </div>
  );
}
