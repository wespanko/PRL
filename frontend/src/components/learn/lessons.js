// Lesson data. Each lesson is a JS object with sections.
// Rendered by LearnPage. Keeping content in code (vs markdown) for the MVP
// so we avoid adding a markdown dependency.

export const LESSONS = [
  {
    id: "sharpe",
    title: "Sharpe Ratio — what it really means",
    summary: "Risk-adjusted return. The single most-cited stat in quant. Also one of the most misused.",
    minutes: 4,
    sections: [
      {
        h: "The formula",
        body: "Sharpe = (mean return − risk-free rate) / std-dev of returns. Most backtests omit the risk-free rate and just compute mean/sigma. To annualize, multiply by √(periods per year). For daily returns, that's √252.",
      },
      {
        h: "What's a 'good' Sharpe?",
        body: "Above 1.0 is decent. Above 2.0 is strong. Above 3.0 — be suspicious. Most professional quant funds operate at 1.0–2.0 Sharpe net of fees. If your retail backtest claims 4.0, you have almost certainly fit to noise, made a lookahead mistake, or are looking at in-sample data.",
      },
      {
        h: "What it doesn't tell you",
        body: "Sharpe treats upside vol the same as downside vol. A strategy with huge upside surprises has the same Sharpe as a strategy with huge downside surprises if the magnitudes match. Sortino divides by downside volatility only — usually a better metric for tail-sensitive strategies.",
      },
      {
        h: "Common traps",
        body: "1) Using monthly returns and forgetting to scale. 2) Computing on small samples — Sharpe from 20 trades is statistical noise. 3) Survivorship bias in the data (delisted tickers removed). 4) In-sample optimization — your Sharpe is for the period you tuned on, not the period you'll trade in.",
      },
    ],
  },
  {
    id: "walk-forward",
    title: "Walk-forward — the bias your backtest is hiding",
    summary: "Why a strategy that 'works' on 10 years of data may not work tomorrow — and how to test it honestly.",
    minutes: 5,
    sections: [
      {
        h: "The bias",
        body: "When you tune parameters on a full dataset and then report results on that same dataset, you're describing how well your strategy fit the past — not how well it will work going forward. Every parameter you tune adds a degree of freedom; with enough degrees of freedom, almost any nonsense fits.",
      },
      {
        h: "Walk-forward analysis",
        body: "Split your data into N consecutive folds. The honest version: optimize on each fold's first 70% (in-sample) and test on the last 30% (out-of-sample). Roll the window forward. Aggregate the OOS results. That's much closer to the truth.",
      },
      {
        h: "This MVP's simpler version",
        body: "We split into 5 equal folds and run the SAME parameters on each. We're not re-optimizing per fold — that comes in V2. But this simpler check still kills most overfit strategies: a real edge holds across most folds, an overfit strategy works in one or two.",
      },
      {
        h: "What to look for",
        body: "Positive folds count: 4-of-5 or 5-of-5 is encouraging. 2-of-5 means your strategy depends on a regime. Stability: mean Sharpe divided by std-dev across folds — above 1.0 is reasonable. If stability is below 0.5, results are essentially regime-luck.",
      },
    ],
  },
  {
    id: "monte-carlo",
    title: "Monte Carlo — what bootstrapping does and doesn't tell you",
    summary: "Resampling trade returns to estimate the range of possible outcomes. Useful, but with caveats.",
    minutes: 4,
    sections: [
      {
        h: "What we're doing",
        body: "Take your N trade P&Ls. Sample N with replacement, in random order. Sum to get a new equity curve. Repeat 1,000 times. The distribution of final P&Ls answers: 'given this trade distribution, what's the range of outcomes I could plausibly see?'",
      },
      {
        h: "What you can read off it",
        body: "Median end P&L tells you the typical outcome — not the lucky one. P5–P95 range gives a 90% confidence band. If your realized result is near P95, you got lucky. Profitable rate tells you the probability a randomly-ordered version of your trades ends profitable.",
      },
      {
        h: "What it doesn't tell you",
        body: "Bootstrap assumes trades are independent (IID). They aren't. In trending markets, winners cluster — bootstrap understates drawdown risk because it scatters them. In mean-reverting markets, it overstates the risk. Block bootstrap (resampling consecutive chunks instead of individual trades) is more honest but more complicated.",
      },
      {
        h: "When MC is most useful",
        body: "When you want to ask: 'is my sample size large enough to trust this?' If your P5–P95 range is huge, you don't have enough trades. If it's narrow, you have a stable estimate (whether or not the strategy actually works).",
      },
    ],
  },
  {
    id: "overfitting",
    title: "Overfitting — the trap every retail quant falls into",
    summary: "How fitting to noise sneaks into your backtest, and the cheap ways to catch it.",
    minutes: 4,
    sections: [
      {
        h: "How it happens",
        body: "You try SMA(20,50). Looks decent. You try SMA(15,50). Better. SMA(15,45). Better still. You arrive at SMA(13,47) which has Sharpe 2.5. You ship it. Reality: you've fit to the specific path of the historical data. None of those parameter tweaks identified a real signal — they identified noise that happened to align.",
      },
      {
        h: "The cheap fixes",
        body: "1) Use round numbers. SMA(20,50) is a sensible prior. SMA(13,47) is a confession. 2) Check parameter robustness — if SMA(20,50) works but SMA(22,52) fails, your edge is fragile. 3) Walk-forward (see other lesson). 4) Out-of-sample reserve: hold the last 20% of data and never look at it until the very end.",
      },
      {
        h: "The smell test",
        body: "Most overfit strategies share two traits: high in-sample Sharpe (> 2.5) on a single asset, and parameters that look random rather than thematic. If you can't explain WHY your parameters are what they are, they're probably curve-fit.",
      },
      {
        h: "The honest workflow",
        body: "Form a hypothesis BEFORE running the backtest. ('I think momentum works on broad-market ETFs over 6–12 month windows.') Test the hypothesis with default sensible parameters. If it works in walk-forward, you have something. If you have to tune the parameters to make it work, you don't.",
      },
    ],
  },
  {
    id: "sample-size",
    title: "Sample size — when is a result meaningful?",
    summary: "A high Sharpe over 30 trades is noise. Over 500 trades, it's information. Where's the line?",
    minutes: 3,
    sections: [
      {
        h: "The standard error",
        body: "The uncertainty in your Sharpe estimate scales roughly as 1/√N. With 30 trades, a Sharpe of 1.5 has a standard error around ±0.5 — so the true Sharpe could be anywhere from 0.5 to 2.5. With 500 trades, the same Sharpe has standard error around ±0.13 — much more trustworthy.",
      },
      {
        h: "Practical thresholds",
        body: "Under 30 trades: anything is possible, your data is noise. 30–100: you can spot patterns, but not measure them. 100–500: estimates are reasonable, especially for win rate and expectancy. 500+: the estimates are stable; remaining uncertainty is from regime change, not sample size.",
      },
      {
        h: "Daily vs trade-level samples",
        body: "A strategy that trades 5 times a year over 10 years has 50 trades — low confidence. A strategy that trades daily over 5 years has 1,260 daily observations — much higher confidence, even with the same total exposure. More frequent observations let you measure faster.",
      },
    ],
  },
];

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id);
}
