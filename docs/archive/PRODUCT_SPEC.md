# Personal Quant — Product Specification

**Version:** 2.0  
**Date:** 2026-04-28  
**Status:** Pre-implementation — do not build without reading this first

---

## Honest starting point

The current app proves the pipes work. It is not a product. A calculator that returns Beta: 1.71 does not solve a problem anyone will pay to solve. This document defines what would.

---

## 1. Product Positioning

**What exists today:**

| Tool | What it gives you | Why it fails the target user |
|------|-------------------|------------------------------|
| Brokerage dashboard | Balance, P&L, sector pie chart | Shows what you own, not what it means |
| Bloomberg Terminal | Everything | $24k/year, requires training, built for professionals |
| ChatGPT | General answers | No structured analysis, no actual calculations |
| Morningstar | Fund ratings | Fund-focused, not portfolio-level, not personalised |
| Robinhood / Schwab | Holdings list | No risk interpretation at all |

**The gap:** No tool takes an individual investor's actual holdings and returns institutional-quality risk interpretation in plain English at a price they would pay.

**Where Personal Quant sits:**

```
Brokerage dashboard ←————————————→ Bloomberg Terminal
(too shallow)                        (too complex, too expensive)

                    Personal Quant
                  (institutional depth,
                   consumer simplicity)
```

---

## 2. Target User

**Primary:** The affluent self-directed investor.

- Portfolio size: $50k–$2M
- Owns 5–20 positions, usually individual stocks and ETFs
- Smart enough to know their brokerage dashboard is not telling them the full story
- Not a finance professional — doesn't know what "marginal contribution to risk" means, but would understand it if explained plainly
- Has probably had a bad year (2022, 2020) and wants to understand what went wrong

**Secondary:** Small RIAs and family-office staff who want a fast, clean report to send to clients. Not the primary market to build for yet, but the product naturally fits this use case.

**Not the target:**
- Day traders (they need real-time data and order flow, not monthly risk reports)
- Passive index fund investors (nothing interesting to analyze)
- Institutions (already have Bloomberg, FactSet, Aladdin)

---

## 3. Main User Problem

The user looks at their brokerage account and sees:

```
NVDA    500 shares   $82,450   +142%
AAPL    200 shares   $36,800   +18%
AMZN    150 shares   $28,500   +9%
BND     400 shares   $30,800   -6%
```

What they cannot see:
- NVDA is 44% of their total portfolio risk even though it is 42% of their capital
- Their "4-stock portfolio" has the effective diversification of 1.8 independent positions
- Three of their four positions are highly correlated through the same underlying driver: AI infrastructure momentum
- In a 2022-style rate shock, their estimated drawdown would be 38–50%, not the 18% a naive sector allocation would suggest
- Their bond holding (BND) provides almost no diversification when rates are rising, which is the scenario they are most exposed to

**The user does not know what their portfolio is actually betting on.**

That is the problem.

---

## 4. Core Promise

```
Know what your portfolio is really betting on.
```

Not "get metrics." Not "download a PDF." The product promise is interpretation — turning a list of tickers into a clear statement of what the portfolio is exposed to, what could hurt it, and why.

---

## 5. Homepage Copy

**Headline:**
```
Your Personal Quant for Portfolio Risk
```

**Subheadline:**
```
Turn your holdings into an institutional-style risk report.
See what's really driving your risk, stress-test your portfolio,
and get a plain-English analyst summary — in under 60 seconds.
```

**CTA:**
```
Analyze My Portfolio  →
```

**Feature cards:**

```
Risk Decomposition
Which holding is actually driving your portfolio risk?
A 20% position can contribute 50% of total risk.
We show you which one.

Concentration Analysis
How diversified are you, really?
Your effective number of independent positions
may be lower than you think.

Macro Stress Tests
Rate shocks. Recessions. Tech selloffs.
See how your portfolio has behaved — and may behave —
in the scenarios that matter.

AI Analyst Summary
Not just numbers.
A plain-English explanation of your portfolio's
strengths, hidden bets, and main vulnerabilities.

Institutional PDF Reports
A clean, downloadable report you can save,
review monthly, or share with an advisor.
```

**Social proof section (future):**
```
"This told me more about my portfolio in 2 minutes
than my brokerage did in 3 years."
```

---

## 6. MVP Feature List

Separated honestly into three tiers.

### Tier 1 — Table stakes (must have, not the value)

These features are required for the product to function. They are not why someone pays.

- [ ] Ticker input
- [ ] Dollar value or weight input (whichever the user prefers)
- [ ] Date range selection
- [ ] Benchmark selection
- [ ] Annualised return, volatility, Sharpe, beta, max drawdown
- [ ] Correlation matrix
- [ ] Drawdown chart over time
- [ ] Basic stress scenarios
- [ ] PDF export

