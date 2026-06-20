# Panko Quant Lab

A quant terminal for retail traders. Backtest preset strategies, stress-test them with Monte Carlo and walk-forward analysis, and learn the concepts behind the metrics — all in the browser, no backend, no login.

**Educational analytics. No trading signals. No investment advice.**

## What it does

- **Strategy** — pick from 5 preset strategies (SMA crossover, RSI mean reversion, Donchian breakout, 12-month momentum, buy & hold benchmark), tune parameters with sliders, configure execution costs.
- **Backtest** — runs the strategy over historical bars with a no-lookahead engine (signal at today's close, fill at tomorrow's open). Shows equity vs benchmark, drawdown, key metrics (CAGR, Sharpe, Sortino, max DD, win rate, profit factor, expectancy, exposure, alpha) with hover-tooltip definitions.
- **Robustness** — Monte Carlo bootstrap of trade returns + walk-forward fold-by-fold stability. Catches strategies that look great in-sample but fall apart out-of-sample.
- **Data** — synthetic sample universe built into the app, plus CSV bar upload (date + OHLC + volume, any column names).
- **Learn** — five short opinionated explainers: Sharpe ratio, walk-forward bias, Monte Carlo caveats, overfitting, sample size.

## Stack

- Vite + React 18 + Tailwind
- Recharts for charts
- PapaParse for CSV parsing
- No backend, no database, no auth. Everything runs in the browser.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

Production build:
```bash
npm run build
npm run preview
```

Outputs a fully static site in `frontend/dist/` — host on Vercel, Netlify, Cloudflare Pages, or any static host.

## Architecture

```
frontend/src/
  lib/
    strategies.js       Preset strategies + signal functions
    backtest.js         No-lookahead backtest engine + metrics
    monteCarlo.js       Bootstrap of trade returns + daily returns
    walkForward.js      N-fold stability analysis
    sampleData.js       Synthetic OHLC universe (3 symbols)
    parseBars.js        Forgiving CSV bar parser
    glossary.js         Metric one-liners for tooltips
    format.js           Number formatting

  components/
    layout/             Sidebar, TopBar, Panel
    strategy/           StrategyView (picker + params + market + execution)
    backtest/           BacktestView, EquityVsBenchmark, DrawdownChartBT, MetricGrid, TradesTable
    robustness/         RobustnessView, MonteCarloPanel, WalkForwardPanel
    data/               DataView (sample universe + CSV upload)
    learn/              LearnView + lessons data
    common/             InfoTip (hover tooltip)
    Footer.jsx
```

## Honest limitations

- **Synthetic sample data.** The 3 built-in symbols (`SPX-syn`, `QQQ-syn`, `GROWTH-syn`) are generated with seeded RNGs to produce realistic-looking drift, vol, and regime shifts. They are not real market data. Upload your own CSV bars for real results.
- **Long-only.** The MVP doesn't support shorting, leverage, or multi-asset portfolios. Single asset, fully invested when "long," cash otherwise.
- **Walk-forward without re-optimization.** True walk-forward optimization re-fits parameters per fold. This MVP uses the same parameters across all folds — a much weaker (but still useful) stability check.
- **Bootstrap assumes IID.** Monte Carlo resamples individual trades. Real trade returns have serial correlation; block bootstrap would be more honest. We surface the caveat in the panel.
- **No futures point values.** Each share/contract uses the bar's price as its dollar value. For futures, you'd want a contract-specific multiplier.

## Roadmap

- Real historical data via a small serverless backend (yfinance / Polygon / Stooq).
- True walk-forward optimization (parameter grid per fold).
- Multi-asset portfolio backtests.
- Strategy code editor (JS sandbox) for custom logic, not just presets.
- Out-of-sample reserve (hold the last N% of data invisible until final verdict).
- PDF report export.
- Saved strategies + user accounts.
- Benchmark universe (SPY, QQQ, IWM, etc).
- Forward / paper trading hookup.
- Lessons V2: pictures, examples, interactive demos.

## Privacy

CSV files you upload are parsed entirely in your browser and discarded when you close the tab. Nothing is sent to a server.

## License

Private MVP.
