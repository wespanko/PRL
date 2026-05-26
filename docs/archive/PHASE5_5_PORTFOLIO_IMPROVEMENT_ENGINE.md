# Phase 5.5 — Portfolio Improvement Engine
## From Diagnosis to Coaching

---

## The Strategic Shift

Every other feature answers a past-tense question: "What is my portfolio?" or "What happened?"

The improvement engine answers a present-tense question: "What should I consider changing?"

That is the difference between a diagnostic tool and a coaching tool. Diagnosis shows you the problem. Coaching shows you paths forward. This is the single biggest jump in perceived product value because it makes the user feel like they have a strategist, not just a report.

**Critical framing requirement**: This engine never says "buy X" or "sell Y." It says "here is what your portfolio would look like if it had this structural property instead." The user decides whether to act. The product provides the map, not the directions.

---

## 1. Structural Weakness Detection

The engine first identifies which weaknesses are present, ranked by severity. This is already partially computed — it's a matter of applying thresholds and surfacing the right language.

### Weakness Taxonomy

**Concentration Risk**
- Trigger: ENP_risk < 3.0 OR top-1 risk contribution > 35%
- Severity: critical if ENP_risk < 2.0, warning if < 3.0
- Language: "One position dominates your risk. A bad quarter for [TICKER] moves the whole portfolio."

**Downside Capture Problem**
- Trigger: downside_capture > 1.15
- Severity: critical if > 1.4, warning if > 1.15
- Language: "You lose [X]× more than SPY in down months. This asymmetry compounds against you."

**Beta Overexposure**
- Trigger: beta > 1.3 AND pct_from_beta > 0.75
- Language: "[X]% of your return came from market beta, not stock selection. You're running an active portfolio that behaves like a leveraged index."

**Thematic Overlap / Hidden Concentration**
- Trigger: top theme > 60% of exposure AND ENP_risk < enp_capital × 0.6
- Language: "Your holdings look diversified by count but share the same underlying driver. In a [THEME] selloff, they would likely fall together."

**Rate Sensitivity**
- Trigger: top theme in (AI Semis, Mega-Cap Tech, Growth Tech, Cloud/SaaS) AND theme_pct > 50%
- Language: "Long-duration growth assets dominate your portfolio. Rising rates or multiple compression would reprice these holdings disproportionately."

**Crypto Overexposure**
- Trigger: asset_class crypto > 15%
- Language: "Crypto assets exhibit extreme drawdowns in risk-off environments. Your allocation implies an aggressive risk appetite in this asset class."

**Missing Hedges**
- Trigger: bonds + gold + cash < 5% AND max_drawdown < -0.25
- Language: "Your portfolio has no meaningful safe-haven exposure. During equity selloffs, there is no uncorrelated position to cushion the drawdown."

**VaR Warning**
- Trigger: var_95 < -0.12 (monthly)
- Language: "A 1-in-20 month loss exceeds [X]%. At this risk level, a single bad month can undo months of gains."

### Weakness Priority Output

```python
def detect_weaknesses(results) -> list[dict]:
    # Returns list of: { id, severity, title, description, metric, metric_value }
    # Sorted by severity (critical → warning), then by metric impact
    ...
```

Output example:
```json
[
  {
    "id": "concentration",
    "severity": "critical",
    "title": "Single-name concentration",
    "description": "NVDA drives 58% of total portfolio risk despite 40% capital weight.",
    "metric": "enp_risk",
    "metric_value": 1.8
  },
  {
    "id": "downside_capture",
    "severity": "warning",
    "title": "Unfavourable capture ratio",
    "description": "Portfolio loses 1.6× more than SPY in down months.",
    "metric": "downside_capture",
    "metric_value": 1.6
  }
]
```

---

## 2. Structural Improvement Paths

Given the detected weaknesses, generate 2-4 alternative portfolio structures that address them. These are not recommendations — they are illustrative alternatives that show the structural tradeoff.

### Four Path Templates

**Path A — Lower Risk**
Goal: reduce volatility and max drawdown while keeping the same core holdings.
Method:
- Cap largest position at max(current_weight - 15%, 10%)
- Reduce all positions proportionally to allocate 15-20% to AGG (broad bonds) or GLD
- If single-holding portfolio: add SPY as ballast
Target improvement: vol ↓ >3pp, max drawdown ↓ >5pp

**Path B — Better Diversified**
Goal: increase ENP_risk and reduce thematic overlap.
Method:
- If top theme > 60%: trim top-theme positions by 20%, reallocate to a non-correlated theme
- Suggest themes with low historical correlation to current top theme
- Don't change more than 2-3 positions
Target improvement: ENP_risk ↑ >0.8, top-1 risk% ↓ >10pp

