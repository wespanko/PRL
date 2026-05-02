# Panko Risk Report Generator — MVP Architecture

**Version:** 1.0  
**Date:** 2026-04-28  
**Scope:** Single-developer MVP, no auth, no database, no payments

---

## Overview

The app accepts a list of ticker symbols and portfolio weights from the user, fetches historical price data from a public API, computes a standard set of risk metrics, and returns both a live results preview and a downloadable PDF report.

The system is split into two processes that talk over HTTP:

- A **React frontend** (runs in the browser, port 3000 in dev)
- A **Python/FastAPI backend** (runs on the server, port 8000 in dev)

There is no persistent database in the MVP. Every request fetches fresh data and computes results on the fly. This makes the system stateless and trivially deployable.

---

## 1. Frontend Structure

### Design rationale
React is chosen because it handles form state, async data fetching, and conditional rendering cleanly. The UI is intentionally minimal — one input form, one results panel, one download button. No routing library is needed for a single-page flow.

### Pages / Components

```
App
├── PortfolioForm          — ticker/weight input, validation, submit
├── ResultsPanel           — shown after successful API response
│   ├── MetricsSummary     — key numbers (volatility, Sharpe, beta, etc.)
│   ├── CorrelationMatrix  — color-coded table
│   ├── DrawdownChart      — line chart of drawdown over time
│   └── StressTable        — scenario returns table
└── DownloadButton         — triggers PDF download from backend
```

### Portfolio Input Form

The form collects rows of `(ticker, weight)` pairs. Key UX decisions:

- Users can add/remove rows dynamically (start with 5 blank rows)
- Weights are entered as decimals (0.25) or percentages (25%) — the frontend normalizes to decimals before sending
- A live weight sum indicator shows whether weights add to 100% and turns red if they don't
- Validation runs client-side before submit: all tickers non-empty, all weights > 0, sum within 0.1% of 1.0
- A date-range picker sets the lookback window (default: 3 years, max: 10 years)
- A benchmark selector defaults to SPY (used for beta and Sharpe)

### Results Preview

Rendered from the JSON response, no separate fetch needed. The frontend stores the full API response in React state and passes slices to each child component. Charts use **Recharts** (lightweight, no D3 dependency, works out of the box with React).

### PDF Download Button

Clicking "Download PDF" sends a second POST to `/api/report/pdf` with the same payload. The backend returns a binary PDF. The frontend receives it as a Blob and triggers a browser download using `URL.createObjectURL`. The report is generated server-side — the frontend never constructs the PDF itself.

---

## 2. Backend Structure

### Design rationale
FastAPI is chosen over Flask because it provides automatic request/response validation via Pydantic models, async support for concurrent data fetches, and auto-generated OpenAPI docs at `/docs` — useful for a solo developer debugging the API without a frontend.

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze` | Accept portfolio, return all risk metrics as JSON |
| POST | `/api/report/pdf` | Accept same portfolio payload, return PDF binary |
| GET | `/api/health` | Liveness check |

The two POST endpoints share identical input validation and data-fetching logic — only the output format differs. This is implemented by extracting a shared `run_analysis(payload)` function that both endpoints call.

**Request body (shared):**
```json
{
  "holdings": [
    {"ticker": "AAPL", "weight": 0.4},
    {"ticker": "MSFT", "weight": 0.6}
  ],
  "start_date": "2022-01-01",
  "end_date": "2025-01-01",
  "benchmark": "SPY",
  "risk_free_rate": 0.045
}
```

**Response body from `/api/analyze`:**
```json
{
  "tickers": [...],
  "weights": [...],
  "annualized_return": 0.112,
  "annualized_volatility": 0.183,
  "sharpe_ratio": 0.37,
  "beta": 1.12,
  "max_drawdown": -0.32,
  "correlation_matrix": {...},
  "drawdown_series": [...],
  "stress_scenarios": {...},
  "period": {"start": "...", "end": "..."}
}
```

### Data Fetching Layer (`data/fetcher.py`)

Uses **yfinance** to pull adjusted closing prices. This is the simplest publicly available source for daily OHLCV data with dividend adjustments and no API key required.

- Fetches all tickers and the benchmark in a single batch call
- Returns a `pandas.DataFrame` of adjusted close prices indexed by date
- Drops rows where any ticker has a NaN (handles missing data from short-listed tickers)
- Raises a clean HTTP 422 error if any ticker is not found

**Why yfinance:** No API key, no rate limit concerns at MVP scale, returns data as a pandas DataFrame which integrates directly with the calculation layer.

### Risk Calculation Layer (`risk/calculator.py`)

Pure functions — input is a DataFrame of prices plus a weights vector, output is a dict of results. No side effects. This makes testing trivial.

All formulas are documented in Section 4.

### PDF Generation Layer (`pdf/generator.py`)

Takes the same results dict that `/api/analyze` returns and renders it into a PDF. The report is assembled in memory and returned as bytes — never written to disk.

Uses **ReportLab** (see Section 7 for full reasoning).

---

## 3. Data Flow

```
User fills form
    │
    ▼
