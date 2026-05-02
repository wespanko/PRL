const METRIC_DEFS = [
  {
    key: "sharpe_ratio", label: "Sharpe Ratio",
    fmt: (v) => Number(v).toFixed(2),
    warnDelta: 0.15, critDelta: 0.30, direction: "higher_better",
  },
  {
    key: "annualized_volatility", label: "Volatility",
    fmt: (v) => `${(v * 100).toFixed(1)}%`,
    warnDelta: 0.02, critDelta: 0.05, direction: "lower_better",
  },
  {
    key: "max_drawdown", label: "Max Drawdown",
    fmt: (v) => `${(v * 100).toFixed(1)}%`,
    warnDelta: 0.05, critDelta: 0.15, direction: "lower_better",
  },
  {
    key: "beta", label: "Beta",
    fmt: (v) => Number(v).toFixed(2),
    warnDelta: 0.20, critDelta: 0.40, direction: "neutral",
  },
];

function severity(delta, { warnDelta, critDelta, direction }) {
  const worse = direction === "higher_better" ? delta < 0 : direction === "lower_better" ? delta > 0 : false;
  const abs = Math.abs(delta);
  if (worse && abs >= critDelta) return "critical";
  if (worse && abs >= warnDelta) return "warning";
  if (!worse && direction !== "neutral" && abs >= warnDelta) return "improved";
  return "stable";
}

export function diffSnapshots(prevSnap, currResults) {
  const prev = prevSnap.results;

  const metric_changes = [];
  for (const def of METRIC_DEFS) {
    const p = prev[def.key], c = currResults[def.key];
    if (p == null || c == null) continue;
    const delta = c - p;
    metric_changes.push({ ...def, prev: p, curr: c, delta, severity: severity(delta, def) });
  }

  // ENP_risk (nested in concentration)
  const prevEnp = prev.concentration?.enp_risk;
  const currEnp = currResults.concentration?.enp_risk;
  if (prevEnp != null && currEnp != null) {
    const delta = currEnp - prevEnp;
    const sev = delta <= -1.5 ? "critical" : delta <= -0.5 ? "warning" : delta >= 0.5 ? "improved" : "stable";
    metric_changes.push({
      key: "enp_risk", label: "Real Diversification",
      fmt: (v) => `${v.toFixed(1)} pos`,
      prev: prevEnp, curr: currEnp, delta, severity: sev,
    });
  }

  // Top risk contributor change
  const topByRisk = (rc) => rc ? [...rc].sort((a, b) => b.pct_risk - a.pct_risk)[0] : null;
  const prevTop = topByRisk(prev.risk_contributions);
  const currTop = topByRisk(currResults.risk_contributions);
  if (prevTop && currTop && prevTop.ticker === currTop.ticker) {
    const delta = currTop.pct_risk - prevTop.pct_risk;
    const sev = delta >= 0.10 ? "critical" : delta >= 0.05 ? "warning" : delta <= -0.05 ? "improved" : "stable";
    metric_changes.push({
      key: "top_risk", label: `${currTop.ticker} Risk%`,
      fmt: (v) => `${(v * 100).toFixed(1)}%`,
      prev: prevTop.pct_risk, curr: currTop.pct_risk, delta, severity: sev,
    });
  }

  // Composition changes (from risk_contributions which carries weight)
  const prevW = Object.fromEntries((prev.risk_contributions || []).map((r) => [r.ticker, r.weight]));
  const currW = Object.fromEntries((currResults.risk_contributions || []).map((r) => [r.ticker, r.weight]));
  const all = new Set([...Object.keys(prevW), ...Object.keys(currW)]);
  const new_tickers = [], removed_tickers = [], changed_weights = [];
  for (const t of all) {
    const p = prevW[t], c = currW[t];
    if (!p && c != null) new_tickers.push({ ticker: t, weight: c });
    else if (p != null && !c) removed_tickers.push({ ticker: t, prev_weight: p });
    else if (Math.abs((c ?? 0) - (p ?? 0)) > 0.03) changed_weights.push({ ticker: t, prev_weight: p, curr_weight: c, delta: c - p });
  }

  // Summary sentence
  const notable = metric_changes.filter((m) => m.severity !== "stable");
  const warnings = notable.filter((m) => m.severity === "critical" || m.severity === "warning");
  let summary;
  if (notable.length === 0 && new_tickers.length === 0 && removed_tickers.length === 0 && changed_weights.length === 0) {
    summary = "Portfolio metrics are broadly stable since last analysis.";
  } else if (warnings.length > 0) {
    const top = warnings[0];
    summary = `${top.label} moved ${top.fmt(top.prev)} → ${top.fmt(top.curr)} — risk has shifted.`;
  } else {
    const imp = notable.filter((m) => m.severity === "improved");
    summary = `Risk profile improved — ${imp.map((i) => i.label).join(", ")} moved favorably.`;
  }

  return { metric_changes, new_tickers, removed_tickers, changed_weights, summary };
}
