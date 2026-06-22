// Prediction-market explainers. Replaces the backtest lessons.

export const LESSONS = [
  {
    id: "edge-ev",
    title: "Edge & Expected Value — when is a bet worth taking?",
    summary: "If your probability differs from the market price, you have an edge. The size of that edge — and whether it survives fees + spread — is what matters.",
    minutes: 4,
    sections: [
      {
        h: "The setup",
        body: "A YES share on Polymarket pays $1 if YES wins, $0 if NO wins. The price (e.g. $0.40) is the market-implied probability. If you think the true probability is 0.50, your edge is +10¢. EV per dollar bet = (your_prob / market_price) − 1 = (0.50 / 0.40) − 1 = +25%.",
      },
      {
        h: "What kills your edge",
        body: "1) Spread. The mid is not your fill — you pay 1–5¢ extra on illiquid contracts. 2) Resolution risk. Polymarket's UMA oracle is good but not perfect; disputed markets can resolve unfavorably. 3) Time value. A 10¢ edge over 6 months is much weaker than 10¢ over a week (capital tied up).",
      },
      {
        h: "Calibrating 'I have edge'",
        body: "Most people overestimate their edge. Track yourself: log bets, compute Brier score (in the CALIBRATION view). If your Brier is above 0.20, you are NOT skilled at probability estimation yet — bet small while you calibrate.",
      },
      {
        h: "The annualization trap",
        body: "A 30% return over 6 months is great. The same return over 18 months is mediocre. Look at the ANNL EDGE RETURN metric in the market detail panel — it bakes in time to resolution. Edges look smaller annualized than they feel.",
      },
    ],
  },
  {
    id: "kelly",
    title: "Kelly Criterion — how big to bet",
    summary: "The mathematically optimal bet size when you have a quantifiable edge. Maximizes log growth — but full Kelly is volatile, so most people use a fraction.",
    minutes: 4,
    sections: [
      {
        h: "The formula",
        body: "For a binary bet: f* = (b·p − (1 − p)) / b, where p is your probability of winning and b is the decimal odds against (so for YES at $0.40, b = (1 − 0.40) / 0.40 = 1.5). f* is the fraction of bankroll to bet. If f* ≤ 0, don't bet.",
      },
      {
        h: "Why full Kelly hurts",
        body: "Full Kelly maximizes long-run log growth — but it's extremely volatile. A typical full-Kelly bettor sees 30–50% drawdowns regularly. Most pros bet 1/4 to 1/2 Kelly: gives up some growth, eliminates ruin risk and the emotional cost of huge drawdowns.",
      },
      {
        h: "Kelly is sensitive to your probability estimate",
        body: "If you think p=0.55 and you're actually at p=0.50, Kelly says bet ~10% of bankroll — but the true bet is 0% (no edge). Kelly amplifies overconfidence. Rule of thumb: shrink your stated probability toward the market price by 20–30% before computing Kelly.",
      },
      {
        h: "Per-bet vs. portfolio Kelly",
        body: "Single-bet Kelly assumes you bet your whole bankroll on one event. If you're holding 5 simultaneous positions, you can't actually put 25% on each — that's 125%. Cap your total exposure to ~50% of bankroll across all open bets.",
      },
    ],
  },
  {
    id: "calibration",
    title: "Calibration — are your '70%' guesses actually 70%?",
    summary: "A calibrated forecaster has 70% of their 70% predictions come true. Most retail bettors are dramatically overconfident — and don't know it.",
    minutes: 5,
    sections: [
      {
        h: "The test",
        body: "Group all your forecasts by probability bucket (50–60%, 60–70%, ...). Within each bucket, compute the actual hit rate. Perfect calibration: every bucket hits at its average forecast. Real-world: most people's 70% predictions hit at 55% — they're overconfident by 15 percentage points.",
      },
      {
        h: "Brier score: a single number",
        body: "Brier = mean((forecast − outcome)²). Range 0–1, lower better. 0.25 is what you get from always saying 50% (no skill). Below 0.20: meaningfully calibrated. Below 0.15: rare, suggests real edge. Above 0.25: you're worse than coin-flip — usually from being confidently wrong.",
      },
      {
        h: "ECE: where you're miscalibrated",
        body: "Expected Calibration Error tells you the average gap between your forecast and reality. ECE < 5% = well-calibrated. ECE > 15% = systematic error somewhere. Look at the per-bucket table in the CALIBRATION view — usually one or two buckets dominate the error.",
      },
      {
        h: "How long to get calibrated",
        body: "20 bets is nothing. 100 bets give you a rough picture. 500+ bets let you actually trust your Brier score. The single most underrated practice for a serious bettor: keep a log, review monthly, learn where you're wrong.",
      },
    ],
  },
  {
    id: "basis",
    title: "Basis Trades — when YES + NO ≠ $1",
    summary: "On a clean binary market, YES + NO should equal $1.00. When they don't, there's a basis trade — but the spread usually eats it.",
    minutes: 3,
    sections: [
      {
        h: "Why basis exists",
        body: "Polymarket uses an AMM-backed CLOB. When one side gets thin (e.g. nobody wants NO on a heavily-favored YES), the AMM widens the spread. The displayed prices drift — YES + NO can be 0.97 or 1.04. On liquid markets the AMM usually keeps it within 1–2¢.",
      },
      {
        h: "The trade — in theory",
        body: "If YES + NO = 0.97, buy both for 0.97 total and collect $1 on resolution = 3¢ profit. Risk-free, since one side definitely pays. If YES + NO = 1.04, sell both. Same risk-free logic.",
      },
      {
        h: "The trade — in practice",
        body: "The mid is not your fill. To actually buy YES + NO at the displayed prices, you need to either (a) hit market orders at the offers (paying spread), or (b) leave limit orders and wait. Either way, the realized profit is usually much smaller than the displayed basis — and on contracts with thin books, the basis often disappears before you can execute.",
      },
      {
        h: "Where it's real",
        body: "Basis is most exploitable on medium-liquidity markets ($10k–$100k liquidity) with stale prices, often during low-traffic hours (e.g. weekends). On <$5k liquidity contracts the spread eats it; on >$500k contracts the AMM closes it fast.",
      },
    ],
  },
  {
    id: "mechanics",
    title: "Polymarket Mechanics — how the venue actually works",
    summary: "Resolution, oracle disputes, USDC, on-chain. The stuff that bites you if you don't know it.",
    minutes: 4,
    sections: [
      {
        h: "Trading and settlement",
        body: "Polymarket is on Polygon, settled in USDC. Each market has two ERC-1155 token IDs (YES and NO). When the market resolves, the winning token redeems 1:1 for USDC; the losing token goes to zero. The CLOB is on-chain orderbook + AMM hybrid; matched trades settle in seconds.",
      },
      {
        h: "Resolution via UMA",
        body: "Polymarket uses the UMA optimistic oracle. After the event, anyone can propose a resolution; if undisputed for ~2 hours, it's accepted. If disputed, UMA tokenholders vote (≥2 days). The vast majority of markets resolve cleanly; edge cases (vague questions, news interpretation) can drag on.",
      },
      {
        h: "Disputes — the real risk",
        body: "Ambiguous markets sometimes resolve unexpectedly. Example: 'Will X happen by date Y' where X partially happens at Y. Read the resolution source criteria BEFORE you trade. If the criteria are vague, avoid the market — UMA voters interpret literally and can resolve against the 'common sense' answer.",
      },
      {
        h: "Fees and execution",
        body: "Polymarket charges no protocol fees on the CLOB (just Polygon gas, ~pennies). The cost is spread: 1–3¢ on liquid markets, 5–10¢ on thin ones. For US users, Polymarket is geoblocked; trading requires a VPN and your own wallet. Kalshi is the regulated US alternative.",
      },
    ],
  },
];

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id);
}
