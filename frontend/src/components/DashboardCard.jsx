import { pct, num } from "../utils/formatters";
import { diffSnapshots } from "../utils/diff";
import { useAnimatedNumber } from "../utils/useAnimatedNumber";

const PILLAR_COLORS = {
  diversification:        "#34c759",
  risk_adjusted_return:   "#007aff",
  drawdown_resilience:    "#5856d6",
  macro_resilience:       "#ff9f0a",
  allocation_efficiency:  "#ff3b30",
};

function topRiskDriver(results) {
  const rcs = results.risk_contributions ?? [];
  if (!rcs.length) return null;
  const top = [...rcs].sort((a, b) => b.pct_risk - a.pct_risk)[0];
  if (!top) return null;
  return {
    ticker: top.ticker,
    pctRisk: top.pct_risk,
    pctCapital: top.weight,
    overweight: top.pct_risk > top.weight * 1.4,
  };
}

function suggestedFocus(results) {
  const downside = results.downside_capture;
  const enp = results.concentration?.enp_risk;
  const beta = results.beta;
  const dd = Math.abs(results.max_drawdown ?? 0);
  const top = topRiskDriver(results);

  if (top && top.pctRisk > 0.45) {
    return {
      title: "Reduce concentration",
      body: `${top.ticker} drives ${pct(top.pctRisk, 0)} of total risk — trimming it would meaningfully reduce single-name exposure.`,
    };
  }
  if (enp != null && enp < 3.0) {
    return {
      title: "Diversify exposure",
      body: `Real diversification is only ${num(enp, 1)} positions — adding uncorrelated assets would build genuine breadth.`,
    };
  }
  if (downside != null && downside > 1.4) {
    return {
      title: "Add defensive ballast",
      body: `Downside capture of ${num(downside, 2)}× means you fall harder than the market — defensive assets would dampen drawdowns.`,
    };
  }
  if (dd > 0.30) {
    return {
      title: "Add drawdown protection",
      body: `Max drawdown of ${pct(-dd)} is severe — bonds, gold, or hedges would soften worst-case losses.`,
    };
  }
  if (beta != null && beta > 1.5) {
    return {
      title: "Lower market sensitivity",
      body: `Beta of ${num(beta, 2)} means you swing ${num(beta, 1)}× harder than the market — broaden beyond high-beta names.`,
    };
  }
  return {
    title: "Maintain structure",
    body: "Portfolio is broadly balanced. Watch for drift in concentration and downside capture over time.",
  };
}

function whatChangedLine(prevSnapshot, results) {
  if (!prevSnapshot) return null;
  const diff = diffSnapshots(prevSnapshot, results);
  const notable = diff.metric_changes.filter((m) => m.severity !== "stable");
  if (notable.length === 0) return { stable: true };
  const top = notable.sort((a, b) => {
    const order = { critical: 0, warning: 1, improved: 2 };
    return order[a.severity] - order[b.severity];
  })[0];
  return {
    label: top.label,
    prev: top.fmt(top.prev),
    curr: top.fmt(top.curr),
    severity: top.severity,
  };
}

function biggestVulnerability(results) {
  const vulns = results.portfolio_dna?.vulnerabilities ?? [];
  if (vulns.length > 0) return vulns[0];
  const top = topRiskDriver(results);
  if (top && top.overweight) {
    return `${top.ticker} drives ${pct(top.pctRisk, 0)} of risk from ${pct(top.pctCapital, 0)} capital`;
  }
  return null;
}

const SEV_COLOR = {
  critical: "var(--negative)",
  warning: "var(--warning)",
  improved: "var(--positive)",
};

