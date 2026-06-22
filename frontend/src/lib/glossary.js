// Inline tooltip definitions for the prediction-market terminal.

export const GLOSSARY = {
  yesPrice:
    "The current price of a YES share, in dollars. Equivalent to the market-implied probability that YES resolves true. $0.74 means the market is saying 74% chance YES wins.",
  noPrice:
    "Price of a NO share. YES + NO should sum to $1.00; deviations are the basis.",
  basis:
    "YES price + NO price - 1. Should be near zero. Positive basis = paying a premium for both sides (avoid). Negative basis = you can buy both sides for less than $1 and lock a profit (rare; the venue's AMM usually closes these fast).",
  volume:
    "Cumulative dollar volume traded since market open. Higher = more participants, tighter spreads, better fills.",
  volume24h:
    "Volume in the last 24 hours. Filter for liquid markets here — many old markets have high cumulative volume but no current activity.",
  liquidity:
    "Approximate depth of book — how much you can trade at near-current prices without moving the price. Polymarket reports this as on-chain CLOB liquidity.",
  edge:
    "Your probability minus the market price. +5¢ = you think YES wins 5% more often than the market does. Edge is what makes a bet +EV.",
  ev:
    "Expected value per $1 bet. Computed as (your_prob / market_price) - 1 for a YES bet. +20% means each $1 returns $1.20 in expectation.",
  kelly:
    "Optimal fraction of bankroll to bet given your edge. Kelly maximizes log growth. Most pros bet 1/4 or 1/2 of Kelly to reduce volatility.",
  brier:
    "Mean squared error of your forecasts vs. outcomes. Lower is better. 0 = perfect; 0.25 = coin flip; >0.25 = worse than guessing.",
  logLoss:
    "Penalizes confident wrong predictions much more than Brier. The metric a calibration-aware bettor optimizes.",
  ece:
    "Expected Calibration Error. Weighted average gap between your stated probability and the actual hit rate, per bucket. <5% is well-calibrated.",
  brierSkill:
    "Brier skill score: 1 = perfect, 0 = no skill (same as always saying 50%), negative = worse than 50/50. The number that says whether you have an edge.",
  resolution:
    "How the market knows YES vs NO. Polymarket uses UMA optimistic oracle: anyone can propose a resolution; disputes go to UMA tokenholders.",
  ammSpread:
    "Polymarket's CLOB has an AMM behind it. Spreads on illiquid markets can be large (5–10¢). Always check the orderbook before assuming a printed price is the price you'll get.",
};

export function tip(key) {
  return GLOSSARY[key] || "";
}
