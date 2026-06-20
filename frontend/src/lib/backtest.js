import { STRATEGIES } from "./strategies";

// Run a single backtest over bars with a given strategy + params.
// Long-only, fully-invested when "long". No leverage, no shorts (MVP).
// Fills at next bar's open to avoid lookahead bias.

const DEFAULT_OPTS = {
  startingCash: 100_000,
  commissionPerTrade: 1.0,  // round-trip approximation
  slippageBps: 5,            // 5 bps each side
  fromDate: null,
  toDate: null,
};

function applySlippage(price, side, bps) {
  const factor = 1 + (side === "buy" ? bps : -bps) / 10_000;
  return price * factor;
}

export function backtest(bars, strategyId, params, opts = {}) {
  const cfg = { ...DEFAULT_OPTS, ...opts };
  const strategy = STRATEGIES[strategyId];
  if (!strategy) throw new Error(`Unknown strategy: ${strategyId}`);

  const sliced = sliceByDates(bars, cfg.fromDate, cfg.toDate);
  if (sliced.length < 2) {
    return emptyResult(cfg.startingCash);
  }

  const state = { position: "flat" };
  let cash = cfg.startingCash;
  let shares = 0;
  let openTrade = null;
  const trades = [];
  const equity = [];
  let signalToday = "flat";

  for (let i = 0; i < sliced.length; i++) {
    const bar = sliced[i];
    const history = sliced.slice(0, i + 1);

    // Execute the signal computed at the END of the prior bar, at THIS bar's open.
    // This avoids lookahead — we never use today's close to trade today's open.
    if (i > 0) {
      const targetIsLong = signalToday === "long";
      const currentlyLong = state.position === "long";

      if (targetIsLong && !currentlyLong) {
        const fillPx = applySlippage(bar.open, "buy", cfg.slippageBps);
        shares = Math.floor((cash - cfg.commissionPerTrade) / fillPx);
        if (shares > 0) {
          cash -= shares * fillPx + cfg.commissionPerTrade;
          openTrade = {
            entryDate: bar.date,
            entryPrice: fillPx,
            shares,
          };
          state.position = "long";
        }
      } else if (!targetIsLong && currentlyLong && openTrade) {
        const fillPx = applySlippage(bar.open, "sell", cfg.slippageBps);
        cash += shares * fillPx - cfg.commissionPerTrade;
        const grossPnl = (fillPx - openTrade.entryPrice) * openTrade.shares;
        const netPnl = grossPnl - cfg.commissionPerTrade * 2;
        trades.push({
          date: bar.date,
          entryDate: openTrade.entryDate,
          symbol: bar.symbol || "asset",
          side: "long",
          quantity: openTrade.shares,
          entry: openTrade.entryPrice,
          exit: fillPx,
          grossPnl,
          netPnl,
          fees: cfg.commissionPerTrade * 2,
          duration: Math.round((bar.date - openTrade.entryDate) / 86_400_000),
          account: "BACKTEST",
          pnlEstimated: false,
        });
        shares = 0;
        openTrade = null;
        state.position = "flat";
      }
    }

    // Mark-to-market at close
    const equityValue = cash + shares * bar.close;
    equity.push({
      date: bar.date,
      close: bar.close,
      equity: equityValue,
      position: state.position,
    });

    // Compute tomorrow's signal from today's data
    signalToday = strategy.signal(bar, history, params, state);
  }

  // Close any open position at final close
  if (state.position === "long" && openTrade) {
    const last = sliced[sliced.length - 1];
    const fillPx = last.close;
    cash += shares * fillPx - cfg.commissionPerTrade;
    const grossPnl = (fillPx - openTrade.entryPrice) * openTrade.shares;
    trades.push({
      date: last.date,
      entryDate: openTrade.entryDate,
      symbol: last.symbol || "asset",
      side: "long",
      quantity: openTrade.shares,
      entry: openTrade.entryPrice,
      exit: fillPx,
      grossPnl,
      netPnl: grossPnl - cfg.commissionPerTrade * 2,
      fees: cfg.commissionPerTrade * 2,
      duration: Math.round((last.date - openTrade.entryDate) / 86_400_000),
      account: "BACKTEST",
      pnlEstimated: false,
    });
  }

  const finalEquity = equity[equity.length - 1]?.equity ?? cfg.startingCash;

  // Buy-and-hold benchmark for comparison
  const benchmark = buyHoldBenchmark(sliced, cfg);

  return {
    trades,
    equity,
    benchmark,
    cfg,
    startingCash: cfg.startingCash,
    finalEquity,
    totalReturn: finalEquity / cfg.startingCash - 1,
    daysInMarket: equity.filter((e) => e.position === "long").length,
    daysTotal: equity.length,
    timeInMarketPct: equity.filter((e) => e.position === "long").length / Math.max(1, equity.length),
    strategyId,
    params,
  };
}

function buyHoldBenchmark(bars, cfg) {
  if (!bars.length) return [];
  const firstPx = bars[0].open;
  const shares = Math.floor(cfg.startingCash / firstPx);
  const cash = cfg.startingCash - shares * firstPx;
  return bars.map((b) => ({
    date: b.date,
    equity: cash + shares * b.close,
    close: b.close,
  }));
}

function sliceByDates(bars, from, to) {
  if (!from && !to) return bars;
  const f = from ? new Date(from).getTime() : -Infinity;
  const t = to ? new Date(to).getTime() : Infinity;
  return bars.filter((b) => b.date.getTime() >= f && b.date.getTime() <= t);
}

function emptyResult(cash) {
  return { trades: [], equity: [], benchmark: [], finalEquity: cash, totalReturn: 0, daysInMarket: 0, daysTotal: 0, timeInMarketPct: 0 };
}

// Compute daily returns from equity curve (for Sharpe-on-equity, vs trade-level Sharpe)
export function dailyReturns(equity) {
  const rets = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1].equity;
    const curr = equity[i].equity;
    if (prev > 0) rets.push({ date: equity[i].date, ret: curr / prev - 1 });
  }
  return rets;
}

export function annualizedSharpe(returns, periodsPerYear = 252) {
  if (returns.length < 2) return 0;
  const m = returns.reduce((a, b) => a + b.ret, 0) / returns.length;
  const v = returns.reduce((a, b) => a + (b.ret - m) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(v);
  if (sd === 0) return 0;
  return (m / sd) * Math.sqrt(periodsPerYear);
}

export function maxDrawdownEquity(equity) {
  let peak = -Infinity;
  let maxDD = 0;
  let maxDDPct = 0;
  for (const p of equity) {
    if (p.equity > peak) peak = p.equity;
    const dd = p.equity - peak;
    const ddPct = peak > 0 ? dd / peak : 0;
    if (dd < maxDD) maxDD = dd;
    if (ddPct < maxDDPct) maxDDPct = ddPct;
  }
  return { maxDD, maxDDPct };
}

export function cagr(equity, periodsPerYear = 252) {
  if (equity.length < 2) return 0;
  const start = equity[0].equity;
  const end = equity[equity.length - 1].equity;
  const years = equity.length / periodsPerYear;
  if (start <= 0 || years <= 0) return 0;
  return (end / start) ** (1 / years) - 1;
}