export default function DashboardCard({ results, prevSnapshot }) {
  if (!results) return null;

  const panko = results.panko_score ?? null;
  const score = panko?.total ?? 0;
  const band = panko?.band ?? { label: "Unscored", tone: "ok" };
  const pillars = panko?.pillars ?? [];

  const dnaType = results.portfolio_dna?.type ?? "Unclassified";
  const drivers = results.portfolio_dna?.primary_drivers ?? [];
  const top = topRiskDriver(results);
  const focus = suggestedFocus(results);
  const changed = whatChangedLine(prevSnapshot, results);
  const vuln = biggestVulnerability(results);

  const animatedScore = useAnimatedNumber(score, 900);

  const topAlertTone = top && top.pctRisk > 0.45 ? "warn" : top && top.overweight ? "watch" : null;
  const changedTone = changed && !changed.stable ? changed.severity : null;

  return (
    <div className={`dashboard-card dashboard-card--${band.tone}`}>
      <div className="dashboard-hero">
        <div className="dashboard-hero-left">
          <div className="dashboard-hero-label">Panko Score</div>
          <div className="dashboard-hero-score">
            <span className="dashboard-hero-num">{Math.round(animatedScore)}</span>
            <span className="dashboard-hero-denom">/100</span>
            <span className="dashboard-hero-band-pill">
              {band.label}
            </span>
          </div>

          {pillars.length > 0 && (
            <>
              <div className="panko-pillar-bar" aria-hidden="true">
                {pillars.map((p) => {
                  const fillPct = Math.max(0, Math.min(100, (p.value / p.max) * 100));
                  return (
                    <div
                      key={p.id}
                      className="panko-pillar-bar-segment"
                      style={{ background: "rgba(0,0,0,0.06)" }}
                      title={`${p.label}: ${p.value.toFixed(1)} / ${p.max} (${p.raw_label})`}
                    >
                      <div
                        className="panko-pillar-bar-fill"
                        style={{
                          width: `${fillPct}%`,
                          background: PILLAR_COLORS[p.id] ?? "var(--primary)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="panko-pillar-legend">
                {pillars.map((p) => (
                  <div key={p.id} className="panko-pillar-legend-item">
                    <span
                      className="panko-pillar-legend-dot"
                      style={{ background: PILLAR_COLORS[p.id] ?? "var(--primary)" }}
                    />
                    <span className="panko-pillar-legend-label">{p.label}</span>
                    <span className="panko-pillar-legend-value">
                      {p.value.toFixed(1)}<span className="panko-pillar-legend-max">/{p.max}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-dna-label">DNA</div>
          <div className="dashboard-dna-type">{dnaType}</div>
          {drivers.length > 0 && (
            <div className="dashboard-dna-drivers">
              {drivers.slice(0, 3).map((d) => (
                <span key={d} className="dashboard-dna-chip">{d}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-tiles">
        <div className={`dashboard-tile ${topAlertTone ? `dashboard-tile--${topAlertTone}` : ""}`}>
          <div className="dashboard-tile-label">Top Risk Driver</div>
          {top ? (
            <>
              <div className="dashboard-tile-headline">{top.ticker}</div>
              <div className="dashboard-tile-body">
                {pct(top.pctRisk, 0)} of risk from {pct(top.pctCapital, 0)} capital
                {top.overweight && <span className="dashboard-tile-flag"> · overweight</span>}
              </div>
            </>
          ) : (
            <div className="dashboard-tile-body">—</div>
          )}
        </div>

        <div className={`dashboard-tile ${changedTone === "critical" || changedTone === "warning" ? "dashboard-tile--warn" : ""} ${!changed && vuln ? "dashboard-tile--watch" : ""}`}>
          <div className="dashboard-tile-label">
            {changed ? "What Changed" : "Main Vulnerability"}
          </div>
          {changed ? (
            changed.stable ? (
              <>
                <div className="dashboard-tile-headline dashboard-tile-headline--muted">Stable</div>
                <div className="dashboard-tile-body">Metrics broadly unchanged since last snapshot.</div>
              </>
            ) : (
              <>
                <div className="dashboard-tile-headline" style={{ color: SEV_COLOR[changed.severity] }}>
                  {changed.label}
                </div>
                <div className="dashboard-tile-body">
                  {changed.prev} <span className="dashboard-tile-arrow">→</span> {changed.curr}
                </div>
              </>
            )
          ) : vuln ? (
            <>
              <div className="dashboard-tile-headline dashboard-tile-headline--warn">⚠</div>
              <div className="dashboard-tile-body">{vuln}</div>
            </>
          ) : (
            <>
              <div className="dashboard-tile-headline dashboard-tile-headline--muted">No major issues</div>
              <div className="dashboard-tile-body">No structural vulnerabilities detected.</div>
            </>
          )}
        </div>

        <div className="dashboard-tile">
          <div className="dashboard-tile-label">Suggested Focus</div>
          <div className="dashboard-tile-headline">{focus.title}</div>
          <div className="dashboard-tile-body">{focus.body}</div>
        </div>
      </div>
    </div>
  );
}
