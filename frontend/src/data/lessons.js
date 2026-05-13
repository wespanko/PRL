// Practice lessons — quant finance math, Duolingo-style.
//
// Each exercise has a `type` and the props required for that type:
//   "mc"      : { question, options[], correctIndex, explanation }
//   "tf"      : { question, correct (boolean), explanation }
//   "numeric" : { question, answer, tolerance, unit?, explanation }
//
// `explanation` is shown after the user submits, regardless of correct/wrong.
// XP awarded = exercises.length * 10 per lesson.

import {
  Activity,        // Volatility & Returns
  TrendingUp,      // Sharpe Ratio
  Layers,          // Diversification
  Gauge,           // Beta
  ShieldCheck,     // Drawdowns
  AlertTriangle,   // VaR
  BarChart3,       // Capture Ratios
  Network,         // Correlation
} from "lucide-react";

export const LESSONS = [
  {
    id: "vol_basics",
    title: "Volatility & Returns",
    subtitle: "How returns and risk are measured",
    icon: Activity,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "What does volatility measure?",
        options: [
          "The average return over time",
          "How much returns swing around the average",
          "The dollar value of the portfolio",
          "How long you've held a stock",
        ],
        correctIndex: 1,
        explanation: "Volatility is the standard deviation of returns — it captures how spread out returns are around their mean. Two portfolios can have the same average return but very different volatilities.",
      },
      {
        type: "numeric",
        question: "A stock returns 10%, 5%, -3%, 8%, and 12% over five years. What's the arithmetic average annual return?",
        answer: 6.4,
        tolerance: 0.1,
        unit: "%",
        explanation: "Sum the returns: 10 + 5 + (-3) + 8 + 12 = 32%. Divide by 5 years = 6.4%. This is the arithmetic mean — geometric (CAGR) would be slightly lower.",
      },
      {
        type: "tf",
        question: "Higher volatility always means higher long-term returns.",
        correct: false,
        explanation: "Higher volatility means higher RISK, not necessarily higher returns. A volatile asset could swing either way. The risk premium is the EXPECTED extra return for taking risk — there's no guarantee.",
      },
      {
        type: "mc",
        question: "Annualized volatility of 20% roughly means…",
        options: [
          "The portfolio gains 20% per year",
          "Annual returns typically fall within ±20% of the average about two-thirds of the time",
          "The portfolio loses 20% every year",
          "Volatility is measured 20 times per year",
        ],
        correctIndex: 1,
        explanation: "Assuming returns are roughly normal, ~68% of yearly outcomes land within one standard deviation of the mean. So 20% vol means a typical year sits within ±20% of the average — both up and down.",
      },
      {
        type: "numeric",
        question: "If monthly volatility is 4%, what's the annualized volatility? (Use √12 ≈ 3.464.)",
        answer: 13.86,
        tolerance: 0.2,
        unit: "%",
        explanation: "Volatility scales with the square root of time. Monthly vol × √12 ≈ 4 × 3.464 = 13.86%. Compare to returns, which scale linearly with time.",
      },
    ],
  },

  {
    id: "sharpe",
    title: "The Sharpe Ratio",
    subtitle: "Return per unit of risk",
    icon: TrendingUp,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "The Sharpe Ratio measures…",
        options: [
          "How much money you've made",
          "Excess return per unit of volatility",
          "The portfolio's market cap",
          "How many stocks you own",
        ],
        correctIndex: 1,
        explanation: "Sharpe = (Return − Risk-Free Rate) / Volatility. It tells you how much extra return you're getting for each unit of risk you take. Higher is better.",
      },
      {
        type: "numeric",
        question: "A portfolio returns 12%, with 15% volatility, when the risk-free rate is 3%. What's the Sharpe Ratio?",
        answer: 0.6,
        tolerance: 0.02,
        explanation: "Sharpe = (12 − 3) / 15 = 9 / 15 = 0.60. A Sharpe of 1.0 is considered good; >2.0 is excellent; <0.5 means you're not being adequately compensated for the risk.",
      },
      {
        type: "tf",
        question: "If two portfolios have the same return but Portfolio A has a higher Sharpe Ratio, A took less risk to get there.",
        correct: true,
        explanation: "Exactly right. Same return, higher Sharpe → smaller denominator (volatility), meaning less risk for the same payoff. That's a more efficient portfolio.",
      },
      {
        type: "mc",
        question: "Which Sharpe Ratio would you generally prefer?",
        options: [
          "0.3 — low risk, low return",
          "0.8 — solid risk-adjusted return",
          "1.4 — strong risk-adjusted return",
          "Sharpe doesn't tell you anything useful",
        ],
        correctIndex: 2,
        explanation: "Higher Sharpe = more return per unit of risk. 1.4 means you're earning 1.4 units of excess return for every 1 unit of risk taken. That's strong — top decile of mutual funds.",
      },
      {
        type: "numeric",
        question: "Portfolio X has Sharpe 0.5 and 20% volatility. The risk-free rate is 4%. What's the portfolio's total annual return?",
        answer: 14,
        tolerance: 0.2,
        unit: "%",
        explanation: "Sharpe × Vol + Rf = Return. So 0.5 × 20 + 4 = 14%. This is how Sharpe relates back to the actual return number.",
      },
    ],
  },

  {
    id: "diversification",
    title: "Real Diversification",
    subtitle: "Why 10 stocks isn't always 10 bets",
    icon: Layers,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "If you hold 10 stocks that all move identically (correlation = 1.0), how many INDEPENDENT bets do you have?",
        options: [
          "10 — one per stock",
          "Effectively 1 — they're the same trade",
          "Around 5",
          "Impossible to know without more data",
        ],
        correctIndex: 1,
        explanation: "Diversification depends on whether your bets are INDEPENDENT. Ten perfectly correlated stocks = one bet repeated ten times. Capital ENP (effective number of positions) corrects for this.",
      },
      {
        type: "tf",
        question: "Two stocks with correlation of 0 always reduce portfolio risk when combined.",
        correct: true,
        explanation: "Zero-correlation pairs always reduce risk when combined — when one zigs, the other doesn't necessarily zig too. Even moderate-correlation pairs (0.3-0.5) provide meaningful diversification.",
      },
      {
        type: "numeric",
        question: "A portfolio has weights [0.4, 0.3, 0.2, 0.1]. Compute its Herfindahl Index (sum of squared weights).",
        answer: 0.3,
        tolerance: 0.005,
        explanation: "HHI = 0.4² + 0.3² + 0.2² + 0.1² = 0.16 + 0.09 + 0.04 + 0.01 = 0.30. The capital-weight ENP is 1/HHI ≈ 3.33 — far fewer than 4 'effective' positions due to the 40% concentration.",
      },
      {
        type: "mc",
        question: "Your portfolio has 20 holdings. Why might Panko say you have a 'concentration problem'?",
        options: [
          "20 holdings is always too many",
          "Maybe 4 holdings are 80% of the portfolio (capital concentration)",
          "Or those 20 stocks could all be tech (correlation concentration)",
          "Both B and C — concentration can hide in plain sight",
        ],
        correctIndex: 3,
        explanation: "Concentration shows up in two ways: (1) capital — a few names dominate the weights, (2) correlation — many names but they all move together. A truly diversified portfolio is balanced in BOTH dimensions.",
      },
      {
        type: "tf",
        question: "Adding gold to an all-equity portfolio almost always lowers portfolio volatility.",
        correct: true,
        explanation: "Gold has historically been low- or negative-correlated to equities (especially during crises). Adding even 5-10% gold typically reduces overall portfolio vol — the textbook diversification benefit.",
      },
    ],
  },

  {
    id: "beta",
    title: "Beta & Market Risk",
    subtitle: "How much you move with the market",
    icon: Gauge,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "A portfolio with beta = 1.5 means…",
        options: [
          "It returns 50% more than the market",
          "When the market moves 1%, the portfolio tends to move 1.5%",
          "It's 50% riskier than the average stock",
          "It has 1.5× the dividend yield",
        ],
        correctIndex: 1,
        explanation: "Beta measures sensitivity to the market. Beta = 1.5 → portfolio moves 1.5% when market moves 1%, both up and down. Higher beta = more market exposure (more upside in rallies, more downside in selloffs).",
      },
      {
        type: "numeric",
        question: "The S&P 500 drops 8%. Your portfolio has beta of 1.2. What's your expected return?",
        answer: -9.6,
        tolerance: 0.2,
        unit: "%",
        explanation: "Expected portfolio return ≈ beta × market return = 1.2 × (-8%) = -9.6%. Beta amplifies both directions — that's the trade-off. (This ignores alpha and the risk-free rate; just the beta-driven part.)",
      },
      {
        type: "tf",
        question: "A portfolio with beta = 0 is risk-free.",
        correct: false,
        explanation: "Beta = 0 means uncorrelated WITH THE MARKET, but the portfolio can still have idiosyncratic risk (its own ups and downs). Cash is roughly beta = 0 AND low vol. Long-vol funds can be beta-0 but high-vol.",
      },
      {
        type: "mc",
        question: "Why might a 'defensive' investor want a portfolio with beta < 1?",
        options: [
          "To get higher returns than the market",
          "To dampen drawdowns in market selloffs",
          "Because low beta means high Sharpe",
          "It's required by regulators",
        ],
        correctIndex: 1,
        explanation: "Beta < 1 means the portfolio moves LESS than the market. In a 20% selloff, a beta-0.7 portfolio drops ~14% instead of 20%. Trade-off: it'll also gain less in rallies.",
      },
    ],
  },

  {
    id: "drawdowns",
    title: "Drawdowns",
    subtitle: "The pain you actually feel",
    icon: ShieldCheck,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "Max Drawdown is…",
        options: [
          "The largest single-day loss",
          "The largest peak-to-trough decline over a period",
          "The average yearly loss",
          "The cumulative loss over the whole period",
        ],
        correctIndex: 1,
        explanation: "Max Drawdown is the worst peak-to-trough drop the portfolio has experienced. It's the single best measure of 'how bad did it get' — and it's what investors actually feel during a crisis.",
      },
      {
        type: "numeric",
        question: "A portfolio peaks at $120,000, falls to $84,000, then recovers. What's its max drawdown? (Enter as a percent, ignore sign.)",
        answer: 30,
        tolerance: 0.5,
        unit: "%",
        explanation: "Drawdown = (Trough − Peak) / Peak = (84 − 120) / 120 = -30%. So max drawdown is 30%. Recovering to $100,000 doesn't change the historical drawdown — that pain happened.",
      },
      {
        type: "tf",
        question: "If a portfolio loses 50%, it needs a 50% gain to fully recover.",
        correct: false,
        explanation: "It needs 100%, not 50%. From $100 → $50 is a 50% loss, but $50 → $100 is a 100% gain. Drawdown recovery math is asymmetric — that's why capping drawdowns matters so much.",
      },
      {
        type: "mc",
        question: "Which is generally the better risk metric for a retiree?",
        options: [
          "Volatility — it's the standard",
          "Max Drawdown — captures the worst case they could face",
          "Sharpe Ratio — it's the most famous",
          "Beta — measures market risk",
        ],
        correctIndex: 1,
        explanation: "Retirees withdraw money — selling at a drawdown locks in losses. Max Drawdown captures the worst-case scenario they'd actually experience. Vol treats up-moves and down-moves equally; retirees care way more about the downside.",
      },
    ],
  },

  {
    id: "var",
    title: "Value at Risk (VaR)",
    subtitle: "How bad does the worst 5% look?",
    icon: AlertTriangle,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "A monthly 95% VaR of -8% means…",
        options: [
          "The portfolio loses 8% every month",
          "In the worst 5% of months, losses are expected to exceed 8%",
          "There's a 95% chance of losing money",
          "The portfolio gains at least 8% per month",
        ],
        correctIndex: 1,
        explanation: "VaR at 95% confidence is the threshold the worst 5% of outcomes breach. -8% monthly VaR = once every ~20 months, you'd expect a worse month. It doesn't say HOW bad — just where the threshold is.",
      },
      {
        type: "tf",
        question: "VaR tells you the maximum possible loss.",
        correct: false,
        explanation: "VaR is a THRESHOLD, not a maximum. A 95% VaR of -10% means 5% of outcomes are worse than -10% — they could be much worse. That's why 'tail risk' beyond VaR matters. CVaR (Conditional VaR) captures the expected loss IF you breach.",
      },
      {
        type: "mc",
        question: "Which has more useful tail-risk info?",
        options: [
          "95% VaR alone",
          "95% VaR + CVaR (expected loss when VaR is breached)",
          "Just volatility",
          "The portfolio's market cap",
        ],
        correctIndex: 1,
        explanation: "VaR tells you where the threshold sits; CVaR tells you how bad it gets PAST that threshold. Together they capture both the frequency and severity of tail events — much more useful than VaR alone.",
      },
      {
        type: "numeric",
        question: "A portfolio has a mean monthly return of 1% and monthly volatility of 5%. Roughly, what's its 95% monthly VaR? (Use the 1.65 z-score for normal distribution.)",
        answer: -7.25,
        tolerance: 0.5,
        unit: "%",
        explanation: "Parametric VaR ≈ mean − z × stdev = 1% − 1.65 × 5% = 1% − 8.25% = -7.25%. This assumes normal returns — real-world tails are usually fatter, so historical VaR often exceeds parametric.",
      },
      {
        type: "tf",
        question: "A portfolio can have a low volatility but a high VaR if its return distribution has fat tails.",
        correct: true,
        explanation: "Exactly. Volatility captures average dispersion, but fat-tailed distributions (frequent extreme moves) can push VaR much further than vol would suggest. This is why 2008-style crashes blow through 'safe' assumptions.",
      },
    ],
  },

  {
    id: "capture",
    title: "Capture Ratios",
    subtitle: "Riding rallies, dodging drops",
    icon: BarChart3,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "What does an Upside Capture of 1.20 mean?",
        options: [
          "In up months, your portfolio averages 120% of the benchmark's gain",
          "Your portfolio is 20% more volatile than the market",
          "You captured 120% of all market moves",
          "Your portfolio outperforms by 20% per year",
        ],
        correctIndex: 0,
        explanation: "Upside Capture = (portfolio return in up months) / (benchmark return in up months). 1.20 means when the market is up, you typically beat it by 20%. Great in rallies.",
      },
      {
        type: "mc",
        question: "What does a Downside Capture of 0.70 mean?",
        options: [
          "Your portfolio falls 70% in crashes",
          "In down months, your portfolio drops only 70% as much as the benchmark",
          "You captured 70% of all market moves",
          "Your beta is 0.70",
        ],
        correctIndex: 1,
        explanation: "Downside Capture = (portfolio loss in down months) / (benchmark loss in down months). 0.70 means you lose less than the market when it falls. Lower is better here — this is the defensive metric.",
      },
      {
        type: "tf",
        question: "The IDEAL capture profile is upside > 1.0 AND downside < 1.0.",
        correct: true,
        explanation: "That's the holy grail: outperform when markets are up, underperform when markets are down. Active managers chase this constantly. Most simply track the index (both ~1.0); few sustainably achieve asymmetric capture.",
      },
      {
        type: "numeric",
        question: "Upside Capture is 1.10 and Downside Capture is 0.85. What's the capture ratio (up/down)?",
        answer: 1.29,
        tolerance: 0.02,
        explanation: "Capture Ratio = Upside / Downside = 1.10 / 0.85 ≈ 1.29. A ratio above 1.0 means you're getting asymmetric exposure — more upside per unit of downside. Anything above ~1.2 is considered strong.",
      },
      {
        type: "mc",
        question: "Why might a conservative investor prefer 0.6 upside capture and 0.4 downside capture over 1.0/1.0?",
        options: [
          "Because lower numbers are always better",
          "It misses 40% of rallies but only takes 40% of crashes — sleep-at-night portfolio",
          "Because the Sharpe ratio is automatically higher",
          "There's no reason; 1.0/1.0 is always better",
        ],
        correctIndex: 1,
        explanation: "Both numbers below 1.0 means you participate less in BOTH directions. For someone who values drawdown protection over absolute returns (e.g., retirees), this asymmetric DAMPENING is exactly the trade-off they want.",
      },
    ],
  },

  {
    id: "correlation",
    title: "Correlation",
    subtitle: "When two assets move together",
    icon: Network,
    color: "blue",
    exercises: [
      {
        type: "mc",
        question: "Correlation between SPY and QQQ is typically around 0.95. What does that mean?",
        options: [
          "QQQ usually returns 95% of what SPY returns",
          "They almost always move in the same direction with similar magnitude",
          "QQQ has 95% the volatility of SPY",
          "They're identical investments",
        ],
        correctIndex: 1,
        explanation: "Correlation measures co-movement on a -1 to +1 scale. 0.95 means SPY and QQQ move together nearly all the time. Holding both isn't really diversification — they're driven by the same big-tech megacap exposure.",
      },
      {
        type: "tf",
        question: "Correlation of -1.0 between two assets means combining them eliminates risk.",
        correct: true,
        explanation: "Perfectly negatively correlated assets are theoretically risk-eliminating if you can size them perfectly — when one goes up, the other goes down by the same amount. In practice this never holds exactly, but it's why hedges are valuable.",
      },
      {
        type: "mc",
        question: "Which pair offers the best diversification?",
        options: [
          "AAPL and MSFT (both tech megacaps)",
          "SPY and VTI (both broad US equity)",
          "SPY and TLT (equity and long-duration bonds)",
          "QQQ and XLK (both tech-heavy)",
        ],
        correctIndex: 2,
        explanation: "Equities and long-duration bonds historically have low or negative correlation — they respond to different drivers (growth vs rates). The other pairs are nearly redundant (correlation ~0.95+).",
      },
      {
        type: "numeric",
        question: "Two stocks each have 20% volatility and a correlation of 0.5. Equal-weight portfolio volatility = √(0.5×20² + 0.5×20² + 2×0.5×0.5×0.5×20×20). Compute it.",
        answer: 17.32,
        tolerance: 0.3,
        unit: "%",
        explanation: "Portfolio var = 0.5×400 + 0.5×400 + 2×0.25×0.5×400 = 200 + 200 + 100 = 500. √500 ≈ 22.36... wait — actually variance = 0.25×400 + 0.25×400 + 2×0.5×0.5×0.5×20×20 = 100 + 100 + 100 = 300. So vol = √300 ≈ 17.32%. Combining at 0.5 correlation already cuts vol from 20% to 17.3%.",
      },
      {
        type: "tf",
        question: "Correlation is constant — once measured, it stays the same.",
        correct: false,
        explanation: "Correlation is unstable and changes especially in crises. In 2008 and 2020, almost all 'uncorrelated' assets crashed together — correlation spiked toward 1.0 right when diversification was needed most. Always stress-test assumptions.",
      },
    ],
  },
];

export const TOTAL_XP_AVAILABLE = LESSONS.reduce((s, l) => s + l.exercises.length * 10, 0);
