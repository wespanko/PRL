# Full Product Masterplan — Personal Quant Assistant
## Panko Risk Lab → PQL (Personal Quant Layer)

---

## The Honest Strategic Frame

There are two failure modes for this product:

**Failure Mode 1 — Too narrow**: You ship a better PDF report generator. Users run it once, download the PDF, never come back. You built a one-shot tool, not a product.

**Failure Mode 2 — Too ambitious**: You try to build Bloomberg for retail in six months. You ship nothing, or you ship something half-finished that feels worse than a spreadsheet.

The winning path is narrow and specific: **become the product a serious retail investor opens every time they touch their portfolio.** Not every day. Every time they make a decision. That's the wedge.

What separates this from "paste into ChatGPT":
1. **Your portfolio lives here** — it knows your specific holdings, history, and drift
2. **It educates in context** — not generic finance content, but explanations tied to *your* actual numbers
3. **It remembers** — "NVDA's risk contribution grew from 18% in January to 31% today"
4. **It's honest** — "92% of your returns were just SPY going up" is a thing ChatGPT won't volunteer

What does NOT separate this from ChatGPT:
- Narrative prose summaries
- Generic risk explanations
- "Your portfolio is tech-heavy"

Keep that in mind for every feature decision.

---

## 1. Product Identity & Positioning

### Name Direction
"Panko Risk Lab" is a dev name. It sounds like a tool. The product you're building sounds like an assistant, an advisor, a layer.

Working positioning: **"The intelligent layer between how you invest and why it actually works."**

Not "risk tool." Not "analytics platform." A *layer* — something that sits on top of your portfolio and makes you smarter about it every time you interact with it.

### Who It's For (Be Specific)
**Primary user**: Serious retail investor, 25-45, manages $20K-$500K, uses Robinhood/Fidelity/Schwab, follows markets, has opinions about stocks, vaguely aware of diversification but doesn't have a framework for it. Has at least 4-15 positions. Not a passive index investor — they have *views*.

**Secondary user**: Small RIA / family office analyst who needs a quick second opinion on a client portfolio, not a Bloomberg terminal.

**Not the user**: Day traders, passive index investors, first-time investors with one ETF.

### Product Principles
1. **Honest over flattering** — if the portfolio is bad, say so clearly
2. **Specific over generic** — "NVDA is 31% of your risk" beats "you're concentrated in tech"
3. **Educational in context** — every metric explained the moment it matters
4. **Minimal by default** — show one number; let users drill in
5. **Persistent** — the product knows your history; you shouldn't have to re-explain yourself

---

## 2. Design Language

### The Aesthetic Problem
Current state: dense cards, lots of tables, feels like a financial report. That's appropriate for a report. It's wrong for a daily product.

### Target Aesthetic
**Base**: Apple — generous whitespace, large clean typography, one idea per screen section
**Interaction feel**: Robinhood — fluid, smooth, nothing jarring, never cluttered
**Intelligence layer**: Palantir / Bloomberg terminal *vibe* but not the *density*

### Specific Design Decisions

