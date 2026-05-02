import { pct, num, sign } from "../utils/formatters";
import InfoTip from "./InfoTip";

const METRICS = [
  { key: "annualized_return",    metric: "annualized_return",    label: "Ann. Return",     fmt: (v) => pct(v) },
  { key: "annualized_volatility",metric: "annualized_volatility",label: "Ann. Volatility", fmt: (v) => pct(v) },
  { key: "sharpe_ratio",         metric: "sharpe_ratio",         label: "Sharpe Ratio",    fmt: (v) => num(v) },
  { key: "beta",                 metric: "beta",                 label: "Beta",            fmt: (v) => num(v) },
  { key: "max_drawdown",         metric: "max_drawdown",         label: "Max Drawdown",    fmt: (v) => pct(v) },
];

export default function MetricsSummary({ results, onLearnMore }) {
  return (
    <div className="card">
      <h2>Key Metrics</h2>
      <div className="metrics-grid">
        {METRICS.map(({ key, metric, label, fmt }) => (
          <div key={key} className="metric-item">
            <div className="metric-label">
              {label}
              <InfoTip metric={metric} onLearnMore={onLearnMore} side="bottom" />
            </div>
            <div className={`metric-value ${sign(results[key])}`}>
              {fmt(results[key])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