### Tier 2 — Useful features (increase confidence, reduce churn)

These make the product noticeably better. Users who see these are more likely to return.

- [ ] **Risk contribution by holding** — the single most important missing feature
- [ ] **Concentration score** (HHI, effective N, top-3 weight)
- [ ] Historical worst periods (best/worst 30-day windows)
- [ ] Upside and downside capture vs benchmark
- [ ] VaR and CVaR (95th percentile)
- [ ] Rolling 90-day volatility chart

### Tier 3 — Paid-product-worthy features (why someone subscribes)

These are the actual product. Without at least one from this tier, there is no reason to pay.

- [ ] **AI analyst summary** — plain-English narrative that names the portfolio's actual bets, not just its numbers
- [ ] **Factor/theme exposure** — classifies holdings into meaningful exposure buckets (semiconductors, mega-cap tech, China, rates-sensitive, defensive, etc.)
- [ ] **"What to monitor" section** — forward-looking flags based on the portfolio's exposures
- [ ] **Month-over-month change tracking** (requires database — post-MVP)
- [ ] **Personalised scenario builder** — user defines a macro view and sees the impact

---

## 7. Metrics for a Serious Risk Report

### Already implemented
- Annualised return: `(1 + mean(r))^252 - 1`
- Annualised volatility: `std(r) × √252`
- Sharpe ratio: `(R - Rf) / σ`
- Beta: `Cov(portfolio, benchmark) / Var(benchmark)`
- Max drawdown: peak-to-trough from start
- Correlation matrix
- Basic stress scenarios

### Must add next

**Risk contribution (marginal contribution to risk)**

This is the most important missing metric. It answers: which position is actually driving the portfolio's volatility?

```
Covariance vector for asset i:  cov_i = Σ_j (w_j × σ_ij)
Marginal contribution to risk:  MCR_i = cov_i / σ_portfolio
Component risk:                 CR_i  = w_i × MCR_i
% risk contribution:            PRC_i = CR_i / σ_portfolio
```

In matrix form: `MCR = (Σ × w) / σ_p` where Σ is the covariance matrix.

PRC sums to 100% across all positions. This is the number to show users.

**Concentration metrics**

```
Herfindahl-Hirschman Index:  HHI = Σ(w_i²)
Effective N (positions):     ENP = 1 / HHI

HHI = 1.0   → all in one stock
HHI = 0.1   → equivalent to 10 equal positions
HHI = 0.025 → equivalent to 40 equal positions
```

**Variance at Risk / Conditional VaR**

```
Historical VaR (95%):  5th percentile of daily return distribution × √22 (monthly)
CVaR (Expected Shortfall): mean of all returns below the VaR threshold
```

Use historical simulation (no distribution assumptions).

**Upside / Downside Capture vs Benchmark**

```
Upside capture:   mean(r_p when r_b > 0) / mean(r_b when r_b > 0)
Downside capture: mean(r_p when r_b < 0) / mean(r_b when r_b < 0)
```

A good portfolio has upside capture > 1.0 and downside capture < 1.0.

**Historical worst/best periods**

Scan all rolling 21-day windows. Return the 3 worst and 3 best.
Include the date and what was happening in markets at the time (hardcoded lookup by date range).

### Add later (post-initial-launch)

- Rolling 90-day beta and correlation charts
- Factor regression (Fama-French 3-factor or manual factor proxies)
- Tail risk measures (skewness, kurtosis)
- Tracking error vs benchmark

---

## 8. Report Sections

The PDF report should feel like something from a real investment office.

**Page 1 — Cover**
- Report title, portfolio name, date
- One-sentence portfolio characterisation (generated by AI)
- Key metrics snapshot (5 numbers)

**Page 2 — Executive Summary (AI-written)**
- 3–4 paragraphs
- What the portfolio is betting on
- Top 2–3 risks
- Top 1–2 strengths
- One thing to watch

**Page 3 — Portfolio Snapshot**
- Holdings table: ticker, value/weight, risk contribution, asset class/theme
- Concentration metrics (HHI, effective N)
- Pie chart: weight vs risk contribution side-by-side

**Page 4 — Risk Metrics**
- Full metrics table with plain-English interpretation column
- Upside/downside capture vs benchmark
- VaR and CVaR

**Page 5 — Drawdown Analysis**
- Drawdown chart over time
- Table: 3 worst historical 30-day periods with context

**Page 6 — Correlation and Diversification**
- Correlation heatmap
- Diversification commentary (is the correlation meaningful or spurious?)

