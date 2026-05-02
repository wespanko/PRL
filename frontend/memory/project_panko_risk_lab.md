---
name: Panko Risk Lab — project overview
description: Personal Quant Assistant product — stack, vision, current state, and build priorities
type: project
---

MVP portfolio risk report generator now pivoting to full Personal Quant Assistant product.

**Vision**: "The intelligent layer between retail investing and institutional portfolio management." Daily portfolio operating system, not a one-shot report generator.

**Stack**:
- Backend: FastAPI + Python, `yfinance` for price data, numpy/pandas for analytics
- Frontend: React (Vite), Recharts for charts, plain CSS (index.css)
- AI: Claude API (Anthropic) for analyst summaries and chat assistant
- No database yet — localStorage for portfolio snapshots

**Backend structure** (`backend/`):
- `main.py` — FastAPI app, endpoints
- `risk/calculator.py` — main `run_analysis()` orchestrator
- `risk/contributions.py` — PRC, ENP, ENP_risk
- `risk/scenarios.py` — 9 theme-aware stress scenarios
- `risk/periods.py` — worst/best historical periods
- `data/classifier.py` — 200+ ticker sector/theme/asset_class lookup
- `ai/analyst.py` — `generate_summary()` and `generate_dna()`
- `models/schemas.py` — Pydantic AnalyzeResponse

**Frontend structure** (`frontend/src/`):
- `App.jsx` — main form state and analysis trigger
- `components/ResultsPanel.jsx` — orchestrates all result cards
- All result components flat in `components/`

**Current state (Phase 3 complete)**:
- Full risk analytics: Sharpe, VaR/CVaR, upside/downside capture, beta, HHI, ENP, ENP_risk, PRC
- Portfolio DNA archetype classifier (15 types)
- Theme-aware stress scenarios with per-ticker breakdown
- Analyst summary with paragraphs, risks, strengths, watch list
- Exposures card (theme + sector bars)
- Expandable stress scenario rows
- 85/85 tests passing

**Planned Phase 4a (next)**:
1. Portfolio snapshot → localStorage (auto-save on every analysis)
2. "What changed" diff card (client-side, no backend)
3. Capital efficiency table (uses existing PRC data)
4. Benchmark attribution — single-factor beta/alpha (15 lines numpy)
5. Risk Score (synthetic 1-10 dashboard metric)

**Planned Phase 4b**:
6. Navigation restructure (Dashboard / Portfolio / Monitor / Learn / Reports / Assistant tabs)
7. Dashboard homepage (hero metrics, attention items, holdings strip)
8. Monitor tab (snapshot timeline, drift sparklines)
9. Inline "What is this?" metric tooltips

**Planned Phase 4c**:
10. Personal Quant Assistant chat (Claude API + portfolio context injection, streaming)
11. Holding deep-dive pages (static profiles for top 50 tickers)
12. Learn tab (markdown articles)
13. "Improve my portfolio" engine (3 variant portfolios)

**Key documents**:
- `PHASE4_PRODUCT_ROADMAP.md` — moat analysis, snapshot architecture, diff engine, attribution
- `FULL_PRODUCT_MASTERPLAN.md` — complete product vision, UX, all tabs, feature tiering, build order

**Why**: Portfolio snapshot + diff engine + benchmark attribution + chat assistant = things ChatGPT cannot replicate (no persistent state, no live data, no specific portfolio context). That's the moat.

**North star**: "I always open this before I make a trade."
