// Dashboard derivations — DESIGN_BRIEF.md §7
//
// Pure helpers consumed by DashboardPage. Each returns the data the
// 3-column grid needs (label / pulled-out figure / body description).
//
// All number formatting goes through utils/formatters so the rendered
// strings stay consistent across pages.

import { pct, num } from "./formatters";

/**
 * Top single-name risk contributor.
 * Returns { ticker, pctRisk, pctCapital, overweight } or null.
 */
export function topRiskDriver(results) {
  const rcs = results?.risk_contributions ?? [];
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

/**
 * Suggested next move. Returns { title, body, figure } where:
 *   - title  : short verb-led action ("Reduce concentration")
 *   - body   : explanation
 *   - figure : pulled-out mono figure (the metric the user should watch)
 */
export function suggestedFocus(results) {
  const downside = results?.downside_capture;
  const enp = results?.concentration?.enp_risk;
  const beta = results?.beta;
  const dd = Math.abs(results?.max_drawdown ?? 0);
  const top = topRiskDriver(results);

  if (top && top.pctRisk > 0.45) {
    return {
      title: "Reduce concentration",
      figure: pct(top.pctRisk, 0),
      body: `${top.ticker} drives ${pct(top.pctRisk, 0)} of total risk — trimming it would meaningfully reduce single-name exposure.`,
    };
  }
  if (enp != null && enp < 3.0) {
    return {
      title: "Diversify exposure",
      figure: num(enp, 1),
      body: `Real diversification is only ${num(enp, 1)} positions — adding uncorrelated assets would build genuine breadth.`,
    };
  }
  if (downside != null && downside > 1.4) {
    return {
      title: "Add defensive ballast",
      figure: `${num(downside, 2)}×`,
      body: `Downside capture of ${num(downside, 2)}× means you fall harder than the market — defensive assets would dampen drawdowns.`,
    };
  }
  if (dd > 0.30) {
    return {
      title: "Add drawdown protection",
      figure: pct(-dd),
      body: `Max drawdown of ${pct(-dd)} is severe — bonds, gold, or hedges would soften worst-case losses.`,
    };
  }
  if (beta != null && beta > 1.5) {
    return {
      title: "Lower market sensitivity",
      figure: num(beta, 2),
      body: `Beta of ${num(beta, 2)} means you swing ${num(beta, 1)}× harder than the market — broaden beyond high-beta names.`,
    };
  }
  return {
    title: "Maintain structure",
    figure: enp != null ? num(enp, 1) : "—",
    body: "Portfolio is broadly balanced. Watch for drift in concentration and downside capture over time.",
  };
}

/**
 * Biggest structural vulnerability — DNA-flagged or derived.
 * Returns { figure, body } or null when none.
 */
export function biggestVulnerability(results) {
  const top = topRiskDriver(results);
  const dd = Math.abs(results?.max_drawdown ?? 0);
  const dnaVulns = results?.portfolio_dna?.vulnerabilities ?? [];

  if (dnaVulns.length > 0) {
    return {
      figure: top ? pct(top.pctRisk, 0) : (dd > 0 ? pct(-dd) : "—"),
      body: dnaVulns[0],
    };
  }
  if (top && top.overweight) {
    return {
      figure: pct(top.pctRisk, 0),
      body: `${top.ticker} drives ${pct(top.pctRisk, 0)} of risk from only ${pct(top.pctCapital, 0)} of capital.`,
    };
  }
  if (dd > 0.30) {
    return {
      figure: pct(-dd),
      body: `Worst observed drawdown of ${pct(-dd)} during the analysis window.`,
    };
  }
  return null;
}
