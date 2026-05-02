/**
 * Single source of truth for metric explanations. Used by InfoTip popovers and
 * the Learn page. Each entry should be plain-English first, math second.
 *
 * Schema:
 *   id            — stable identifier (matches backend keys where possible)
 *   label         — display name
 *   category      — "performance" | "risk" | "capture" | "diversification" | "score"
 *   oneLiner      — single sentence for tooltips
 *   meaning       — what it actually measures (plain English, 2–4 sentences)
 *   whyItMatters  — concrete portfolio implication
 *   howToImprove  — actionable guidance
 *   mistake       — common misinterpretation
 *   range         — typical / interpretive range
 *   formula       — math notation (optional)
 */

export const METRICS = {
  annualized_return: {
    id: "annualized_return",
    label: "Annualized Return",
    category: "performance",
    oneLiner: "Average yearly return your portfolio would have produced if every year looked like the one analyzed.",
    meaning:
      "It scales the actual return over your analysis window up (or down) to a yearly equivalent. A portfolio that gained 5% over 6 months has an annualized return of about 10%, not 5% — because compounded twice.",
    whyItMatters:
      "Letting you compare investments on the same time scale. A 1-year and a 3-year period can't be compared without annualizing.",
    howToImprove:
      "Higher-return assets, longer holding periods, lower fees. But return alone is meaningless without the volatility that produced it — that's why Sharpe exists.",
    mistake:
      "Treating annualized return as a forecast. It is a description of the past, not a prediction.",
    range: "S&P 500 averages ~10% annualized over very long periods. Anything above 25% is doing exceptionally well or taking exceptional risk.",
    formula: "(1 + total_return)^(252/days) − 1",
  },

  annualized_volatility: {
    id: "annualized_volatility",
    label: "Annualized Volatility",
    category: "risk",
    oneLiner: "How much your portfolio's value typically swings around its average — scaled to a yearly figure.",
    meaning:
      "The standard deviation of daily returns, multiplied by √252 to express in yearly terms. If your portfolio has 20% annualized volatility, in a typical year it can be expected to swing roughly ±20% around its mean.",
    whyItMatters:
      "Volatility is the cleanest single proxy for 'risk.' It also drives drawdowns: a high-vol portfolio will dip harder during selloffs.",
    howToImprove:
      "Add lower-volatility or uncorrelated assets (bonds, gold, defensive equities). Reduce concentration in single names.",
    mistake:
      "Assuming volatility = bad. Some volatility is the price of return. The question is whether you're being paid for it (Sharpe).",
    range: "S&P 500 averages ~16%. Concentrated tech portfolios often see 25–40%. Anything above 50% is bordering on speculation.",
    formula: "stdev(daily_returns) × √252",
  },

  sharpe_ratio: {
    id: "sharpe_ratio",
    label: "Sharpe Ratio",
    category: "performance",
    oneLiner: "Excess return earned per unit of volatility — the cleanest single measure of risk-adjusted return.",
    meaning:
      "Subtract the risk-free rate from your portfolio return, then divide by your volatility. A Sharpe of 1.0 means you earned one full unit of return for each unit of volatility you took on.",
    whyItMatters:
      "Two portfolios returning 12% are not equal if one has 10% volatility and the other has 30%. Sharpe normalizes this so you can compare apples to apples.",
    howToImprove:
      "Either raise return without raising volatility, or cut volatility without cutting return. Adding lowly-correlated assets often boosts Sharpe even if they have lower individual returns.",
    mistake:
      "Using Sharpe over short windows. Three months of bull market can produce an absurd Sharpe — the metric needs at least a year to be meaningful.",
    range: "Below 0.5 is poor. 0.5–1.0 is decent. 1.0–2.0 is strong. Above 2.0 is rare and often suspect (look for hidden risk).",
    formula: "(Rₚ − Rf) / σₚ",
  },

  beta: {
    id: "beta",
    label: "Beta",
    category: "risk",
    oneLiner: "How much your portfolio moves when the broad market moves — scaled to 1.0 = market.",
    meaning:
      "Beta of 1.2 means when the S&P drops 1%, your portfolio tends to drop 1.2%. Beta of 0.6 means you only move 60% as much. Calculated as the regression slope of your returns against the benchmark.",
    whyItMatters:
      "Beta measures market sensitivity. High beta = amplified market moves. Low beta = insulation. It's the cleanest single metric for 'how much am I just along for the market's ride?'",
    howToImprove:
      "To lower beta, add bonds, gold, or low-beta defensive equities. To raise beta, concentrate in high-beta tech / small caps. Most investors should be aware of where their beta sits, not chase a specific number.",
    mistake:
      "Confusing beta with risk. Beta is correlation × relative volatility — it doesn't capture idiosyncratic risk. A high-beta-yet-diversified portfolio can be safer than a low-beta concentrated one.",
    range: "Diversified equity portfolios usually 0.9–1.1. Aggressive growth often 1.3–1.6. Defensive portfolios often 0.5–0.8.",
    formula: "Cov(Rₚ, Rm) / Var(Rm)",
  },

  max_drawdown: {
    id: "max_drawdown",
    label: "Max Drawdown",
    category: "risk",
    oneLiner: "The largest peak-to-trough loss your portfolio actually experienced over the analysis window.",
    meaning:
      "If your portfolio went from $100 to $135 to $95 over the period, your max drawdown is −29.6% (the trough $95 vs the peak $135). It's the worst observed slide, measured from the all-time-high.",
    whyItMatters:
      "Volatility tells you how much things wiggle, drawdown tells you how far they fall. A 50% drawdown requires a 100% subsequent gain just to recover — drawdowns hurt compounding asymmetrically.",
    howToImprove:
      "Add assets uncorrelated to your main holdings (bonds, gold, hedges). Trim concentration. Optimized Hedge in the Improve tab specifically targets drawdown reduction.",
    mistake:
      "Comparing drawdowns across different time periods. A 1-year window won't show 2008 or 2022. Always check the date range.",
    range: "Diversified equities 15–25% in normal years, 35–50% in crashes. >50% suggests dangerous concentration or leverage.",
    formula: "min((Vₜ − max(V₀..Vₜ)) / max(V₀..Vₜ))",
  },

  var_95: {
    id: "var_95",
    label: "VaR 95%",
    category: "risk",
    oneLiner: "There's a 95% chance your monthly loss won't exceed this number — and a 5% chance it will.",
    meaning:
      "Historical Value-at-Risk: the 5th percentile of historical monthly returns. If VaR is −8%, then in 1 month out of every 20 (roughly), you'd expect to lose at least 8%.",
    whyItMatters:
      "VaR translates the abstract 'how risky is this' into a concrete dollar figure: 'in a bad month, I could lose around X%.' That's much more actionable than volatility alone.",
    howToImprove:
      "VaR shrinks with diversification and with lower beta. Adding bonds or gold typically improves VaR meaningfully without big return cost.",
    mistake:
      "Treating VaR as a worst-case ceiling. VaR is the threshold of the bad 5% — the actual losses inside that 5% can be much worse. That's what CVaR captures.",
    range: "S&P 500 monthly VaR ~−7%. Concentrated tech often −12% or worse.",
    formula: "5th percentile of monthly returns",
  },

  upside_capture: {
    id: "upside_capture",
    label: "Upside Capture",
    category: "capture",
    oneLiner: "How much of the market's gains you keep when the market goes up.",
    meaning:
      "When the benchmark has positive months, what's the average ratio of your return to its return? 1.10× means you capture 110% of the upside — you outperform in good months. 0.80× means you only capture 80%.",
    whyItMatters:
      "Together with downside capture, this tells you whether your portfolio is asymmetric: 'do I get more upside than downside?' That asymmetry is what compounds wealth over time.",
    howToImprove:
      "Higher-beta growth assets boost upside capture but usually at the cost of downside. The 'free lunch' is finding lowly-correlated assets that participate in rallies.",
    mistake:
      "Assuming high upside capture is always good. If it comes paired with high downside capture, you're just amplifying the market — same Sharpe, more volatility.",
    range: "Diversified equity ~1.0×. Aggressive growth often 1.2–1.5×. Defensive often 0.7–0.9×.",
  },

  downside_capture: {
    id: "downside_capture",
    label: "Downside Capture",
    category: "capture",
    oneLiner: "How much of the market's losses you absorb when the market goes down.",
    meaning:
      "When the benchmark has negative months, what's the average ratio of your loss to its loss? 1.30× means you fall 30% harder than the market in bad months — bad. 0.70× means you only fall 70% as hard — good.",
    whyItMatters:
      "Downside capture is arguably the single most actionable risk metric. Lower = better. Combined with upside capture, you get a true sense of asymmetry.",
    howToImprove:
      "This is what the Optimized Hedge path in the Improve tab specifically minimizes. Adding TLT, AGG, or GLD to a concentrated portfolio typically cuts downside capture meaningfully.",
    mistake:
      "Optimizing this in isolation. You can drive downside capture toward 0 by holding all bonds — but that destroys returns. The skill is reducing it without nuking Sharpe.",
    range: "Want it below 1.0×. Diversified equity ~1.0×. Concentrated growth often 1.4–1.8×. Defensive 0.6–0.9×.",
  },

  enp_risk: {
    id: "enp_risk",
    label: "Real Diversification (ENP)",
    category: "diversification",
    oneLiner: "How many independent risk bets you actually have — accounting for correlation, not just ticker count.",
    meaning:
      "If you own 5 names but they all move together, you really have ~1 bet. ENP_risk computes the inverse Herfindahl of *risk shares* (not capital weights), so highly correlated holdings collapse into a single effective position.",
    whyItMatters:
      "This is the headline diversification metric. Most retail tools only count tickers — Panko measures actual independence. A 5-stock portfolio with ENP_risk of 1.8 is much riskier than the ticker count suggests.",
    howToImprove:
      "Add genuinely uncorrelated assets — bonds and gold add the most ENP_risk per dollar. Adding another tech stock to a tech-heavy portfolio barely moves the needle even though ticker count goes up.",
    mistake:
      "Confusing this with the simple count of holdings. Ten S&P 500 ETFs gives you a ticker count of 10 but ENP_risk of ~1.0.",
    range: "Below 2.0 = highly concentrated. 2.0–4.0 = moderate. 4.0–8.0 = well diversified. Above 8.0 = institutional-style breadth.",
    formula: "1 / Σᵢ(PRCᵢ²) — where PRC = correlation-adjusted risk contribution",
  },

  hhi: {
    id: "hhi",
    label: "Herfindahl Index (HHI)",
    category: "diversification",
    oneLiner: "Concentration score. Sum of squared weights. Higher = more concentrated.",
    meaning:
      "If you hold 100% in one stock, HHI = 1.0 (max concentration). Equal weights across 5 stocks gives HHI = 0.20. Equal weights across 10 stocks gives HHI = 0.10. The reciprocal (1/HHI) is the 'effective number of positions' (ENP).",
    whyItMatters:
      "Used by regulators to measure market concentration; here it's a quick scalar for portfolio breadth based on capital weights alone.",
    howToImprove:
      "Lower HHI by spreading weights more equally. Note this is *capital* concentration — for risk concentration that accounts for correlation, see ENP_risk.",
    mistake:
      "Treating low HHI as 'safe.' 10 highly correlated stocks have low HHI but high effective concentration in risk terms.",
    range: "<0.15 broadly diversified. 0.15–0.30 moderate. >0.30 concentrated.",
    formula: "Σᵢ wᵢ²",
  },

  risk_score: {
    id: "risk_score",
    label: "Health Score",
    category: "score",
    oneLiner: "Single 0–10 score blending Sharpe, drawdown, real diversification, and beta. Higher = healthier.",
    meaning:
      "A weighted composite. Each pillar contributes a penalty: low Sharpe (×2.0), big drawdowns (×3.0), low real diversification (×2.5), high beta (×2.5). The Health Score is 10 minus the total penalty, capped at [0, 10].",
    whyItMatters:
      "A single dashboard number anyone can quote. It moves when any of the four pillars moves, so a single trade that helps one pillar but hurts another shows up here as a net.",
    howToImprove:
      "The Improve tab's 'Maximize Health' optimizer specifically targets this composite. Generally: trim concentration, add hedges, reduce beta — without nuking Sharpe.",
    mistake:
      "Treating it as a fixed grade. A 7.0 isn't 'good or bad' — it's a snapshot. The Monitor tab shows how it drifts over time, which is what matters.",
    range: "<4 = High risk. 4–6 = Elevated. 6–8 = Moderate / Strong. 8+ = Strong.",
    formula: "10 − (sharpe_penalty + dd_penalty + concentration_penalty + beta_penalty)",
  },

  alpha: {
    id: "alpha",
    label: "Alpha",
    category: "performance",
    oneLiner: "Return your portfolio earned beyond what its market exposure (beta) would explain.",
    meaning:
      "Alpha = your return − (beta × benchmark return). Positive alpha means you're getting return that isn't just from market exposure — true skill or genuine asset selection. Negative alpha means you're underperforming what your beta predicts.",
    whyItMatters:
      "Alpha separates 'I made money because I took market risk' from 'I made money because of my specific picks.' Most retail portfolios have alpha very close to zero — that's not bad, just honest.",
    howToImprove:
      "Sustainably hard. Most active managers don't generate positive alpha after fees. Concentration in genuinely mispriced assets is the only real source.",
    mistake:
      "Reading short-window alpha as skill. Six months of alpha could be luck. Multi-year alpha with consistent t-stat is the bar.",
    range: "Most retail portfolios within ±2% annually. >5% sustained alpha is exceptional and rare.",
    formula: "Rₚ − (β × Rm)",
  },

  cvar_95: {
    id: "cvar_95",
    label: "CVaR 95% (Expected Shortfall)",
    category: "risk",
    oneLiner: "If we land in the bad 5% of months, this is the average loss we should expect.",
    meaning:
      "CVaR (Conditional VaR) is the average loss conditional on being below the VaR threshold. If your monthly VaR is −8% and CVaR is −13%, that means: in the bad 5% of months, the typical loss is −13%, not −8%. CVaR captures the depth of the tail, not just where it starts.",
    whyItMatters:
      "VaR tells you the threshold of pain; CVaR tells you what's behind it. CVaR is what regulators (Basel III) actually use because it's not gameable by stuffing fat tails just past the VaR cutoff.",
    howToImprove:
      "Same as VaR — diversification, lower beta, hedges. But CVaR responds especially well to genuinely uncorrelated assets that don't crash with equities (gold, long-duration treasuries).",
    mistake:
      "Quoting only VaR while CVaR is much worse. A portfolio can have a 'reasonable' VaR but a catastrophic CVaR — that's the signature of fat-tail exposure.",
    range: "Typically 50–80% deeper than VaR (i.e., if VaR is −8%, CVaR ~−12% to −14%). If CVaR is more than 2× VaR, you have meaningful tail risk.",
    formula: "E[R | R ≤ VaR]",
  },

  information_ratio: {
    id: "information_ratio",
    label: "Information Ratio",
    category: "performance",
    oneLiner: "Alpha per unit of tracking error — Sharpe's cousin for measuring active skill vs. a benchmark.",
    meaning:
      "Information Ratio = alpha / tracking_error. Where Sharpe asks 'how much excess return per unit of total volatility,' IR asks 'how much excess return per unit of *deviation from the benchmark.*' It rewards consistent outperformance, not just outperformance.",
    whyItMatters:
      "If you're trying to beat SPY, IR is a more honest scorecard than raw return. A manager with 2% alpha and 4% tracking error has IR = 0.5 (decent). A manager with 5% alpha and 20% tracking error has IR = 0.25 (lucky, not skilled).",
    howToImprove:
      "Sustained IR > 0.5 is hard. The lever is reducing tracking error (closer index-hugging) or increasing alpha (genuine skill). Most retail IRs are noise.",
    mistake:
      "Confusing IR with Sharpe. They look similar but measure different things — Sharpe vs cash, IR vs benchmark.",
    range: "0.0 = market-tracking. 0.3 = okay. 0.5 = strong. 0.75+ = top-quartile institutional.",
    formula: "(Rₚ − Rm) / stdev(Rₚ − Rm)",
  },

  tracking_error: {
    id: "tracking_error",
    label: "Tracking Error",
    category: "performance",
    oneLiner: "How much your portfolio's returns deviate from the benchmark — annualized.",
    meaning:
      "The annualized standard deviation of your active return (portfolio return minus benchmark return). 0% means you exactly track the benchmark; 5% means you typically deviate ±5% per year from it.",
    whyItMatters:
      "Tells you how 'active' your portfolio actually is. Index funds have tracking error near 0. Concentrated stock pickers easily run 10%+. Whether that's good depends on whether the deviations are paying you (Information Ratio).",
    howToImprove:
      "Lower tracking error: hold benchmark-like positions (or just buy the benchmark). Higher tracking error: concentrate, pick offbeat themes. The question isn't 'high or low' but 'paid for it or not.'",
    mistake:
      "Treating high tracking error as a problem. It's a *sign* of activeness — the question is whether the alpha justifies it.",
    range: "Index funds <0.5%. Active equity 4–10%. Concentrated growth 10–25%.",
    formula: "stdev(Rₚ − Rm) × √252",
  },

  top1_weight: {
    id: "top1_weight",
    label: "Top Position Weight",
    category: "diversification",
    oneLiner: "What percentage of your capital sits in your single largest holding.",
    meaning:
      "Pure capital concentration in your biggest position. Different from *risk* concentration (PRC) — a 30% capital weight in a low-vol holding might be only 15% of risk; a 30% capital weight in a high-vol single name might be 50%+ of risk.",
    whyItMatters:
      "Single-name concentration is the most underestimated risk in retail portfolios. Single-stock blowups (Enron, Lehman, Silicon Valley Bank, FTX) routinely take 50%+ in days. Capital weight is the cleanest first-line check.",
    howToImprove:
      "Cap any single position. Common thresholds: institutional ≤5%, retail ≤15%, aggressive ≤25%. Above 30% you're effectively betting the portfolio on a single thesis.",
    mistake:
      "Letting winners run without trimming. A 5% NVDA position that grows to 40% over 2 years is now your portfolio's main bet — whether or not you intended it to be.",
    range: "Diversified <10%. Moderate 10–20%. Concentrated 20–35%. Single-bet >35%.",
  },

  concentration_top3: {
    id: "concentration_top3",
    label: "Top 3 Concentration",
    category: "diversification",
    oneLiner: "Combined capital weight of your three largest holdings.",
    meaning:
      "Quick scalar for how 'top-heavy' your portfolio is. If your top 3 holdings total 70% of capital, the rest of your positions barely matter for portfolio behavior — they're rounding errors.",
    whyItMatters:
      "Most retail portfolios are effectively 3-stock portfolios in disguise. Knowing this number tells you what your portfolio is actually expressing — versus what the ticker count suggests.",
    howToImprove:
      "Either rebalance toward more even weighting, or accept the concentration as an explicit thesis. Both are valid; ignoring it isn't.",
    mistake:
      "Looking at ticker count instead. 12 tickers with the top 3 at 70% acts like a 3-stock portfolio.",
    range: "<35% well-spread. 35–55% moderate. 55–75% concentrated. >75% effectively a 3-bet portfolio.",
  },

  theme_exposure: {
    id: "theme_exposure",
    label: "Theme Exposure",
    category: "diversification",
    oneLiner: "What proportion of your capital is exposed to a single thematic driver (e.g., AI Semis, Mega-Cap Tech, Crypto).",
    meaning:
      "Holdings are classified into broad themes (AI Semis, Cloud/SaaS, Mega-Cap Tech, Energy, Defensive, Bonds, Crypto, etc.) and weights summed per theme. The largest bucket tells you what your portfolio is *really* a bet on, regardless of how many tickers are in it.",
    whyItMatters:
      "This is where 'I'm diversified, I own NVDA, AMD, and TSM' falls apart — those are all the same theme. Theme concentration is the second layer of risk after single-name concentration.",
    howToImprove:
      "Add allocation outside your dominant theme. The Better Diversified path in the Improve tab specifically targets this by trimming the top theme and adding international or defensive exposure.",
    mistake:
      "Mistaking ticker count for theme breadth. A 10-name AI Semis portfolio is one bet, not ten.",
    range: "<25% per theme = broadly spread. 25–50% = thematic tilt. >50% = thematic concentration. >70% = single-theme portfolio.",
  },

  stress_scenarios: {
    id: "stress_scenarios",
    label: "Stress Scenarios",
    category: "risk",
    oneLiner: "Projected portfolio impact under historical crisis events — recession, rate shock, dollar shock, etc.",
    meaning:
      "Each holding has a per-scenario shock value (calibrated against historical regime data: 2008 GFC, 2022 rate hikes, 2020 COVID crash, etc.). The portfolio's expected hit is the weighted sum across positions.",
    whyItMatters:
      "Volatility tells you about typical conditions; stress scenarios tell you about regime breaks. A portfolio with a great Sharpe in calm markets can still lose 40% in a single named regime.",
    howToImprove:
      "The scenario column tells you which regime hurts most. Add assets that are negatively correlated to that regime (long duration treasuries help in deflation/recession, gold helps in inflation, cash helps in everything).",
    mistake:
      "Treating scenarios as forecasts. They are calibrated reactions, not probabilities. Use them to find your fragile spots, not to predict the future.",
    range: "Under any single scenario: <−10% mild, −10% to −20% moderate, −20% to −35% serious, >−35% catastrophic.",
  },

  pct_risk: {
    id: "pct_risk",
    label: "Risk Contribution (PRC)",
    category: "diversification",
    oneLiner: "What percentage of total portfolio volatility this single holding actually drives.",
    meaning:
      "PRC accounts for both a holding's weight AND its correlation with everything else. A 20% capital weight in a high-vol, highly-correlated holding might drive 40%+ of portfolio risk. PRCs across all holdings sum to exactly 100%.",
    whyItMatters:
      "This is where 'capital weights are misleading' lives. You can be 20% capital in NVDA but 50% risk in NVDA — meaning NVDA *is* your portfolio for risk purposes, even though three other names exist.",
    howToImprove:
      "Trim positions whose PRC dramatically exceeds their capital weight. The Capital Efficiency table flags these as 'hidden risk.' The fix is usually to reduce the position itself or add an offsetting low-correlation asset.",
    mistake:
      "Using capital weights to estimate risk. They're often off by 1.5–3× for the largest position in a tech-heavy portfolio.",
    range: "Ideally each PRC ≤ ~1.5× its capital weight. PRC > 2× capital weight = serious concentration of risk.",
    formula: "PRCᵢ = wᵢ × MCRᵢ / σₚ — where MCR = (Σ × w)ᵢ / σₚ",
  },
};

export const CATEGORIES = [
  { id: "score",          label: "Score",          icon: "◎" },
  { id: "performance",    label: "Performance",    icon: "▲" },
  { id: "risk",           label: "Risk",           icon: "◆" },
  { id: "capture",        label: "Capture Ratios", icon: "↕" },
  { id: "diversification", label: "Diversification", icon: "◐" },
];

export function getMetric(id) {
  return METRICS[id] ?? null;
}

export function getMetricsByCategory(categoryId) {
  return Object.values(METRICS).filter((m) => m.category === categoryId);
}
