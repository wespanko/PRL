import { num, pct } from "../utils/formatters";

function hhiLabel(hhi) {
  if (hhi > 0.5) return { text: "High", color: "#dc2626" };
  if (hhi > 0.25) return { text: "Moderate", color: "#d97706" };
  return { text: "Low", color: "#16a34a" };
}

export default function ConcentrationCard({ concentration, results }) {
  const { hhi, effective_n, enp_risk, top1_weight, top3_weight, top5_weight } = concentration;
  const label = hhiLabel(hhi);
  const gapPct = effective_n > 0 ? (effective_n - (enp_risk ?? effective_n)) / effective_n : 0;

  const captureColor = (v, goodBelow1) =>
    goodBelow1
      ? v <= 1 ? "#16a34a" : "#dc2626"
      : v >= 1 ? "#16a34a" : "#dc2626";

  return (
    <div className="card">
      <h2>Concentration &amp; Risk Profile</h2>
      <div className="conc-grid">
        <div className="conc-stat">
          <div className="conc-label">HHI Score</div>
          <div className="conc-value" style={{ color: label.color }}>{hhi.toFixed(2)}</div>
          <div className="conc-sub">{label.text} concentration</div>
        </div>
        <div className="conc-stat">
          <div className="conc-label">Nominal Positions</div>
          <div className="conc-value">{effective_n?.toFixed(1) ?? "—"}</div>
          <div className="conc-sub">by capital weight</div>
        </div>
        <div className="conc-stat">
          <div className="conc-label">Corr-Adjusted Positions</div>
          <div className="conc-value" style={{ color: gapPct > 0.2 ? "#d97706" : "#111" }}>
            {enp_risk?.toFixed(1) ?? "—"}
          </div>
          <div className="conc-sub">true independent bets</div>
        </div>
        <div className="conc-stat">
          <div className="conc-label">VaR 95% (Monthly)</div>
          <div className="conc-value" style={{ color: "#dc2626" }}>{pct(results.var_95)}</div>
          <div className="conc-sub">1-in-20 month loss</div>
        </div>
        <div className="conc-stat">
          <div className="conc-label">CVaR 95% (Monthly)</div>
          <div className="conc-value" style={{ color: "#dc2626" }}>{pct(results.cvar_95)}</div>
          <div className="conc-sub">expected worst-case</div>
        </div>
        <div className="conc-stat">
          <div className="conc-label">Upside / Downside</div>
          <div className="conc-value" style={{ fontSize: "1rem" }}>
            <span style={{ color: captureColor(results.upside_capture, false) }}>
              {num(results.upside_capture)}×
            </span>
            {" / "}
            <span style={{ color: captureColor(results.downside_capture, true) }}>
              {num(results.downside_capture)}×
            </span>
          </div>
          <div className="conc-sub">capture vs benchmark</div>
        </div>
      </div>

      {enp_risk != null && gapPct > 0.05 && (
        <div className="enp-gap-bar">
          <div className="enp-gap-row">
            <span className="enp-gap-label">Nominal ENP</span>
            <div className="enp-bar-track">
              <div className="enp-bar-fill enp-bar--nominal"
                style={{ width: `${Math.min(effective_n / Math.max(effective_n, 10) * 100, 100)}%` }} />
            </div>
            <span className="enp-gap-val">{effective_n.toFixed(1)}</span>
          </div>
          <div className="enp-gap-row">
            <span className="enp-gap-label">Corr-Adjusted</span>
            <div className="enp-bar-track">
              <div className="enp-bar-fill enp-bar--adjusted"
                style={{ width: `${Math.min(enp_risk / Math.max(effective_n, 10) * 100, 100)}%` }} />
            </div>
            <span className="enp-gap-val">{enp_risk.toFixed(1)}</span>
          </div>
          <p className="enp-gap-note">
            Correlation reduces true diversification by {(gapPct * 100).toFixed(0)}% —
            holdings share more return drivers than their position count suggests.
          </p>
        </div>
      )}

      <div className="weight-bar-row" style={{ marginTop: 16 }}>
        {[
          { label: "Top 1", value: top1_weight },
          { label: "Top 3", value: top3_weight },
          { label: "Top 5", value: top5_weight },
        ].map(({ label, value }) => (
          <div key={label} className="weight-bar-item">
            <div className="weight-bar-label">{label}</div>
            <div className="weight-bar-track">
              <div className="weight-bar-fill"
                style={{ width: `${Math.min(value * 100, 100)}%` }} />
            </div>
            <div className="weight-bar-pct">{pct(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