**Page 7 — Stress Scenarios**
- Expanded scenario table (12+ scenarios, not 5)
- Commentary: which scenario is the portfolio most vulnerable to, and why

**Page 8 — Exposures**
- Theme/sector breakdown
- Top 3 macro drivers the portfolio is sensitive to

**Page 9 — Methodology and Disclaimer**
- Formula definitions
- Data source
- Standard disclaimer

---

## 9. UI Page Structure

### Single page (MVP — keep this)

The single-page layout is correct for MVP. Do not add routing yet.

**Current:** Form → Results  
**New:** Form → Results (with richer sections)

### Form changes

Replace weight-only input with a choice:

```
Input mode:  ○ Dollar amounts  ● Weights (%)
```

Dollar amount mode:
```
AAPL    $25,000
NVDA    $80,000
GLD     $40,000
Cash    $20,000
```
The app auto-normalises to weights before sending to the backend.

### Results panel changes

**New section order:**

```
1. AI Executive Summary          ← move to top, most valuable
2. Key Metrics                   ← already exists
3. Risk Contribution Chart       ← new, high priority
4. Concentration Summary         ← new
5. Drawdown Chart                ← already exists
6. Historical Worst Periods      ← new
7. Correlation Matrix            ← already exists
8. Stress Scenarios              ← already exists, expand
9. Theme / Exposure Summary      ← new
```

### Visual upgrade

The current card-based layout is functional but looks like a developer built it for a hackathon. To justify payment, the visual design needs to look like a tool someone built for professionals. This does not require a redesign — it requires better typography, a tighter colour palette, and charts that look intentional.

---

## 10. Backend Architecture Changes

### New modules

```
backend/
├── risk/
│   ├── calculator.py        — existing (add VaR, capture ratios)
│   ├── contributions.py     — new: risk contribution, HHI, ENP
│   ├── scenarios.py         — existing (expand to 12+ scenarios)
│   └── periods.py           — new: historical worst/best periods
│
├── data/
│   ├── fetcher.py           — existing
│   └── classifier.py        — new: ticker → theme/sector lookup
│
└── ai/
    └── analyst.py           — new: generate narrative summary
```

### Updated API response schema

`/api/analyze` should return all new fields:

```json
{
  "risk_contributions": [
    {"ticker": "NVDA", "weight": 0.42, "pct_risk": 0.61}
  ],
  "concentration": {
    "hhi": 0.31,
    "effective_n": 3.2,
    "top1_weight": 0.42,
    "top3_weight": 0.78
  },
  "var_95": -0.021,
  "cvar_95": -0.031,
  "upside_capture": 1.18,
  "downside_capture": 0.94,
  "worst_periods": [...],
  "exposures": {"mega_cap_tech": 0.62, "china": 0.18, "gold": 0.12},
  "analyst_summary": {
    "headline": "...",
    "paragraphs": ["...", "..."],
    "top_risks": ["...", "..."],
    "watch_list": ["..."]
  }
}
```

### `/api/analyze` stays stateless

Do not add database or caching yet. Every call re-fetches and re-computes. Add persistence only when there is a reason to (user accounts, saved portfolios, change tracking).

---

## 11. New Formulas to Add

### Risk contribution (priority 1)

```python
# returns is shape (T, N), weights is shape (N,)
cov_matrix = returns.cov() * 252          # annualised covariance
port_variance = weights @ cov_matrix @ weights
port_vol = np.sqrt(port_variance)

# marginal contribution to risk
mcr = cov_matrix @ weights / port_vol     # shape (N,)

# component risk (contribution to total volatility)
component_risk = weights * mcr            # shape (N,)

# percentage risk contribution (sums to 1.0)
pct_risk = component_risk / port_vol      # shape (N,)
```

### Concentration (priority 1)

```python
hhi = np.sum(weights ** 2)     # 0 = perfectly spread, 1 = all in one
effective_n = 1 / hhi          # "how many equal positions is this equivalent to?"
```

### VaR and CVaR (priority 2)

```python
# Historical simulation, no distribution assumptions
daily_returns = portfolio_returns.sort_values()
var_95 = daily_returns.quantile(0.05)                           # 5th percentile
cvar_95 = daily_returns[daily_returns <= var_95].mean()         # mean of worst 5%

# annualise to monthly (22 trading days)
var_95_monthly = var_95 * np.sqrt(22)
cvar_95_monthly = cvar_95 * np.sqrt(22)
```

### Upside / Downside capture (priority 2)

```python
up_mask = benchmark_returns > 0
down_mask = benchmark_returns < 0

upside_capture = (
    portfolio_returns[up_mask].mean() / benchmark_returns[up_mask].mean()
)
downside_capture = (
    portfolio_returns[down_mask].mean() / benchmark_returns[down_mask].mean()
)
```

