# Trade Reality Check

A trader-behavior and risk analytics MVP. Upload your trade history and find out:

- whether you have a measurable edge
- whether your profits are outlier-driven
- which behaviors are causing your drawdowns
- how your trade distribution holds up against a prop firm's drawdown limits

**Analytics only. No trading signals. No investment advice.**

## What it is

A single-page React app. No backend, no database, no login. Your CSV is parsed and analyzed entirely in the browser — nothing is uploaded.

The report covers:

- **Reality Check Score (0–100)** with a plain-English label and a sample-size confidence indicator.
- **Key metrics**: total P&L, win rate, profit factor, expectancy, avg win/loss, best/worst, std dev, Sharpe-like.
- **Equity curve + drawdown chart** with max drawdown and worst streaks.
- **Daily P&L stats**: best day, worst day, days traded, trades per day.
- **Outlier dependence**: P&L excluding top 1 / top 3 trades, percent of gross profit from top trades, plus an outlier warning when applicable.
- **Behavior leaks** (severity-tagged): big-loss tail, outlier dependence, sizing inconsistency, overtrading, revenge trading after a loss, late-day deterioration, noisy/unproven edge.
- **Time-of-day analysis** (hour-by-hour P&L + premarket/regular/afternoon/overnight buckets) when timestamps are present.
- **Prop-firm survival simulator**: Monte Carlo on your historical trade distribution against an account size, max drawdown, daily loss limit, and profit target.
- **Recommended rules** generated from the patterns above.

## Run it

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

To produce a static build:

```bash
npm run build
npm run preview
```

The build outputs to `frontend/dist/`. It is a fully static site — host it on Vercel, Netlify, Cloudflare Pages, or any static host.

## CSV format

The parser auto-detects common column names from broker, prop firm, and journal exports.

| Concept | Recognized as (case/spacing-insensitive) |
| --- | --- |
| Date / time | `date`, `datetime`, `time`, `timestamp`, `opened`, `closed`, `entrytime`, `exittime` |
| Symbol | `symbol`, `instrument`, `ticker`, `contract` |
| Side | `side`, `direction`, `type`, `action`, `buysell`, `longshort` (values: long/short, buy/sell, b/s) |
| Quantity | `quantity`, `qty`, `contracts`, `size`, `lots`, `shares` |
| Entry price | `entry`, `entryprice`, `open`, `openprice`, `buyprice`, `fillprice` |
| Exit price | `exit`, `exitprice`, `close`, `closeprice`, `sellprice` |
| Gross P&L | `grosspnl`, `grossprofit` |
| Net P&L | `netpnl`, `pnl`, `profit`, `result`, `realizedpnl` |
| Fees | `commission`, `fees`, `cost` |
| Duration | `duration`, `holdtime`, `timeintrade` |
| Account | `account`, `accountname`, `broker` |

If a net P&L column is present, it is used directly. Otherwise the parser falls back to `gross - fees`, then to `(exit - entry) × side × quantity − fees`. P&L computed this last way is flagged in the report as **approximate** — for futures the dollar value per point can be different from 1 (e.g. NQ = $20/pt) and we do not currently apply contract-specific multipliers.

## MVP limitations

- Futures point values are not applied automatically. Estimated P&L from entry/exit assumes $1 per point per contract.
- Time-of-day analysis uses the local time of the dates parsed. Time zones are not normalized.
- The simulator samples trades with replacement and treats every day as independent. Real intra-day path dependence (e.g. trailing drawdown vs end-of-day drawdown) is approximated.
- No login, no saved reports — close the tab and the data is gone.
- No broker-specific CSV templates yet. Most exports work but oddly-named columns may need a one-line rename.

## Roadmap

- Broker / platform-specific CSV presets (Tradovate, Rithmic, Topstep, NinjaTrader, Tradezella).
- Futures contract specs (point value, tick value) for accurate estimated P&L.
- PDF export of the report.
- User accounts and saved reports.
- Benchmark comparisons (your distribution vs aggregate distributions across user base).
- Advanced Monte Carlo: trailing vs end-of-day drawdown, weekend/holiday handling, intra-day path simulation.
- Strategy tagging — break the report down per strategy or per setup.
- Coach dashboard for funded-trader programs / mentors.
- AI-generated weekly trading autopsy.

## Privacy

Your CSV is read by the browser and analyzed in-memory. The file is not sent to any server. Closing the tab clears it.

## License

Private MVP.