**Typography**
- Primary font: Inter (already system-available) — clean, geometric, modern
- Hero numbers: 2.5-3rem, weight 700, tracked tight (-0.02em)
- Labels: 10-11px, weight 600, ALL CAPS, letter-spacing 0.06em, muted gray (#9ca3af)
- Body/explanations: 14px, weight 400, color #374151, line-height 1.65

**Color Palette — Restrain It**
- Background: #f8fafc (not white, not gray — cool off-white)
- Card surface: #ffffff
- Primary accent: #2563eb (existing blue — keep it)
- Success/positive: #16a34a
- Warning/risk: #dc2626
- Amber/watch: #d97706
- Dark card (DNA, premium): #0f172a
- Borders: #e2e8f0 — slightly cooler than current

**Cards**
- Border radius: 12px (up from 8px — more Apple)
- Shadow: `0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)` — subtle depth
- Padding: 28px (up from 24px)

**No More Heavy Tables**
Tables should be rare — only for data where you genuinely need row/column scanning (correlation matrix, stress breakdown). Replace with:
- Stat cards for single numbers
- Bar visualizations for comparisons
- Progressive disclosure for detail

**Spacing System**
Use 8px grid. Key spacings: 8, 16, 24, 32, 48, 64, 96.

**Interaction**
- Hover states on all clickable items
- Smooth transitions (0.15s ease) for expand/collapse
- Loading skeletons instead of spinners where possible
- Never show a full-page spinner — skeleton the layout

---

## 3. Navigation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]   Dashboard   Portfolio   Monitor   Learn   Reports  │
│                                               [Assistant ▼] │
└─────────────────────────────────────────────────────────────┘
```

**Sidebar on desktop (≥1100px), bottom nav on mobile**

### Tab Purposes (Honest)
| Tab | Purpose | Habit Trigger |
|-----|---------|---------------|
| Dashboard | "What's my portfolio status right now?" | Daily check-in |
| Portfolio | "Run a full analysis, drill into holdings" | On change/rebalance |
| Monitor | "What drifted since last time?" | Weekly |
| Learn | "Explain this metric to me" | On confusion |
| Reports | "Generate a PDF or snapshot" | Monthly / sharing |
| Assistant | "Ask a question about my portfolio" | On decision |

**Compare is NOT a top-level tab.** It's a mode triggered from Portfolio or Monitor: "Compare to previous snapshot."

---

## 4. Dashboard — Homepage

### Purpose
Fast summary of portfolio state. Should answer in 5 seconds: "Is my portfolio okay right now?"

### Layout

```
Good morning, Wesley.
Your portfolio — Aggressive Growth · Last analyzed 3 days ago

[Re-analyze] 

────────────────────────────────────────────────────────────
HERO METRICS ROW
[Portfolio DNA]    [Risk Score]    [Diversification]    [Regime]
Aggressive Growth  7.4 / 10       ENP 2.1 positions   Risk-On Bull
────────────────────────────────────────────────────────────

MAIN CHART
Rolling portfolio drawdown — last 12 months
[clean line chart, 360px tall, no grid clutter]

────────────────────────────────────────────────────────────
KEY NUMBERS ROW
Sharpe 0.61   Volatility 22.4%   Max Drawdown -31.2%   Beta 1.34

────────────────────────────────────────────────────────────
ATTENTION ITEMS (1-3 callouts, not more)
⚠ NVDA now represents 31% of portfolio risk
⚠ Your downside capture is 1.8× — you fall harder than SPY
◻ Corr-adjusted positions dropped from 3.2 → 2.1 since last run

────────────────────────────────────────────────────────────
HOLDINGS SNAPSHOT (mini — ticker, weight, risk%)
No table. Pill/card strip:
[NVDA 28%] [MSFT 8%] [AAPL 12%] [TSM 7%] [AMD 6%] [+4 more]

Click any to open holding deep-dive.
────────────────────────────────────────────────────────────
```

### Key Design Decisions
- "Good morning, Wesley" is personalizable but simple — just the name from a first-run prompt
- Risk Score (1-10) is synthetic: derived from Sharpe, drawdown, ENP_risk, HHI combined
- Regime label is rule-based (see regime engine below)
- "Attention Items" — max 3, ranked by severity, never noisy

### What Dashboard Does NOT Show
- Full metrics grid
- Full correlation matrix
- Stress table
- Analyst paragraphs

Those live in Portfolio tab. Dashboard is the *pulse check*, not the full report.

---

## 5. Portfolio Tab

### Purpose
The current full analysis experience, redesigned.

### Flow
1. **Holdings Input** (top, collapsible after first run)
   - Same form, but cleaner — card with smooth reveal
   - Saved portfolios dropdown (from localStorage)
   
2. **Results** (scroll below)
   - Portfolio DNA bar (existing, keep)
   - Metrics — redesigned as stat cards, not grid
   - Risk contribution — existing chart
   - Capital efficiency table (new — Phase 4)
   - Concentration + ENP gap (existing)
   - Exposures (existing)
   - Benchmark attribution (new — Phase 4)
   - Drawdown chart (existing)
   - Historical periods (existing)
   - Correlation matrix (existing, conditional)
   - Stress scenarios (existing)
   - Holdings strip → links to deep-dive pages

### Holdings Strip
Below stress table:

```
YOUR HOLDINGS

[NVDA card]  [MSFT card]  [AAPL card]  [TSM card]
Theme: AI    Mega-Cap     Mega-Cap     AI Semis
28% risk     8% risk      12% risk     9% risk
→ Deep Dive  → Deep Dive  → Deep Dive  → Deep Dive
```

Click → Holding Deep-Dive page (see Section 6).

---

## 6. Holding Deep-Dive Pages

This is a major moat. Not because the data is hard to get — it isn't. But because **no one has assembled it in this format, tied to your actual portfolio context.**

### URL Pattern
`/holding/NVDA` — simple, shareable, bookmarkable

### Page Structure

```
◀ Back to Portfolio

NVIDIA Corporation · NVDA
AI Infrastructure · Semiconductors
─────────────────────────────────────────────────

YOUR EXPOSURE
Weight: 15.0%   Risk Contribution: 31.2%   Efficiency: 2.08×
↑ Hidden concentration — carries twice its weight in risk

─────────────────────────────────────────────────

BUSINESS OVERVIEW
2-3 sentences. Not a Wikipedia dump. Investor-relevant.
"NVIDIA designs GPUs used for AI training and inference.
Its H100/H200 data center segment now drives 78% of revenue.
Demand is tied directly to hyperscaler AI capex cycles."

─────────────────────────────────────────────────

MACRO SENSITIVITIES                [What is this? ▾]
Interest Rate Sensitivity    ████████░░  High
USD Strength Impact          ████░░░░░░  Moderate
AI Capex Cycle               ██████████  Very High
Semiconductor Cycle          ███████░░░  High

─────────────────────────────────────────────────

BULL / BEAR THESIS
BULL                              BEAR
AI data center spend              Valuation: 35× fwd earnings
Margin expansion                  Customer concentration risk
Sovereign AI (country-level)      AMD/Intel competitive pressure
CUDA ecosystem lock-in            Export restriction escalation

─────────────────────────────────────────────────

KEY VULNERABILITIES IN YOUR PORTFOLIO CONTEXT
"NVDA contributes 31% of your total portfolio risk. If NVDA
falls 30% (as it did in 2022), your portfolio loses ~4.7%
from this one position alone."

─────────────────────────────────────────────────

LEARN MORE
→ NVIDIA Q4 2025 Earnings Summary (Reuters)
→ What is semiconductor cyclicality? [internal Learn article]
→ How AI capex drives GPU demand [internal Learn article]
→ NVIDIA Investor Relations (ir.nvidia.com)
→ SEC 10-K Filing
→ "Why NVIDIA is rate-sensitive" [internal Learn article]
```

### Data Sources for Deep-Dive Pages
- **Business overview, sensitivities, bull/bear**: Pre-written for top 100 tickers (static JSON). Not live. Updated quarterly.
- **Article links**: Curated static links per ticker (Reuters, WSJ, IR pages, SEC EDGAR). Not scraped live — that's a v2 feature.
- **Educational links**: Internal Learn tab articles.
- **Portfolio context section**: Dynamic — pulled from current analysis results.

### Why Static (Not Live AI-Generated)?
Because live generation per holding is expensive and slow. Pre-written cards for the top 100 tickers cover 95%+ of user holdings. Flag unknown tickers: "Deep-dive not available for [TICKER] — add your own notes."

**This is 3-4 days of content work, not engineering work.** It's writing 100 short profiles, not coding a live data pipeline.

---

## 7. Personal Quant Assistant (Chat Panel)

### What It Is
Not a generic AI chatbot. A **context-aware portfolio assistant** that has access to your last analysis results.

### What "Context-Aware" Means
Every message is prefixed (invisibly to the user) with:
```
The user's current portfolio is:
- Holdings: NVDA 15%, MSFT 8%, AAPL 12%, TSM 7%, AMD 6%...
- Sharpe: 0.61, Volatility: 22.4%, Max Drawdown: -31.2%
- Portfolio DNA: Aggressive Growth
- ENP_risk: 2.1 (nominal: 4.0)
- Top risk contributor: NVDA at 31%
- Beta vs SPY: 1.34
- Benchmark alpha (annualized): -1.2%
[user's question follows]
```

This is Claude API call with portfolio context injected. Not complicated to build. Deeply useful.

### Example Interactions
```
User: "Why is my downside capture so high?"
Assistant: "Your downside capture of 1.8× means when SPY falls 1%, your
portfolio typically falls 1.8%. The main driver is your beta of 1.34 —
you're running significantly more market exposure than a vanilla index
fund. NVDA and AMD both have betas above 2.0, and together they're 21%
of your capital but 40% of your risk. When markets sell off, high-beta
tech leads the decline. To reduce downside capture, you'd either reduce
high-beta names or add low-correlation assets (bonds, gold, defensive
equities)."

User: "What happens if I cut NVDA by 50%?"
Assistant: "If you reduce NVDA from 15% to 7.5%, your estimated effects:
- ENP_risk improves from 2.1 to ~2.8 (less single-name dominance)
- Risk contribution from NVDA drops from 31% to ~17%
- Portfolio beta likely falls from 1.34 to ~1.18
- Downside capture improves — rough estimate from 1.8× to ~1.5×
You'd still be Aggressive Growth but with more breathing room.
Want me to model the full reallocation? Tell me where you'd put the 7.5%."

User: "Compare me to 60/40."
Assistant: "A classic 60/40 (SPY/AGG) over the same period had:
Sharpe ~0.74, volatility ~12%, max drawdown ~-16%.
Your portfolio: Sharpe 0.61, volatility 22.4%, max drawdown -31.2%.
You're running roughly 2× the volatility for 0.83× the risk-adjusted
return. That's not necessarily wrong — you're making an explicit bet
on high-growth tech outperforming over the long run. But on a
risk-adjusted basis, 60/40 outperformed your portfolio in this period."

User: "What's my weakest holding?"
Assistant: "Weakest on risk-adjusted terms: AMD.
AMD contributes 8.1% of your portfolio risk while representing only 6%
of capital — slightly inefficient. Its Sharpe over the period was the
lowest among your holdings at 0.29. It's highly correlated with NVDA
(r = 0.84), which means you're paying for two bets that behave like one.
If your thesis is AI semiconductors, NVDA expresses it more efficiently.
AMD could be the position to trim if you want to reduce complexity."
```

### Implementation
- **Backend**: `POST /chat` endpoint
  - Body: `{ messages: [{role, content}], portfolio_context: {...} }`
  - Injects portfolio context into system prompt
  - Streams Claude API response (SSE)
- **Frontend**: Chat panel (right sidebar on desktop, full-screen modal on mobile)
  - Message history in component state (not persisted — session only in v1)
  - Typing indicator while streaming
  - Suggested prompts on first open: "Why is my downside capture high?" / "What's my weakest holding?" / "Compare me to SPY"

### Honest Assessment of Chat
This is the highest-ceiling feature. It's also the most dependent on prompt engineering quality. Bad prompts → hallucinated portfolio numbers → user trust destroyed. **The system prompt is the product.** Spend time on it.

Key constraint: Claude needs to know when to say "I'd need to run a new analysis to answer that precisely" vs. when it can answer from existing context. Don't let it make up metrics.

---

## 8. Educational Layer ("Learn" Tab + Inline)

### Two Forms

**Form 1: Inline "What is this?" tooltips**
Every metric label gets an expand button. Click → card slides open:

```
Sharpe Ratio  0.61   [?]
                      ↓ (on click)
┌─────────────────────────────────────────────────────────┐
│ What is Sharpe Ratio?                                   │
│ Return per unit of risk. Computed as (portfolio return  │
│ − risk-free rate) / volatility. 0.61 is below average  │
│ — a well-diversified portfolio typically hits 0.8-1.2.  │
│                                                         │
│ Why it matters: Higher Sharpe means more return for     │
│ the same risk. Chasing return without watching Sharpe   │
│ is how portfolios blow up in drawdowns.                 │
│                                                         │
│ How to improve yours: Your Sharpe is dragged by high   │
│ volatility (22.4%). Reducing NVDA/AMD concentration    │
│ would lower vol without proportionally hurting return.  │
│                                                         │
│ → Learn more in the Learn tab                          │
└─────────────────────────────────────────────────────────┘
```

The "How to improve yours" section is **dynamic** — uses actual portfolio numbers. This is the moat version of education. Not generic. Specific.

**Form 2: Learn Tab — Article Library**

```
LEARN

Search: [___________________]

PORTFOLIO FUNDAMENTALS
→ What is Sharpe Ratio?
→ What is Beta?
→ What is Max Drawdown?
→ What is VaR?
→ What is HHI / Concentration?
→ What is Effective N?

MARKET CONCEPTS
→ What is semiconductor cyclicality?
→ How do interest rates affect growth stocks?
→ What is AI infrastructure capex?
→ What is the yield curve and why does it matter?
→ What is a market regime?
→ Understanding factor investing

PORTFOLIO STRATEGY
→ What is diversification, really?
→ Why correlation matters more than position count
→ How to think about position sizing
→ What does benchmark attribution actually tell you?
→ When to rebalance

SECTOR DEEP DIVES
→ AI Semiconductors: business model and risk drivers
→ Mega-Cap Tech: rate sensitivity explained
→ Energy: macro linkages
→ Financials: yield curve sensitivity
...
```

These are **static markdown articles**. No live AI generation. Well-written, 400-700 words each, with diagrams where helpful. This is editorial content, not engineering. Think Investopedia quality, but opinionated and honest.

**Moat**: The moat here is not the content itself — it's that clicking "Learn more about Sharpe" from your actual portfolio page opens an article that has your *specific Sharpe value and what's dragging it* in the intro. Generic articles don't do that.

---

## 9. "Improve My Portfolio" Engine

### Purpose
Show the user concrete paths from where they are to a better risk profile. Not prescriptive ("buy this"). Illustrative ("here's what the tradeoff looks like").

### Three Preset Improvement Scenarios

Given current portfolio, compute three variants:

**Conservative Shift**
- Cap any single position at 8%
- Reduce positions with efficiency ratio > 1.5 by 30%
- Add notional 15% allocation to AGG (bonds)
- Show resulting metrics vs. current

**Balanced**
- Cap single position at 12%
- Trim highest-corr duplicate pairs
- Add notional 10% international (EFA)
- Show resulting metrics

**Growth-Efficient**
- Keep growth orientation but reduce redundancy
- Replace lowest-Sharpe holding with a higher-quality analog (e.g., AMD → NVDA if both held)
- Show resulting metrics

### Display
```
                Current    Conservative    Balanced    Growth-Efficient
Sharpe           0.61         0.74           0.70           0.68
Volatility      22.4%        15.1%          17.3%          19.8%
ENP_risk          2.1          3.8            3.2            2.7
Max Drawdown    -31.2%       -19.4%         -22.1%         -27.3%
Beta vs SPY      1.34         0.88           1.02           1.22
```

**CRITICAL DISCLAIMER**: "These are illustrative projections based on historical data. This is not investment advice. Past performance does not predict future results."

### Implementation
- Backend: `POST /improve` endpoint
- Input: current payload (tickers, weights)
- Output: three variant portfolios with re-run metrics
- Frontend: tab/toggle within Portfolio section, below main results

---

## 10. Monitor Tab

### Purpose
"What changed since last time?" Made visual and automatic.

### Layout
```
PORTFOLIO MONITOR

Last 3 analyses:
  Mar 15, 2025  ─────  NVDA MSFT AAPL TSM AMD...
  Feb 02, 2025  ─────  NVDA MSFT AAPL TSM AMD...
  Jan 11, 2025  ─────  NVDA MSFT AAPL TSM...

WHAT CHANGED (Mar 15 → Today)
────────────────────────────────────────────────
↑ NVDA risk contribution: 18.4% → 31.2%   ⚠ Significant
↓ Sharpe: 0.82 → 0.61                     ⚠ Declining
↑ AI/Tech concentration: 48% → 67%        ⚠ Elevated
─ Max Drawdown: -29.1% → -31.2%           ◻ Stable
────────────────────────────────────────────────

METRIC SPARKLINES (12-week trend)
Sharpe:      ▇▇▇▆▆▅▅▅▄▄▃▃  0.82 → 0.61
ENP_risk:    ▇▇▆▆▆▅▄▄▃▃▃▂  3.2 → 2.1
NVDA risk%:  ▃▃▄▄▄▅▆▆▇▇▇█  18% → 31%

COMPOSITION CHANGES
NVDA: 15% → 28% (added)
META: new position (8%)
AAPL: 20% → 12% (trimmed)
────────────────────────────────────────────────
```

### Implementation
- Data source: localStorage snapshots
- Diff engine: client-side JavaScript — compare two result objects
- Severity classification: rule-based thresholds (see Phase 4 roadmap)
- Sparklines: simple SVG path renders — no chart library needed for 12-point lines

---

## 11. Reports Tab

### Purpose
Export. Snapshot. Share.

### Options
**PDF Report** (existing, needs redesign)
- Current: dense tables
- Target: clean 4-5 page institutional summary, Apple Report aesthetic
- Cover page: portfolio name, date, DNA type
- Page 2: executive metrics dashboard
- Page 3: risk analysis (chart + key callouts)
- Page 4: holdings breakdown + capital efficiency
- Page 5: stress scenarios + disclaimer

**Snapshot Share**
- Generate a static URL: `app.com/share/[hash]`
- Read-only view of analysis results (no live data)
- Useful for: sharing with advisor, accountant, spouse

**Raw Data Export**
- JSON or CSV download of all metrics
- For users who want to build their own analysis on top

---

## 12. News & Research Integration

### Honest Assessment
Pulling live news is an engineering rabbit hole (API costs, stale data, noise). Don't build a news feed in Phase 4.

**What to do instead:**

**Phase 4: Curated Static Links Per Ticker**
- For each of the 200 tickers in classifier, pre-populate:
  - Investor relations URL
  - SEC EDGAR filing URL
  - 1-2 recommended "deep background" articles (timeless, not news)
- Display in holding deep-dive page
- Zero maintenance required — IR pages are stable

**Phase 5: Live Headlines via RSS/API**
- Use free tier of Polygon.io or Alpha Vantage for news headlines
- Pull last 5 headlines per ticker, display in deep-dive
- Scrub for relevance (earnings, macro, analyst upgrades)

**Phase 6: Research synthesis**
- Use AI to summarize recent news in context of portfolio risk
- "NVDA is down 4% today after export restriction news — this directly affects your largest risk position"
- This is genuinely powerful but requires reliable live data pipeline first

---

## 13. Backend Architecture Changes

### New Endpoints Needed

```
POST /analyze          (existing — keep)
POST /chat             (new — context-aware assistant)
POST /improve          (new — portfolio improvement variants)
POST /compare          (new — diff two snapshots)
GET  /holding/{ticker} (new — static holding profile)
GET  /learn/{slug}     (new — static educational article)
POST /report/pdf       (existing — redesign output)
```

### New Data Files Needed (Static, Not Live)
```
backend/data/
  classifier.py        (existing — expand to 300+ tickers)
  holding_profiles.json   (new — business overview, sensitivities, bull/bear per ticker)
  article_links.json      (new — IR, SEC, educational links per ticker)
  learn_articles/         (new — markdown files for Learn tab content)
    sharpe-ratio.md
    beta.md
    max-drawdown.md
    semiconductor-cyclicality.md
    ...
```

### Regime Detection Engine (Simple Rules-Based)
```python
# backend/risk/regime.py
def detect_regime(spy_returns, vix_level=None) -> str:
    rolling_6m = spy_returns.tail(126).mean() * 252
    rolling_vol = spy_returns.tail(63).std() * (252 ** 0.5)
    
    if rolling_6m > 0.10 and rolling_vol < 0.18:
        return "Risk-On Bull"
    elif rolling_6m > 0.05 and rolling_vol < 0.22:
        return "Moderate Growth"
    elif rolling_vol > 0.28:
        return "High Volatility / Risk-Off"
    elif rolling_6m < -0.10:
        return "Bear Market"
    else:
        return "Transition / Mixed"
```

Simple. Not proprietary. But contextually useful — "you're analyzing in a Risk-On Bull regime, which makes these stress scenarios more relevant as tail risks."

### Risk Score (Synthetic 1-10)
```python
def compute_risk_score(sharpe, max_drawdown, enp_risk, beta) -> float:
    # Higher score = more risk
    sharpe_component = max(0, 1 - sharpe) * 2          # 0-2
    drawdown_component = min(abs(max_drawdown) / 0.5, 1) * 3  # 0-3
    conc_component = max(0, 1 - enp_risk / 5) * 2.5   # 0-2.5
    beta_component = min(beta / 2, 1) * 2.5            # 0-2.5
    return round(min(sharpe_component + drawdown_component + conc_component + beta_component, 10), 1)
```

### Chat System Prompt Architecture
```python
SYSTEM_PROMPT = """
You are a personal portfolio analyst assistant. You have access to the user's
current portfolio analysis. Be specific, honest, and direct. Use exact numbers
from the portfolio context. Do not make up numbers you don't have. If something
requires a new analysis run to answer precisely, say so.

Never give specific buy/sell advice. Frame everything as analysis and
illustration. Always include: "This is not investment advice."

Portfolio context:
{portfolio_context}
"""
```

The portfolio context is a structured summary of the last `AnalyzeResponse` object, serialized to a readable format. Keep it under 2000 tokens.

---

## 14. Frontend Restructuring Plan

### Current State
- Single-page app
- App.jsx → PortfolioForm + ResultsPanel
- All components flat in `src/components/`

### Target State
```
src/
  App.jsx                    (tab router, global state)
  components/
    nav/
      NavBar.jsx
      TabBar.jsx
    dashboard/
      DashboardPage.jsx
      HeroMetrics.jsx
      AttentionItems.jsx
      HoldingsStrip.jsx
    portfolio/
      PortfolioPage.jsx
      PortfolioForm.jsx
      ResultsPanel.jsx
      (existing result components...)
      CapitalEfficiencyCard.jsx   (new)
      BenchmarkAttribution.jsx    (new)
    holding/
      HoldingPage.jsx             (new)
      MacroSensitivities.jsx      (new)
      BullBearThesis.jsx          (new)
    monitor/
      MonitorPage.jsx             (new)
      SnapshotTimeline.jsx        (new)
      DriftCard.jsx               (new)
    learn/
      LearnPage.jsx               (new)
      ArticleView.jsx             (new)
    reports/
      ReportsPage.jsx             (new)
    assistant/
      AssistantPanel.jsx          (new — right sidebar)
      MessageBubble.jsx           (new)
  utils/
    formatters.js                 (existing)
    snapshots.js                  (new — localStorage CRUD)
    diff.js                       (new — snapshot diff engine)
```

### State Management
Don't reach for Redux. Use React Context:
```jsx
// GlobalContext: { lastResults, snapshots, currentPortfolio, activeTab }
// AssistantContext: { messages, isOpen, sendMessage }
```

localStorage is the persistence layer. No backend state in Phase 4.

---

## 15. Feature Tiering — Free vs. Premium

### Free Tier
- Portfolio analysis (full current feature set)
- Dashboard view
- Holding deep-dive pages (top 50 tickers)
- Learn tab (all articles)
- 3 saved snapshots in localStorage
- 5 assistant messages per session

### Premium ($15-$20/month)
- Unlimited snapshots + monitor tab
- Full holding deep-dive library (300 tickers)
- Unlimited assistant messages
- "Improve my portfolio" engine
- PDF report generation
- Benchmark attribution
- Capital efficiency analysis
- Compare mode

### Why This Tiering
Free tier is generous enough that users *experience the product*, understand the value, and encounter the paywall at the exact moment they want to go deeper. The monitor tab (which requires history) and the assistant (which requires unlimited messages) are the natural upgrade triggers.

**Do not paywall the analysis itself.** That kills word of mouth. Let people share reports freely.

---

## 16. Build Priority Order

### Phase 4a — Foundation (2-3 weeks)
1. **Portfolio snapshot engine** — localStorage CRUD, auto-save on analysis
2. **"What changed" diff card** — client-side, no backend
3. **Capital efficiency table** — uses existing PRC data, new frontend component only
4. **Benchmark attribution** — single-factor beta/alpha, 15 lines Python, high value
5. **Risk Score computation** — synthetic 1-10, backend + dashboard display

### Phase 4b — Navigation & Dashboard (2-3 weeks)
6. **Navigation restructure** — NavBar, tab routing, App.jsx refactor
7. **Dashboard page** — hero metrics, attention items, holdings strip
8. **Monitor tab** — snapshot timeline, drift sparklines
9. **Inline "What is this?" tooltips** — high moat, low effort

### Phase 4c — Assistant & Depth (3-4 weeks)
10. **Personal Quant Assistant chat** — Claude API, portfolio context injection, streaming
11. **Holding deep-dive pages** — static profiles for top 50 tickers
12. **Learn tab** — markdown articles, 20-30 to start
13. **"Improve my portfolio" engine** — three variant computations

### Phase 5 — Premium & Polish (4-6 weeks)
14. **PDF redesign** — Apple-style report layout
15. **Holding profiles expand to 200 tickers** — content work
16. **Live news integration** — Polygon.io API
17. **Cloud persistence + auth** — only when 10+ active users
18. **Multi-factor attribution** (FF5 model)
19. **Mobile polish** — bottom nav, full-screen assistant

---

## The Brutal Final Assessment

### What Will Make People Love This
1. It knows their specific portfolio and history — ChatGPT doesn't
2. The "what changed" card will make users come back — it creates a reason to check in
3. The holding deep-dive pages with portfolio context are genuinely useful for decision-making
4. The assistant answering "what's my weakest holding?" with their *actual numbers* feels like magic

### What Will Kill It
1. Slow load times — if analysis takes >5 seconds, mobile users leave
2. Hallucinated numbers in the assistant — kills trust permanently
3. Design that feels like a spreadsheet — loses to "just using ChatGPT"
4. Feature bloat before core loops are tight

### What Separates This From ChatGPT (The Real Answer)
You're not competing with ChatGPT. You're building on top of it. ChatGPT is a blank page. This is a purpose-built tool with your portfolio already loaded, your history already tracked, and your specific numbers already computed and visualized. The competition is not AI — it's inertia. Most investors don't deeply analyze their portfolio because there's no frictionless way to do it. This removes the friction.

**The product wins if users say: "I always open this before I make a trade."**

That's the north star.