**Path C — Lower Drawdown**
Goal: reduce the worst-case drawdown while accepting lower upside.
Method:
- Add 10-15% GLD (low correlation, drawdown buffer)
- Add 10% AGG or TLT
- Reduce highest-beta name(s) by 10-15%
Target improvement: max_drawdown ↓ >8pp, downside_capture ↓ >0.15×

**Path D — Benchmark Balanced**
Goal: bring the portfolio closer to a 60/40-equivalent risk profile.
Method:
- Reduce equity to 60% of current, add 40% split of (SPY 20%, AGG 20%)
- This is the "what would a traditional advisor suggest" path
- Shown as a baseline, not an endorsement
Target improvement: beta → ~0.7-0.9, Sharpe ↑, downside_capture ↓

### Path Generation Rules

1. **Never recommend individual stocks** — only reduce existing positions or add index-level instruments (SPY, AGG, GLD, QQQ, TLT, EFA, VNQ)
2. **Keep the user's core thesis** — if they hold NVDA, don't remove it, just suggest sizing
3. **Show the tradeoff** — every path shows what you gain AND what you give up
4. **Round to clean numbers** — weights should be in 5% increments
5. **Always sum to 100%** — validate before displaying

### Path Computation

```python
def generate_improvement_paths(results, payload) -> list[dict]:
    weaknesses = detect_weaknesses(results)
    paths = []
    
    if any(w["id"] == "concentration" for w in weaknesses):
        paths.append(build_lower_risk_path(payload, results))
        paths.append(build_diversified_path(payload, results))
    
    if any(w["id"] == "downside_capture" for w in weaknesses):
        paths.append(build_lower_drawdown_path(payload, results))
    
    paths.append(build_benchmark_balanced_path(payload))  # always show this
    
    # De-duplicate paths that produce very similar portfolios
    return deduplicate_paths(paths)
```

Each path returns:
```python
{
  "name": "Lower Risk",
  "description": "Trims NVDA and adds bond ballast to reduce tail risk.",
  "holdings": [{"ticker": "NVDA", "weight": 0.25}, ...],  # new weights
  "tradeoff": {
    "gain": "Lower drawdown, lower vol, more stable returns",
    "give_up": "Some upside in continued AI bull run"
  }
}
```

The path holdings are then run through the **same `/api/analyze` endpoint** to get real computed metrics — not estimates. The before/after comparison is exact.

---

## 3. Before/After Comparison UI

### The Display

```
IMPROVE MY PORTFOLIO

Detected weaknesses:
  ⚠ Critical: Single-name concentration (NVDA at 58% of risk)
  ↑ Warning: Downside capture 1.6× (loses more than SPY in selloffs)

─────────────────────────────────────────────────────────────────

STRUCTURAL ALTERNATIVES  (not financial advice — illustrative only)

[Lower Risk]  [Better Diversified]  [Lower Drawdown]  [Benchmark Balanced]

Currently showing: Lower Risk

WHAT CHANGES:
  NVDA   40% → 22%
  MSFT   30% → 28%
  AAPL   30% → 25%
  AGG     —  → 25%   (new)

BEFORE vs AFTER:
               Current    Lower Risk    Change
Sharpe          0.61        0.74        +0.13  ↑
Volatility     22.4%       15.8%        -6.6pp ↑
Max Drawdown  -31.2%      -19.4%       +11.8pp ↑
ENP_risk         1.8         2.9         +1.1  ↑
Beta             1.34        0.89        -0.45  ↑
Downside Cap.   1.60×       1.21×       -0.39× ↑
Upside Cap.     1.82×       1.31×       -0.51× ↓

TRADEOFF:
✓ You gain: meaningfully lower drawdown, real diversification, more stable returns
✗ You give up: some upside in a continued AI bull run

[Use this portfolio in Simulate →]

─────────────────────────────────────────────────────────────────
⚠ These are structural examples, not investment advice. 
  Past performance does not predict future results.
```

The `[Use this portfolio in Simulate →]` button pre-loads the proposed weights into the Simulate tab — letting the user modify further before committing to any decision.

---

## 4. Implementation Architecture

### Backend

**New endpoint:**
```
POST /api/improve
Body: { holdings, start_date, end_date, benchmark, risk_free_rate }
Returns: {
  weaknesses: [list of weakness dicts],
  paths: [
    {
      name, description, tradeoff,
      holdings: [new weights],
      results: { ...full AnalyzeResponse ... }
    }
  ]
}
```

