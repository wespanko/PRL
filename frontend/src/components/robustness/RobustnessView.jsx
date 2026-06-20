import Panel from "../layout/Panel";
import MonteCarloPanel from "./MonteCarloPanel";
import WalkForwardPanel from "./WalkForwardPanel";

export default function RobustnessView({ result, symbol }) {
  if (!result) {
    return (
      <Panel title="NO BACKTEST">
        <div className="text-[12px] text-zinc-500">
          Run a backtest first, then come back to stress-test it against randomized orderings and out-of-sample folds.
        </div>
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      <MonteCarloPanel result={result} runs={500} />
      <WalkForwardPanel result={result} symbol={symbol} folds={5} />
    </div>
  );
}