### Historical worst periods (priority 2)

```python
rolling_21 = portfolio_returns.rolling(21).sum()
worst_3 = rolling_21.nsmallest(3)
best_3 = rolling_21.nlargest(3)
```

---

## 12. Build Order — Priority Sequence

Do these in order. Do not skip ahead.

### Round 1 — Make the numbers real (1–2 days)

These are pure backend changes. No UI work yet.

```
1. Risk contribution (PRC) per holding
2. Concentration: HHI, effective N, top-1/3/5 weights
3. VaR and CVaR (95th percentile, monthly)
4. Upside/downside capture vs benchmark
5. Historical worst 3 periods
6. Tests for all of the above
```

**Why first:** These are the metrics that separate the product from a calculator. They must be correct before anything is shown to users.

### Round 2 — AI analyst summary (1–2 days)

```
7. Template-based narrative engine (no LLM yet)
   — deterministic rules: "if PRC_top1 > 0.4: flag concentration risk"
   — generates structured text from conditions
   — no API calls, no latency, no cost, fully testable
8. Claude API integration for narrative polish (optional upgrade)
   — send the computed metrics dict to Claude
   — ask for plain-English interpretation
   — structured output: headline, risks, strengths, watch list
```

**Why templates first:** Templates produce predictable, testable output. The LLM layer is an upgrade, not a dependency.

### Round 3 — Dollar input and theme classification (1 day)

```
9. Dollar/share input mode in the frontend
   — convert to weights before sending to backend
   — backend does not need to change
10. Ticker classifier: ticker → theme/sector
    — start with a hardcoded dict of ~100 common tickers
    — fallback: "unknown"
    — expand over time
```

### Round 4 — UI and PDF redesign (1–2 days)

```
11. Risk contribution bar chart (frontend)
    — shows each holding's % of total risk
    — most important new visualisation
12. Concentration summary card
13. AI summary card at top of results
14. Historical worst periods table
15. Expanded stress scenarios (12+)
16. PDF updated to match new report section structure
```

### Round 5 — Visual polish (0.5 days)

```
17. Typography and spacing cleanup
18. Consistent colour use (risk = red spectrum, strength = green)
19. PDF looks like a real report, not a developer output
```

### Round 6 — Homepage (0.5 days)

```
20. Replace the current blank page with the homepage copy from Section 5
21. "Analyze My Portfolio" CTA scrolls to or opens the form
22. Feature cards below the fold
```

---

## What not to build

These are distractions at this stage. Do not add them until the core product is working and people are paying for it.

```
✗  User login / accounts
✗  Saved portfolios
✗  Payments
✗  Database
✗  Real-time price updates
✗  Mobile app
✗  Brokerage API connections
✗  Options analytics
✗  Tax optimisation
✗  Social features
✗  Trading recommendations
```

---

## The honest truth about the AI summary

The AI analyst summary is the feature that justifies calling this "Personal Quant" rather than "Risk Calculator."

**Template-based (build first):**
Deterministic rules that generate readable text from metric conditions.

Example rule:
```
if pct_risk[top_holding] > 0.40:
    summary += f"{top_ticker} contributes {prc:.0%} of total portfolio risk 
                despite being only {weight:.0%} of capital. This concentration 
                means the portfolio's behaviour is largely driven by a single name."
```

This produces consistent, testable, honest output. It is not magic but it is useful.

**LLM-enhanced (add later):**
Send the full metrics dict to Claude with a prompt like:
```
You are a portfolio risk analyst. Here are the quantitative metrics for a 
client's portfolio: [metrics dict]. Write a 3-paragraph plain-English 
executive summary for an investor who is not a financial professional.
Include: (1) what the portfolio is betting on, (2) the main risk, 
(3) one thing to monitor. Do not give buy/sell advice.
```

This produces richer, more natural language. The cost is $0.01–0.05 per report at current API pricing.

**Important:** Never present AI-generated text as if it is a professional financial opinion. The disclaimer must be clear. The product provides analysis tools and interpretation frameworks, not advice.

---

## Success metric for the new MVP

After Round 4 is complete, show the product to 5 people with real portfolios.

Ask them one question: **"Would you pay $15/month to get this report on your portfolio?"**

If fewer than 2 say yes, something in the interpretation layer is not landing. Go back to the AI summary and the risk contribution framing before adding any more features.

If 3 or more say yes, move to authentication and payments.

---

*This spec replaces the previous ARCHITECTURE.md scope. The technical architecture in ARCHITECTURE.md remains valid — this document adds product direction and prioritises what to build next.*