Frontend validates weights sum to 1.0
    │
    ▼
POST /api/analyze  { holdings, start_date, end_date, benchmark }
    │
    ▼
Backend: Pydantic validates request shape
    │
    ▼
data/fetcher.py: yfinance.download(tickers + benchmark, start, end)
    │  returns DataFrame of adjusted close prices
    ▼
risk/calculator.py: compute all metrics
    │  returns results dict
    ▼
/api/analyze returns JSON  ──────────────────────────────────────────►  Frontend renders MetricsSummary,
                                                                          CorrelationMatrix, DrawdownChart,
                                                                          StressTable

User clicks "Download PDF"
    │
    ▼
POST /api/report/pdf  { same payload }
    │
    ▼
Same fetch + calculate pipeline
    │
    ▼
pdf/generator.py: ReportLab assembles PDF in memory
    │
    ▼
Response: Content-Type: application/pdf, binary body
    │
    ▼
Frontend: Blob → URL.createObjectURL → browser download dialog
```

**Why re-fetch on PDF request instead of caching:**  
Caching requires state (in-memory store or Redis). For an MVP with one developer and no SLA, re-fetching is simpler and guarantees the PDF always reflects the latest data. If latency becomes a problem, add a short-lived cache later.

---

## 4. Core Formulas

All formulas operate on daily adjusted closing prices.

### Daily Returns

```
r_t = (P_t / P_{t-1}) - 1
```

Use simple returns (not log returns) for portfolio aggregation. Log returns are additive across time; simple returns are additive across assets. Since we're combining assets, simple returns are correct.

### Portfolio Daily Return

```
r_p,t = Σ (w_i × r_i,t)     for each asset i with weight w_i
```

This is the dot product of the weight vector and the asset return vector on each day.

### Portfolio Volatility (daily)

```
σ_daily = std(r_p,t)     sample standard deviation over the full period
```

Python: `portfolio_returns.std(ddof=1)`

### Annualized Volatility

```
σ_annual = σ_daily × √252
```

252 is the standard number of US trading days per year. Volatility scales with the square root of time under the assumption of independent daily returns.

### Annualized Return

```
R_annual = (1 + mean(r_p,t))^252 - 1
```

Compound the mean daily return over 252 days.

### Sharpe Ratio

```
Sharpe = (R_annual - R_f) / σ_annual
```

Where `R_f` is the annualized risk-free rate (user-input, default 4.5%). The Sharpe ratio measures return per unit of total risk. A ratio above 1.0 is generally considered good; above 2.0 is excellent.

### Beta vs. Benchmark

```
β = Cov(r_p, r_benchmark) / Var(r_benchmark)
```

Computed over the full period using daily returns. Beta measures sensitivity to market moves. β = 1.2 means the portfolio moves ~1.2% for every 1% the benchmark moves.

Python:
```python
cov_matrix = np.cov(portfolio_returns, benchmark_returns)
beta = cov_matrix[0, 1] / cov_matrix[1, 1]
```

### Max Drawdown

```
Drawdown_t = (P_t - max(P_0..P_t)) / max(P_0..P_t)
MaxDrawdown = min(Drawdown_t)   over all t
```

Where `P_t` is the cumulative portfolio value index (starting at 1.0). Max drawdown measures the largest peak-to-trough decline — the worst loss a patient buy-and-hold investor would have experienced.

Python:
```python
cum_returns = (1 + portfolio_returns).cumprod()
rolling_max = cum_returns.cummax()
drawdown = (cum_returns - rolling_max) / rolling_max
max_drawdown = drawdown.min()
```

### Correlation Matrix

```
ρ_{i,j} = Cov(r_i, r_j) / (σ_i × σ_j)
```

Computed across all asset pairs using daily returns. Values range from -1 to +1. The matrix is symmetric with 1s on the diagonal.

Python: `returns_df.corr()`

### Stress Scenario Returns

Apply a fixed shock to each asset's return and compute the resulting portfolio return:

```
r_p_stressed = Σ (w_i × r_i_stressed)
```

Pre-defined scenarios (approximate historical drawdowns):

| Scenario | Equity Shock | Bond Shock | Rationale |
|----------|-------------|------------|-----------|
| 2008 GFC | -38% | +5% | Subprime crisis |
| 2020 COVID Crash | -34% | +8% | Pandemic selloff |
| 2022 Rate Shock | -19% | -15% | Fed hiking cycle |
| Tech Crash (-30%) | -30% | 0% | Sector-specific |
| Mild Recession | -15% | +3% | Soft landing scenario |

Tickers are classified as equity or bond-like based on a simple hardcoded lookup (extend this list as needed). Any unclassified ticker receives the equity shock as the conservative assumption.

---

## 5. Main File Tree

```
panko-risk-lab/
├── ARCHITECTURE.md
│
├── backend/
│   ├── main.py                  — FastAPI app, route definitions
│   ├── requirements.txt
│   ├── .env.example             — risk_free_rate default, etc.
│   │
│   ├── models/
│   │   └── schemas.py           — Pydantic request/response models
│   │
│   ├── data/
│   │   └── fetcher.py           — yfinance wrapper, returns price DataFrame
│   │
│   ├── risk/
│   │   ├── calculator.py        — all risk metric functions
│   │   └── scenarios.py         — stress scenario definitions
│   │
│   ├── pdf/
│   │   ├── generator.py         — orchestrates ReportLab assembly
│   │   ├── styles.py            — fonts, colors, table styles
│   │   └── charts.py            — matplotlib figures → image bytes for PDF
│   │
│   └── tests/
│       ├── test_calculator.py
│       ├── test_fetcher.py
│       ├── test_api.py
│       └── test_pdf.py
│
└── frontend/
    ├── package.json
    ├── vite.config.js           — proxy /api → localhost:8000
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        │
        ├── components/
        │   ├── PortfolioForm.jsx
        │   ├── ResultsPanel.jsx
        │   ├── MetricsSummary.jsx
        │   ├── CorrelationMatrix.jsx
        │   ├── DrawdownChart.jsx
        │   ├── StressTable.jsx
        │   └── DownloadButton.jsx
        │
        ├── api/
        │   └── client.js        — fetch wrappers for /api/analyze and /api/report/pdf
        │
        └── utils/
            └── formatters.js    — percent/decimal display helpers
