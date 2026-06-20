// One-line definitions used for inline tooltips on metric cards.
// Deeper explanations live in Learn pages.

export const GLOSSARY = {
  sharpe:
    "Risk-adjusted return: mean return divided by volatility, annualized. Higher = better. >1 is decent, >2 is great, but be skeptical of any number above 3 — usually overfitting.",
  sortino:
    "Like Sharpe, but divides by downside volatility only. Treats upside swings as a feature, not a risk.",
  cagr:
    "Compound annual growth rate. The constant annual return that would have produced the same final equity over the period.",
  maxDrawdown:
    "Largest peak-to-trough decline in equity. The size of the worst losing streak. If you can't stomach this number, the strategy is unusable.",
  winRate:
    "Percent of trades that closed profitable. Low win rate isn't bad if your winners are large — trend-following typically wins 35–45%.",
  profitFactor:
    "Gross profit divided by gross loss. >1 means profitable. >2 is strong but check the sample size.",
  expectancy:
    "Average profit per trade. Tells you how much you make per round-turn on average.",
  exposure:
    "Percent of trading days the strategy was actually in a position. Low exposure means you're often in cash — buy-and-hold isn't a fair comparison.",
  monteCarlo:
    "Bootstrap your trade returns into 1,000 random orderings to see the range of outcomes. Tests whether the result is lucky, robust, or unlucky.",
  walkForward:
    "Split the period into folds and re-evaluate per fold. Catches strategies that work in one regime and fail in others.",
  inSampleBias:
    "Performance over the data you tuned on overstates real-world expectation. The walk-forward and out-of-sample numbers are closer to the truth.",
};

export function tip(key) {
  return GLOSSARY[key] || "";
}
