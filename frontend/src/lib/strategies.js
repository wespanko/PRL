// Strategy preset library.
// Each strategy: a parameter schema + a signal function.
// signal(bar, history, params, state) returns one of: "long", "flat", "short" (only long/flat used for MVP).
// history is the slice of bars up to and including current bar (chronological).

function sma(bars, period) {
  if (bars.length < period) return null;
  let s = 0;
  for (let i = bars.length - period; i < bars.length; i++) s += bars[i].close;
  return s / period;
}

function highestHigh(bars, period) {
  if (bars.length < period) return null;
  let h = -Infinity;
  for (let i = bars.length - period; i < bars.length; i++) h = Math.max(h, bars[i].high);
  return h;
}

function lowestLow(bars, period) {
  if (bars.length < period) return null;
  let l = Infinity;
  for (let i = bars.length - period; i < bars.length; i++) l = Math.min(l, bars[i].low);
  return l;
}

function rsi(bars, period) {
  if (bars.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export const STRATEGIES = {
  sma_cross: {
    id: "sma_cross",
    name: "SMA Crossover",
    category: "Trend following",
    description:
      "Go long when the fast moving average crosses above the slow moving average. Go to cash when it crosses below. The classic trend-following starter strategy — easy to understand, and a useful baseline to beat.",
    params: [
      { key: "fast", label: "Fast MA period", default: 20, min: 5, max: 100, step: 1 },
      { key: "slow", label: "Slow MA period", default: 50, min: 10, max: 250, step: 1 },
    ],
    signal: (bar, history, p) => {
      const fast = sma(history, p.fast);
      const slow = sma(history, p.slow);
      if (fast === null || slow === null) return "flat";
      return fast > slow ? "long" : "flat";
    },
  },

  rsi_meanrev: {
    id: "rsi_meanrev",
    name: "RSI Mean Reversion",
    category: "Mean reversion",
    description:
      "Buy when RSI is oversold (a contrarian bet that prices snap back). Exit when RSI returns to a neutral zone. Mean reversion works in chop and fails in trends — a useful counterpoint to SMA crossover.",
    params: [
      { key: "rsiPeriod", label: "RSI period", default: 14, min: 2, max: 50, step: 1 },
      { key: "oversold", label: "Oversold level", default: 30, min: 10, max: 45, step: 1 },
      { key: "exit", label: "Exit level", default: 55, min: 45, max: 80, step: 1 },
    ],
    signal: (bar, history, p, state) => {
      const r = rsi(history, p.rsiPeriod);
      if (r === null) return "flat";
      if (state.position === "long") return r >= p.exit ? "flat" : "long";
      return r <= p.oversold ? "long" : "flat";
    },
  },

  donchian: {
    id: "donchian",
    name: "Donchian Breakout",
    category: "Breakout",
    description:
      "Buy when price breaks above the N-day high (a breakout signal). Exit when price closes below the M-day low. The strategy behind the original Turtle Traders — works when markets trend strongly, struggles in chop.",
    params: [
      { key: "entry", label: "Breakout lookback (days)", default: 55, min: 10, max: 200, step: 1 },
      { key: "exit", label: "Stop lookback (days)", default: 20, min: 5, max: 100, step: 1 },
    ],
    signal: (bar, history, p, state) => {
      if (history.length < Math.max(p.entry, p.exit) + 1) return "flat";
      const prior = history.slice(0, -1);
      const breakoutLevel = highestHigh(prior, p.entry);
      const stopLevel = lowestLow(prior, p.exit);
      if (state.position === "long") return bar.close < stopLevel ? "flat" : "long";
      return bar.close > breakoutLevel ? "long" : "flat";
    },
  },

  momentum: {
    id: "momentum",
    name: "12-Month Momentum",
    category: "Momentum",
    description:
      "Long when 12-month return (skipping the most recent month) is positive. Otherwise cash. The Asness/Moskowitz time-series momentum factor — one of the most-studied premia in academic finance.",
    params: [
      { key: "lookback", label: "Lookback (days)", default: 252, min: 60, max: 504, step: 1 },
      { key: "skip", label: "Skip recent (days)", default: 21, min: 0, max: 60, step: 1 },
    ],
    signal: (bar, history, p) => {
      const needed = p.lookback + p.skip;
      if (history.length < needed) return "flat";
      const past = history[history.length - 1 - p.lookback - p.skip]?.close;
      const recent = history[history.length - 1 - p.skip]?.close;
      if (!past || !recent) return "flat";
      return recent / past - 1 > 0 ? "long" : "flat";
    },
  },

  buy_hold: {
    id: "buy_hold",
    name: "Buy & Hold (benchmark)",
    category: "Benchmark",
    description:
      "Buy on day one, hold forever. The benchmark every backtest must beat to be meaningful. If your fancy strategy can't beat buy-and-hold on a risk-adjusted basis, it's not really an edge.",
    params: [],
    signal: () => "long",
  },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);

export function defaultParams(strategyId) {
  const s = STRATEGIES[strategyId];
  if (!s) return {};
  return Object.fromEntries(s.params.map((p) => [p.key, p.default]));
}