```

**Why Vite instead of Create React App:** Vite's dev server is dramatically faster to start and has native ESM support. The proxy config (forwarding `/api` to the backend) means you never deal with CORS during development.

---

## 6. Testing Plan

### Philosophy
Test the math layer heavily with known inputs and expected outputs. Test the API layer with integration tests. Keep PDF tests minimal — just confirm a valid PDF is returned.

### Portfolio Weights Validation

**File:** `tests/test_calculator.py`

- Weights that sum to 1.0 → passes
- Weights that sum to 0.99 → should raise or warn (within tolerance)
- Weights with a negative value → should raise
- Single-ticker portfolio (weight = 1.0) → portfolio return equals asset return exactly
- Verify: `np.dot(weights, returns_matrix.T)` equals hand-computed single-ticker series for the 1-asset case

### Return Calculations

- Use a hand-crafted 5-row price DataFrame with known values
- Example: prices [100, 105, 102, 108, 104] → returns [0.05, -0.0286, 0.0588, -0.037]
- Compute portfolio return with equal weights across two assets whose returns you've pre-calculated manually
- Assert the function output matches your expected value within floating point tolerance (`pytest.approx`)

### Volatility Calculations

- A constant-return series (all returns = 0.01) must produce σ = 0
- A two-value alternating series [+0.1, -0.1, +0.1, -0.1, ...] has a known analytic std
- Verify annualized volatility = daily_vol × √252 to 6 decimal places

### Max Drawdown

- A monotonically increasing price series → drawdown = 0
- A series that drops 50% then recovers to all-time high → max drawdown = -0.50
- A series with two drawdowns (-20%, then -30%) → max drawdown = -0.30 (not -0.20)
- A series that never recovers after a drop → drawdown is measured from the all-time high before the drop

### API Endpoints

**File:** `tests/test_api.py`  
Use FastAPI's `TestClient` (wraps httpx, no real network needed).

- POST `/api/analyze` with a valid 2-ticker payload → 200, response contains all expected keys
- POST `/api/analyze` with weights summing to 1.5 → 422 validation error
- POST `/api/analyze` with an invalid ticker (e.g. "ZZZNOTREAL") → graceful 422 with message
- POST `/api/analyze` with `start_date` after `end_date` → 422
- GET `/api/health` → 200

For the ticker-not-found case: mock `yfinance.download` in tests so you don't hit the network. Use `pytest-mock` or `unittest.mock.patch`.

### PDF Generation

- POST `/api/report/pdf` with valid payload → 200, `Content-Type: application/pdf`
- Response body starts with `%PDF` magic bytes
- Response body length > 1000 bytes (confirms non-empty)
- Do not test the visual layout in automated tests — that's a manual check

---

## 7. PDF Generation Plan

### Library Choice: ReportLab

**ReportLab** is the standard Python PDF library. It gives you precise control over layout, fonts, tables, and image placement. The alternative is **WeasyPrint** (HTML/CSS → PDF), which is simpler to style but harder to embed matplotlib charts into.

For a data-heavy report with charts and tables, ReportLab's `Platypus` layout engine is the right choice: it handles page breaks, table styles, and image insertion robustly.

The dependency is `reportlab` — install with pip, no system dependencies required on Linux/Mac/Windows.

### Report Sections

The PDF report contains the following sections in order:

1. **Cover Page**
   - Report title ("Portfolio Risk Report")
   - Portfolio name (user-defined or auto-generated from tickers)
   - Analysis period (start date – end date)
   - Generation timestamp

2. **Portfolio Summary**
   - Holdings table: Ticker | Weight | Asset class
   - Benchmark used, risk-free rate assumption

3. **Key Risk Metrics**
   - Table: Annualized Return, Annualized Volatility, Sharpe Ratio, Beta, Max Drawdown
   - One row per metric, with a brief plain-English interpretation next to each value

4. **Drawdown Chart**
   - Line chart of portfolio drawdown over time
   - X-axis: date, Y-axis: drawdown (%)
   - Shaded area below zero in red

5. **Correlation Matrix**
   - Color-coded heatmap table
   - Green for low correlation, red for high correlation

6. **Stress Test Results**
   - Table: Scenario | Portfolio Return | Description
   - Values color-coded (red for large losses)

7. **Methodology Note**
   - Brief plain-English explanation of each metric
   - Data source statement (Yahoo Finance via yfinance)
   - Disclaimer (not financial advice)

### How Charts Are Embedded

Charts are generated with **matplotlib** in the backend, saved to a `BytesIO` buffer (never written to disk), and inserted into the PDF as images using ReportLab's `Image` flowable.

```
matplotlib figure → BytesIO buffer (PNG) → ReportLab Image object → embedded in PDF
```

This keeps everything in memory and avoids temp file management.

### How the PDF Is Generated and Returned

```python
# In pdf/generator.py
buffer = BytesIO()
doc = SimpleDocTemplate(buffer, pagesize=letter)
story = []  # list of ReportLab flowables (paragraphs, tables, images)

