# Phase 4 Product Roadmap — Panko Risk Lab

## The Honest Problem Statement

Right now, a user who pastes their portfolio into ChatGPT gets 80% of what this tool provides. The remaining 20% is:
- Actual price data fetched automatically
- Computed metrics (VaR, HHI, ENP) that require real math, not guessing
- Visual charts

That's a thin moat. The narrative ("this portfolio is tech-heavy") is trivially reproducible by any LLM with a prompt. To build something people pay for, the product needs to do things that **require state over time** and **require data pipelines** — both of which LLMs can't replicate in a chat window.

---

## What Creates Real Moat

### Tier 1 — Real Product Moat (Build These)

**1. Portfolio Memory + "What Changed" Engine**
- Store snapshots of every analysis run (tickers, weights, full results object) in localStorage
- On next run with same or similar tickers: diff the metrics and surface changes as plain English
- "Your Sharpe dropped from 0.82 → 0.61 since March. Tech concentration rose from 48% → 67%. ENP_risk fell from 3.2 → 2.1."
- This is the core moat: *temporal context*. ChatGPT has no memory of your last report. This tool does.
- Build order: snapshot model → diff engine → narrative change detector

**2. Benchmark Attribution**
- Decompose portfolio return into: (a) beta to SPY, (b) factor tilts (size, value, momentum), (c) idiosyncratic alpha
- Show what fraction of returns came from just being long equities vs. actual positioning
- "You returned 14.2% vs SPY 18.1%. 12.8pp came from equity beta. Your active bets contributed −3.9pp."
- This is devastating/illuminating for most retail investors who think they're beating the market when they're just holding NVDA
- Requires: fetching benchmark returns, running 4-factor regression (or at minimum single-factor beta decomp)

