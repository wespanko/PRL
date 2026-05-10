import { pct, num } from "../utils/formatters";

export default function BenchmarkAttribution({ attribution, benchmark }) {
  if (!attribution) return null;
  const { alpha_annualized, beta_contribution, benchmark_return,
          pct_from_beta, tracking_error, information_ratio, beta } = attribution;

  const total = alpha_annualized + beta_contribution;
  const alphaColor = alpha_annualized >= 0 ? "var(--risk-green)" : "var(--risk-red)";
  const irColor = information_ratio >= 0 ? "var(--risk-green)" : "var(--risk-red)";
  const betaPct = Math.abs(pct_from_beta ?? 0);

  const highBeta = betaPct > 0.8;
  const negAlpha = alpha_annualized < -0.01;
  const goodAlpha = alpha_annualized > 0.03;

  return (
    <div className="card">
      <h2>Benchmark Attribution</h2>

      {highBeta && (
        <div className="insight-callout insight-callout--info">
          <strong>{(betaPct * 100).toFixed(0)}% of your return came from market beta</strong> — your stock selection added just {pct(alpha_annualized)}.
          You're running an active portfolio that mostly behaves like {benchmark}.
        </div>
      )}
      {!highBeta && negAlpha && (
        <div className="insight-callout insight-callout--warn">
          <strong>Active positioning is a net drag:</strong> alpha of {pct(alpha_annualized)} means your stock picks subtracted from returns vs. simply holding {benchmark}.
        </div>
      )}
      {goodAlpha && (
        <div className="insight-callout insight-callout--good">
          <strong>Genuine alpha detected:</strong> {pct(alpha_annualized)} came from active positioning, not just market exposure.
        </div>
      )}

      <div className="attr-decomp" style={{ marginTop: 16 }}>
        <div className="attr-row attr-row--total">
          <span className="attr-label">Total Portfolio Return</span>
          <span className="attr-value">{pct(total)}</span>
        </div>
        <div className="attr-indent">
          <div className="attr-row">
            <span className="attr-label">Market beta (β = {num(beta, 2)})</span>
            <span className="attr-value attr-value--muted">
              {pct(beta_contribution)}
              <span className="attr-note"> · {(betaPct * 100).toFixed(0)}% of total</span>
            </span>
          </div>
          <div className="attr-row">
            <span className="attr-label">Active positioning (α)</span>
            <span className="attr-value" style={{ color: alphaColor, fontWeight: 700 }}>{pct(alpha_annualized)}</span>
          </div>
        </div>
      </div>

      <div className="attr-stats">
        <div className="attr-stat">
          <div className="attr-stat-label">Benchmark ({benchmark})</div>
          <div className="attr-stat-value">{pct(benchmark_return)}</div>
        </div>
        <div className="attr-stat">
          <div className="attr-stat-label">Tracking Error</div>
          <div className="attr-stat-value">{pct(tracking_error)}</div>
        </div>
        <div className="attr-stat">
          <div className="attr-stat-label">Info Ratio</div>
          <div className="attr-stat-value" style={{ color: irColor }}>{num(information_ratio)}</div>
        </div>
      </div>
    </div>
  );
}
