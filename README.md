# Panko Prediction Terminal

A Bloomberg-style quant terminal for prediction markets. Live Polymarket scanner, YES+NO basis arbitrage finder, Kelly-criterion edge calculator, and a personal forecast calibration tracker — with built-in explainers for every metric.

**Educational analytics. Not betting advice. Not investment advice.**

## What it does

- **MARKETS** — Live scanner of active Polymarket binary markets. Filter by category, sort by 24h volume / liquidity / time-to-resolve / YES price. Direct deep link to Polymarket per row.
- **MARKET (detail)** — Per-market view with YES/NO prices, basis, liquidity, time-to-resolve. Built-in **Edge & Kelly calculator**: enter your probability for YES, the terminal returns edge, EV, full / fractional Kelly stake, profit if YES, loss if NO, expected profit, and annualized edge return.
- **ARBITRAGE** — Scans all active markets for YES+NO basis dislocations (the prices should sum to $1.00 — when they don't, there's a basis trade). Filterable by minimum liquidity and minimum basis. Honest about spread vs displayed price.
- **CALIBRATION** — Personal forecast tracker. Manually log past bets (question, your P(YES), outcome). The terminal computes Brier score, log loss, ECE, Brier skill score, and a calibration curve (your forecast vs actual hit rate). Stored in browser localStorage; CSV export.
- **LEARN** — Five explainers: Edge & EV, Kelly criterion, calibration, basis trades, Polymarket mechanics.

## Stack

- Vite + React 18 + Tailwind
- Recharts for charts
- Direct browser fetches against `gamma-api.polymarket.com` (Polymarket's public Gamma API)
- No backend, no database, no auth, no API key required

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

## Data source

[Polymarket Gamma API](https://docs.polymarket.com/) — public, no auth, returns active markets, prices, volume, liquidity, resolution date, and the underlying CLOB token IDs.

**CORS note:** the Gamma endpoints work direct from a browser in most environments. If your browser blocks the request (corporate network, Brave shields, etc.) the app surfaces a clear error and falls back to embedded demo markets so you can still tour the UI. For production deploy, a tiny serverless proxy (Vercel Function, Cloudflare Worker) makes the CORS situation deterministic.

## Architecture

```
frontend/src/
  lib/
    polymarket.js    Gamma API fetch wrapper + normalization +
                     Kelly / EV helpers + embedded fallback markets
    calibration.js   Brier, log loss, ECE, bucket curve, accuracy
    glossary.js      One-line definitions for InfoTip
    format.js        Money / pct / cents / compact-K / days-until

  components/
    layout/          Sidebar, TopBar (with LIVE/DEMO API status), Panel
    markets/         MarketsView (scanner) + MarketDetail (deep dive + Kelly)
    arbitrage/       ArbView (YES+NO basis scanner)
    calibration/     CalibrationView (log + chart + Brier/ECE)
    learn/           LearnView + lessons data (5 explainers)
    common/          InfoTip (hover tooltip)
    Footer.jsx
```

## Honest limitations

- **Polymarket only.** Kalshi and other venues are roadmap. True cross-venue arbitrage requires Kalshi auth + matching question normalization — significant work.
- **Mid-price, not orderbook.** The scanner uses the AMM-displayed YES/NO mid. Real fills move with the orderbook. Always check Polymarket's book before executing a trade flagged here.
- **Calibration is manual.** You log bets yourself. Wallet-based auto-import (read your Polygon address, pull resolved positions) is V2.
- **Binary markets only.** Multi-outcome markets (e.g. "Who wins the primary?") are excluded for now. Multi-outcome basket sum-check is a natural V2.
- **No price history charting.** The Gamma API doesn't return historical price series; for charts we'd need to query the CLOB / on-chain logs separately. V2.

## Roadmap

- Cross-venue: Kalshi, PredictIt, Manifold. Multi-venue arbitrage scanner.
- Wallet auto-import for calibration (read your on-chain Polygon positions).
- Orderbook depth view per market (currently just mid).
- Price history charts (via on-chain / CLOB log query).
- Multi-outcome event basket sum-check arb.
- Watchlists + alerts (basis crosses threshold, market moves).
- Strategy DSL: "buy when implied prob < X AND time to resolve > Y."
- Backtest mode against historical resolved markets.

## Privacy

Calibration data is stored in your browser only (localStorage). Nothing is sent to a server. Polymarket API requests come from your browser — Polymarket sees the request, this app does not log them.

## License

Private MVP.