**3. Position-Level Capital Efficiency ("Dead Weight" Detector)**
- For each holding: marginal risk contribution vs. weight
- Flag positions where `weight >> pct_risk` (paying for exposure you're already getting elsewhere) and `weight << pct_risk` (unintended concentration risk)
- "MSFT adds 8% to portfolio risk but you only allocated 4% — it's a hidden concentration risk."
- "GOOG adds almost identical factor exposure as META at lower return. One of these is redundant."
- This requires correlation-adjusted analysis that's genuinely hard to replicate in a chat window

### Tier 2 — Nice to Have (Build if Time Allows)

**4. Regime Detection**
- Classify current market environment: Risk-On Bull / Risk-Off / High-Vol / Rate-Shock / Defensive Rotation
- Use rolling: VIX level, 10Y-2Y spread, SPY momentum, HY spread
- Show which of your holdings historically perform in current regime vs. historical average
- Useful but not differentiated — Bloomberg already does this, and it's expensive to maintain signal quality

**5. Monthly CIO-Style Report**
- Auto-generate a formatted PDF report: executive summary, metrics dashboard, portfolio DNA, stress table, capital efficiency, "what changed"
- Useful as a deliverable for people managing money for others (family offices, small RIAs)
- Moat level: moderate — it's the packaging of the above, not the insight itself

**6. Compare Mode (Two Portfolios)**
- Side-by-side analysis of current vs. proposed allocation
- Show the risk/return/concentration tradeoff of rebalancing
- Good for "should I add NVDA?" or "what if I trim tech to 40%?"

### Tier 3 — Nice to Have, Low Priority

**7. Factor exposure sliders** — "what if I want 20% less tech beta?"
**8. Tax-loss harvesting detector** — identify correlated substitutes for underwater positions
**9. Monte Carlo forward simulation** — pretty visuals, mostly noise for holding periods < 5 years
**10. Multi-currency support** — necessary for international users, low complexity, low moat

---

## Portfolio Save/Load Architecture

### Phase 4a: Local Storage (No Auth)

Store snapshots keyed by timestamp + portfolio fingerprint:

```
localStorage["panko_snapshots"] = [
  {
    id: "2025-03-15_NVDA-MSFT-GOOGL",
    timestamp: "2025-03-15T14:23:00Z",
    payload: { tickers, weights, lookback, benchmark },
    results: { ...full AnalyzeResponse }
  },
  ...
]
```

- Cap at 20 snapshots, auto-evict oldest
- UI: "Load previous report" dropdown in header
- No backend changes needed in Phase 4a

### Phase 4b: Cloud Persistence (Requires Auth)
- FastAPI + SQLite/Postgres: `users` → `portfolios` → `snapshots`
- JWT auth (simple email/password, no OAuth complexity yet)
- Enables: cross-device access, scheduled re-runs, email alerts when risk metrics move

**Decision point**: Don't build 4b until you have 10+ users actively using 4a. Local storage first.

---

## "What Changed" Engine

### Input
Two snapshots: `prev_results`, `curr_results`

### Output
A structured diff report:

```python
{
  "metric_changes": [
    { "metric": "sharpe_ratio", "prev": 0.82, "curr": 0.61, "delta": -0.21, "severity": "warning" },
    { "metric": "enp_risk", "prev": 3.2, "curr": 2.1, "delta": -1.1, "severity": "warning" },
  ],
  "composition_changes": [
    { "ticker": "NVDA", "prev_weight": 0.15, "curr_weight": 0.28, "note": "nearly doubled" },
  ],
  "new_tickers": ["META"],
  "removed_tickers": ["AAPL"],
  "summary_sentence": "Portfolio risk rose sharply — Sharpe down 25%, real diversification down 34%, led by NVDA doubling to 28%."
}
```

### Severity Thresholds (Suggested)
| Metric | Warning | Critical |
|--------|---------|----------|
| Sharpe delta | > 0.15 drop | > 0.30 drop |
| ENP_risk delta | > 0.5 drop | > 1.5 drop |
| Max drawdown delta | > 5pp worse | > 15pp worse |
| Top-1 weight | > 30% | > 45% |

### Implementation Approach
- Backend: `POST /compare` endpoint, accepts two payloads, returns diff report
- Frontend: on load, check localStorage for prior snapshot of same tickers; if found, offer "Compare with [date]" button
- No LLM needed — all deterministic rules

---

## Benchmark Attribution Engine

### Goal
Answer: "How much of your return was just being long the market?"

### Method: Single-Factor (MVP)

```python
# r_p = portfolio daily returns, r_b = benchmark (SPY) daily returns
beta = cov(r_p, r_b) / var(r_b)
alpha_annualized = mean(r_p - beta * r_b) * 252
r_benchmark_contribution = beta * mean(r_b) * 252
r_idiosyncratic = total_return - r_benchmark_contribution
```

### Output
```
Total Return:            +18.4%
  ├─ Market beta (0.94): +16.9%  (91.8% of return)
  └─ Active positioning:  +1.5%  (8.2% of return)

Your beta is 0.94. You are running near-market exposure.
You paid active-manager risk for mostly passive returns.
```

### Multi-Factor (Phase 4b)
Use Fama-French 5-factor model (available as free CSV from Ken French's data library). Adds: size tilt, value/growth tilt, profitability, investment. Shows *what kind* of beta you're running.

### Why This Creates Moat
Most investors have no idea how much of their "alpha" is just SPY beta. This one screen alone changes how people think about their portfolio. ChatGPT will tell you "tech stocks tend to be volatile" — this tool tells you 91.8% of your returns came from the market going up.

---

## Capital Efficiency Analysis

### The Insight
Each position has two numbers: **capital weight** (what you *intended* to own) and **risk weight** (what you *actually* own in terms of portfolio risk). When these diverge, you have inefficiency.

### Four Quadrants
```
              Risk Weight
              Low          High
Capital  High │ Redundant  │ Hidden Risk  │
Weight        │ (GOOG≈META)│ (NVDA+AMD)  │
         Low  │ Cheap Hedge│ Good Fit     │
              │ (TLT)      │ (position =  │
              │            │  risk)       │
```

### Implementation
Already have PRC per ticker. Display:

```
Ticker  Weight  Risk%   Efficiency    Flag
NVDA    15.0%   28.4%   1.89×        ⚠ Hidden concentration
MSFT     8.0%    4.1%   0.51×        ◻ Diluted — GOOG covers similar exposure  
TLT     10.0%    2.2%   0.22×        ✓ Cheap hedge — intentional
AAPL    12.0%   11.8%   0.98×        ✓ Proportional
```

**Efficiency ratio** = `pct_risk / weight`. >1.5 = hidden risk, <0.4 = possibly redundant.

---

## UI Restructuring

### Current
Single-page: form → results scrolled below

### Target: Tab Structure

```
[Analyze]  [Compare]  [Monitor]  [Reports]
```

**Analyze** (current page, same flow)
- Portfolio input form
- Full results panel below

**Compare** (Phase 4)
- Load Snapshot A (from localStorage) + Snapshot B (from localStorage or new run)
- Side-by-side metrics
- "What changed" diff card at top
- Useful for: "pre-rebalance vs post-rebalance" or "current vs 6 months ago"

**Monitor** (Phase 4)
- Timeline of all saved snapshots
- Sparklines for key metrics over time (Sharpe, ENP_risk, top-1 weight)
- Alert badges: "Risk rose since last check" / "Portfolio changed"

**Reports** (Phase 4)
- Generate PDF snapshot of current analysis
- Download as institutional-style report
- Future: Schedule recurring report (email delivery)

### Implementation Notes
- React Router or simple tab state (`useState("analyze")`) — no routing library needed for MVP
- Don't overengineer: tab state in App.jsx is sufficient until Compare/Monitor need their own URLs

---

## Build Priority Order

| Priority | Feature | Moat Level | Effort | Ships When |
|----------|---------|------------|--------|------------|
| 1 | Portfolio snapshot → localStorage | **Moat** | Low | Phase 4a |
| 2 | "What changed" diff engine | **Moat** | Medium | Phase 4a |
| 3 | Capital efficiency table | **Moat** | Low | Phase 4a |
| 4 | Benchmark attribution (single-factor) | **Moat** | Medium | Phase 4a |
| 5 | Monitor tab (snapshot timeline) | Nice | Medium | Phase 4b |
| 6 | Compare tab (side-by-side) | Nice | Medium | Phase 4b |
| 7 | PDF report redesign | Nice | High | Phase 4b |
| 8 | Regime detection | Nice | High | Phase 4b |
| 9 | Multi-factor attribution (FF5) | Premium | High | Phase 5 |
| 10 | Cloud persistence + auth | Infrastructure | Very High | Phase 5 |
| 11 | Scheduled email reports | Premium | High | Phase 5 |

---

## Brutal Honest Assessment vs. ChatGPT

### What ChatGPT Can't Do (Your Moat)
- Fetch live price data and compute exact numerical metrics
- Remember your portfolio from last month
- Show you what *changed* with specific numbers
- Decompose returns into beta vs. alpha with your actual return series
- Flag that NVDA is 28% of your risk even though you only allocated 15%

### What ChatGPT Does Just As Well
- Explain what HHI means
- Write a qualitative narrative about sector concentration
- List risks of "being heavy in tech"
- Tell you what happened in 2022

### The Test
Ask yourself: *If I copy my portfolio into ChatGPT right now, what do I lose?*

Phase 3 answer: Charts, computed VaR, and the expandable stress breakdown. That's real but thin.

Phase 4 answer: Three months of portfolio history, the "you've gotten 34% more concentrated since January" callout, the capital efficiency screen showing NVDA is eating twice its weight in risk, and the benchmark attribution showing 92% of your gains were just SPY going up.

**That's the product people pay for.** Temporal context + quantified efficiency + benchmark honesty.

---

## What to Build First (Monday Morning)

1. `POST /analyze` response already includes everything needed. Add `snapshot_id` (timestamp + hash) to response.
2. Frontend: after every successful analysis, write snapshot to localStorage.
3. Frontend: on page load, check for prior snapshot with overlapping tickers. If found, run diff engine client-side.
4. Display diff card above PortfolioDNA if a prior snapshot exists.
5. Ship capital efficiency table as a new card in ResultsPanel — uses existing PRC data, zero new backend work.
6. Add single-factor beta/alpha decomp to `run_analysis()` — 15 lines of numpy, massive communicative value.

Estimated effort to ship all of Phase 4a: **2-3 days of focused work**.

The regime detection, multi-factor model, and cloud persistence can wait. Ship the memory + diff engine first — that's the thing that makes users come back.