**New files:**
```
backend/risk/weaknesses.py    — detect_weaknesses(results) -> list[dict]
backend/risk/improvement.py   — generate_paths(results, payload) -> list[dict]
```

**The path analysis loop:**
```python
for path in raw_paths:
    sim_payload = PortfolioRequest(
        holdings=[Holding(ticker=h["ticker"], weight=h["weight"]) for h in path["holdings"]],
        start_date=payload.start_date,
        end_date=payload.end_date,
        benchmark=payload.benchmark,
        risk_free_rate=payload.risk_free_rate,
    )
    path["results"] = run_analysis(sim_payload)  # price cache makes this fast
```

Because the price cache is already warm from the original analysis, running 2-4 additional simulations on the same date range costs almost nothing in network time.

### Frontend

**New tab in NavBar:** `Improve` (disabled until first analysis)

**New component:** `ImprovePage.jsx`
- Shows weakness callouts at top
- Tab switcher for the 4 paths
- Before/after metrics table
- "Use in Simulate" button that pre-populates SimulatePage

**No new CSS framework needed** — uses existing card, data-table, insight-callout patterns.

---

## 5. The "Personal Quant Coach" Feeling

The product feels like a coach — not a dashboard — when it does three things:

**1. Tells you what's wrong before you ask.** The weakness detection runs automatically and surfaces the most important issue first. The user doesn't have to scroll through 12 cards to find the problem — it's at the top.

**2. Shows a path, not just a diagnosis.** "Your ENP_risk is 1.8" is a diagnosis. "Here's what your portfolio looks like with ENP_risk of 2.9 — and here's what you give up to get there" is coaching. The improvement paths are the difference.

**3. Respects the user's intelligence.** The engine never says "do this." It says "if you wanted this structural property, it would look like this." That framing treats the user as someone who makes their own decisions, supported by evidence. This is the only ethical framing for a non-licensed product.

---

## 6. Honest Product Assessment

### What this makes possible

The improvement engine closes the loop that makes the product genuinely valuable: a user runs an analysis, sees a weakness, sees a structural alternative, tests it in Simulate, saves both as snapshots, and tracks the difference in Monitor. That is a complete investment workflow — start to finish — without leaving the product.

No other retail tool offers this loop. Robinhood shows you your portfolio. Morningstar explains funds. Neither one shows you the structural gap between your current portfolio and a risk-appropriate alternative, with real computed numbers, in 30 seconds.

### What makes this hard

**Path generation quality** is the hard part. Generating paths that are:
- Structurally meaningful (not just random rebalancing)
- True to the user's thesis (don't destroy their investment view)
- Honest about tradeoffs (not just showing the "good" scenario)
- Clean and explainable (5% weight increments, recognizable instruments only)

…requires careful rules-based logic, not AI generation. The temptation will be to let an LLM generate the paths. Resist it. LLMs will generate plausible-sounding allocations that are structurally incoherent or use obscure tickers. Rules-based paths with a curated instrument list are more trustworthy and more consistent.

**The curated instrument list for paths**: SPY, QQQ, AGG, BND, GLD, TLT, EFA, VNQ, BNDX, VT. These 10 instruments cover the full risk-reduction toolkit. Any path the engine generates should only add from this list, never add individual stocks the user didn't already hold.

### Build order

1. `weaknesses.py` — detect and rank structural issues (1 day)
2. `improvement.py` — generate 4 path templates (2 days)
3. `/api/improve` endpoint (half day)
4. `ImprovePage.jsx` — weakness callouts + path tabs + before/after table (2 days)
5. "Use in Simulate" handoff (half day)

Total: ~6 focused days for a complete, shippable improvement engine.

---

## 7. Framing and Disclaimers

Every surface of the improvement engine must carry this framing:

> "These are structural examples to explore, not investment advice. The purpose is to illustrate how different portfolio structures affect risk and return metrics — not to recommend any specific action. You should consult a financial advisor before making changes to your investments."

This is non-negotiable. The line between "structural illustration" and "investment advice" is legally important and practically important for user trust. The framing above is honest, accurate, and legally safe. Keep it on every path card.

---

## The North Star for Phase 5.5

A user opens the product, runs an analysis of their NVDA/MSFT/AAPL portfolio, sees "Single-name concentration — critical," clicks "Improve," sees four structural alternatives with real numbers, clicks "Lower Drawdown," clicks "Use in Simulate," tweaks the weights slightly, and saves both snapshots to Monitor.

That is 5 minutes from open to informed decision. No other product offers this for retail investors at zero cost. That's the gap you're filling.