# ... build story from results dict ...

doc.build(story)
pdf_bytes = buffer.getvalue()
return pdf_bytes
```

In the FastAPI endpoint:
```python
return Response(
    content=pdf_bytes,
    media_type="application/pdf",
    headers={"Content-Disposition": "attachment; filename=panko_risk_report.pdf"}
)
```

---

## 8. Build Order

Build in this sequence. Each step is independently testable before moving to the next.

### Step 1 — Backend skeleton (Day 1)
- Create `backend/` directory, `requirements.txt`, `main.py`
- Install: `fastapi uvicorn yfinance pandas numpy scipy reportlab matplotlib pytest httpx pytest-mock`
- Define Pydantic schemas in `models/schemas.py`
- Stub out all three endpoints — return hardcoded dummy data
- Confirm `/api/health` returns 200 and `/docs` renders

**Why first:** Everything else depends on the API contract being defined. Stubbing with dummy data lets you build the frontend in parallel without a working backend.

### Step 2 — Risk calculator (Days 1–2)
- Implement all functions in `risk/calculator.py` with hardcoded test data
- Write `tests/test_calculator.py` with the cases from Section 6
- Run `pytest` — all tests must pass before moving on

**Why second:** The math is the core value of the app. Get it right and tested before connecting data sources or the UI.

### Step 3 — Data fetcher (Day 2)
- Implement `data/fetcher.py` using yfinance
- Manually test with 2-3 real tickers in a Python shell
- Write `tests/test_fetcher.py` with mocked yfinance calls
- Wire fetcher output into the calculator

**Why third:** Data fetching can be mocked in tests and replaced later if you switch data sources.

### Step 4 — `/api/analyze` endpoint (Day 2–3)
- Replace the dummy response in `/api/analyze` with the real fetch + calculate pipeline
- Write `tests/test_api.py` with mocked yfinance
- Test manually with Postman or the `/docs` UI

### Step 5 — React frontend (Days 3–4)
- Scaffold with `npm create vite@latest frontend -- --template react`
- Build `PortfolioForm` — form state, validation, submit handler
- Build `MetricsSummary` — render hardcoded JSON first, then wire to real API
- Build `CorrelationMatrix`, `DrawdownChart`, `StressTable`
- Add `DownloadButton` (just logs to console for now)

**Why fifth:** The frontend is a consumer of the API. Having a working `/api/analyze` makes frontend development much smoother.

### Step 6 — PDF generation (Days 4–5)
- Implement `pdf/generator.py` section by section (start with text-only, add charts last)
- Implement `/api/report/pdf` endpoint
- Wire `DownloadButton` to the real endpoint
- Manually review the generated PDF for layout

**Why sixth:** PDF is the output artifact, not the core logic. It's easier to build last when you know exactly what data you have.

### Step 7 — Polish and edge cases (Day 5–6)
- Handle loading states in the frontend (spinner while waiting for API)
- Handle API errors in the frontend (show error message, don't crash)
- Add input validation feedback (red border on bad weights, etc.)
- Test with real portfolios: SPY+BND, AAPL+MSFT+GOOGL, edge cases like a single-ticker portfolio
- Manual PDF review on multiple portfolios

### Step 8 — Deployment (optional, post-MVP)
- Backend: deploy to Railway or Render as a Python service
- Frontend: deploy to Vercel or Netlify (set `VITE_API_URL` env var)
- No database, no auth — deployment is just "run the two servers"

---

## Design Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Backend framework | FastAPI | Auto-validation, async, auto-docs |
| Market data | yfinance | Free, no key, pandas-native |
| PDF library | ReportLab | Best for chart+table PDFs in Python |
| Chart library (frontend) | Recharts | Zero-config, React-native |
| Chart library (PDF) | matplotlib | Best for embedding static chart images |
| Frontend bundler | Vite | Fast, modern, proxy config is simple |
| State management | React useState | No Redux needed at this scale |
| Testing framework | pytest + TestClient | Standard, works with FastAPI seamlessly |
| No database | Stateless | Eliminates an entire layer of complexity for MVP |
| Re-fetch on PDF | Yes | Simpler than caching; add cache later if needed |

---

*This document reflects the MVP scope only. Future versions may add authentication, a database for saving reports, real-time price updates, and multi-currency support.*
