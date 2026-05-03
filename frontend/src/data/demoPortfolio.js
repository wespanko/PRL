/**
 * A reasonable "default sandbox" portfolio so users don't have to type anything
 * to see what the app does. Mix of mega-cap tech (drives the interesting risk
 * narrative), broad equity, and hedges so the dashboard lights up with real
 * results across all 5 Panko Score pillars.
 */
export const DEMO_PORTFOLIO = {
  label: "Tech-tilted balanced",
  description: "60% tech-heavy growth, 25% broad equity, 15% hedges. A typical retail-aggressive starter mix.",
  holdings: [
    { ticker: "NVDA", weight: 0.20 },
    { ticker: "MSFT", weight: 0.15 },
    { ticker: "AAPL", weight: 0.10 },
    { ticker: "GOOGL", weight: 0.10 },
    { ticker: "META", weight: 0.05 },
    { ticker: "SPY", weight: 0.15 },
    { ticker: "QQQ", weight: 0.10 },
    { ticker: "TLT", weight: 0.08 },
    { ticker: "GLD", weight: 0.07 },
  ],
  start_date: "2022-01-01",
  end_date: "2025-01-01",
  benchmark: "SPY",
  risk_free_rate: 0.045,
};
