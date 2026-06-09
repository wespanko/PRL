const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(sum(arr.map((x) => (x - m) ** 2)) / (arr.length - 1));
};
const safeDiv = (a, b) => (b === 0 ? 0 : a / b);

export function basicMetrics(trades) {
  if (!trades.length) {
    return {
      totalPnl: 0, numTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0,
      profitFactor: 0, expectancy: 0, best: 0, worst: 0, avg: 0, median: 0,
      winners: 0, losers: 0, scratches: 0,
    };
  }
  const pnls = trades.map((t) => t.netPnl);
  const winners = pnls.filter((p) => p > 0);
  const losers = pnls.filter((p) => p < 0);
  const scratches = pnls.filter((p) => p === 0);
  const grossWin = sum(winners);
  const grossLoss = Math.abs(sum(losers));

  return {
    totalPnl: sum(pnls),
    numTrades: trades.length,
    winRate: trades.length ? winners.length / trades.length : 0,
    avgWin: mean(winners),
    avgLoss: mean(losers),
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss,
    expectancy: mean(pnls),
    best: Math.max(...pnls),
    worst: Math.min(...pnls),
    avg: mean(pnls),
    median: median(pnls),
    winners: winners.length,
    losers: losers.length,
    scratches: scratches.length,
    grossWin,
    grossLoss,
    stddev: stddev(pnls),
  };
}

export function equityCurve(trades) {
  let cum = 0;
  return trades.map((t, i) => {
    cum += t.netPnl;
    return {
      i: i + 1,
      pnl: t.netPnl,
      equity: cum,
      date: t.date,
    };
  });
}

export function drawdownSeries(curve) {
  let peak = 0;
  return curve.map((p) => {
    if (p.equity > peak) peak = p.equity;
    return { i: p.i, equity: p.equity, peak, dd: p.equity - peak, date: p.date };
  });
}

export function drawdownStats(ddSeries) {
  if (!ddSeries.length) return { maxDrawdown: 0, avgDrawdown: 0 };
  const dds = ddSeries.map((p) => p.dd);
  const inDD = dds.filter((d) => d < 0);
  return {
    maxDrawdown: Math.min(...dds),
    avgDrawdown: inDD.length ? mean(inDD) : 0,
  };
}

export function streaks(trades) {
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const t of trades) {
    if (t.netPnl > 0) { curW += 1; curL = 0; maxW = Math.max(maxW, curW); }
    else if (t.netPnl < 0) { curL += 1; curW = 0; maxL = Math.max(maxL, curL); }
    else { curW = 0; curL = 0; }
  }
  return { worstLosingStreak: maxL, worstWinningStreak: maxW };
}

export function dailyPnl(trades) {
  const byDay = new Map();
  for (const t of trades) {
    if (!t.date) continue;
    const k = t.date.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) || 0) + t.netPnl);
  }
  const arr = [...byDay.entries()]
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return arr;
}

export function dailyStats(daily) {
  if (!daily.length) return { bestDay: null, worstDay: null, avgDay: 0, days: 0, tradesPerDay: 0 };
  const pnls = daily.map((d) => d.pnl);
  const bestIdx = pnls.indexOf(Math.max(...pnls));
  const worstIdx = pnls.indexOf(Math.min(...pnls));
  return {
    bestDay: daily[bestIdx],
    worstDay: daily[worstIdx],
    avgDay: mean(pnls),
    days: daily.length,
  };
}

export function sharpeLike(trades) {
  if (trades.length < 2) return 0;
  const pnls = trades.map((t) => t.netPnl);
  const sd = stddev(pnls);
  if (sd === 0) return 0;
  return mean(pnls) / sd;
}

export function outlierAnalysis(trades) {
  if (!trades.length) return { pnlExclTop1: 0, pnlExclTop3: 0, pctFromTop1: 0, pctFromTop3: 0, warning: null };
  const pnls = trades.map((t) => t.netPnl);
  const total = sum(pnls);
  const positives = pnls.filter((p) => p > 0).sort((a, b) => b - a);
  const top1 = positives.slice(0, 1);
  const top3 = positives.slice(0, 3);
  const grossWin = sum(positives);
  const pctFromTop1 = safeDiv(sum(top1), grossWin);
  const pctFromTop3 = safeDiv(sum(top3), grossWin);
  const pnlExclTop1 = total - sum(top1);
  const pnlExclTop3 = total - sum(top3);

  let warning = null;
  if (total > 0 && pnlExclTop3 <= 0) {
    warning = "Your total P&L is positive, but removing your top 3 trades makes you unprofitable.";
  } else if (pctFromTop3 > 0.7) {
    warning = `${Math.round(pctFromTop3 * 100)}% of your gross profits came from your top 3 trades.`;
  } else if (pctFromTop1 > 0.45) {
    warning = `${Math.round(pctFromTop1 * 100)}% of your gross profits came from a single trade.`;
  }

  return { pnlExclTop1, pnlExclTop3, pctFromTop1, pctFromTop3, warning };
}

const HOUR_BUCKETS = [
  { key: "premarket", label: "Premarket (before 9am)", test: (h) => h < 9 },
  { key: "regular", label: "Regular session (9am–2pm)", test: (h) => h >= 9 && h < 14 },
  { key: "afternoon", label: "Afternoon (2–4pm)", test: (h) => h >= 14 && h < 16 },
  { key: "overnight", label: "Overnight (after 4pm)", test: (h) => h >= 16 },
];

export function timeAnalysis(trades, hasTimestamps) {
  if (!hasTimestamps) return { available: false };

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, pnl: 0, count: 0 }));
  const bySession = HOUR_BUCKETS.map((b) => ({ key: b.key, label: b.label, pnl: 0, count: 0 }));

  for (const t of trades) {
    if (!t.date) continue;
    const h = t.date.getHours();
    byHour[h].pnl += t.netPnl;
    byHour[h].count += 1;
    const bucket = bySession.find((_, i) => HOUR_BUCKETS[i].test(h));
    if (bucket) { bucket.pnl += t.netPnl; bucket.count += 1; }
  }

  const tradedHours = byHour.filter((h) => h.count > 0);
  const bestHour = tradedHours.length
    ? tradedHours.reduce((a, b) => (b.pnl > a.pnl ? b : a))
    : null;
  const worstHour = tradedHours.length
    ? tradedHours.reduce((a, b) => (b.pnl < a.pnl ? b : a))
    : null;

  return { available: true, byHour, bySession, bestHour, worstHour };
}

export function behaviorLeaks(trades, basic, outliers, daily, time) {
  const leaks = [];

  // Big loss problem
  if (basic.avgWin > 0 && basic.worst < 0) {
    const ratio = Math.abs(basic.worst) / basic.avgWin;
    if (ratio > 4) {
      leaks.push({
        id: "big-loss",
        title: "Losses are far larger than your winners",
        severity: "high",
        explanation: `Your worst loss is ${ratio.toFixed(1)}x your average winner. A few bad trades can erase many good ones.`,
        suggestedRule: "Cap loss per trade at 1.0–1.5x your average winner until the distribution improves.",
      });
    } else if (ratio > 2.5) {
      leaks.push({
        id: "big-loss",
        title: "Losses are too large relative to winners",
        severity: "medium",
        explanation: `Your worst loss is ${ratio.toFixed(1)}x your average winner.`,
        suggestedRule: "Tighten stop-loss size — a single bad trade currently undoes several good ones.",
      });
    }
  }

  // Outlier dependence
  if (outliers.pctFromTop3 > 0.7 || (basic.totalPnl > 0 && outliers.pnlExclTop3 <= 0)) {
    leaks.push({
      id: "outlier-dependence",
      title: "Profits depend on a handful of trades",
      severity: "high",
      explanation: outliers.warning || `${Math.round(outliers.pctFromTop3 * 100)}% of your gross profits came from your top 3 trades.`,
      suggestedRule: "Do not scale size — current profits are outlier-driven. Verify with more trades first.",
    });
  } else if (outliers.pctFromTop3 > 0.5) {
    leaks.push({
      id: "outlier-dependence",
      title: "Concentrated profits in a few trades",
      severity: "medium",
      explanation: `${Math.round(outliers.pctFromTop3 * 100)}% of your gross profits came from your top 3 trades.`,
      suggestedRule: "Track expectancy excluding outliers — that is the edge you can actually trust.",
    });
  }

  // Size inconsistency
  const qtys = trades.map((t) => t.quantity).filter((q) => q > 0);
  if (qtys.length > 1) {
    const m = qtys.reduce((a, b) => a + b, 0) / qtys.length;
    const sd = Math.sqrt(qtys.reduce((a, b) => a + (b - m) ** 2, 0) / (qtys.length - 1));
    const cv = m === 0 ? 0 : sd / m;
    if (cv > 0.8) {
      leaks.push({
        id: "size-inconsistency",
        title: "Position sizing is inconsistent",
        severity: "high",
        explanation: `Your size varies ${cv.toFixed(1)}x its mean (coefficient of variation). Inconsistent sizing makes your edge unmeasurable.`,
        suggestedRule: "Trade fixed size until you have a documented reason to scale. Variable size hides whether your edge is real.",
      });
    } else if (cv > 0.5) {
      leaks.push({
        id: "size-inconsistency",
        title: "Position sizing varies a lot",
        severity: "medium",
        explanation: `Your size CV is ${cv.toFixed(1)} — sizing changes are washing out your edge signal.`,
        suggestedRule: "Pick 1–2 fixed sizes and only deviate with a written rule.",
      });
    }
  }

  // Overtrading
  if (daily.length > 0) {
    const tpd = trades.length / daily.length;
    if (tpd > 25) {
      leaks.push({
        id: "overtrading",
        title: "You are likely overtrading",
        severity: "high",
        explanation: `You average ${tpd.toFixed(1)} trades per day. High frequency usually amplifies fees and emotional decisions.`,
        suggestedRule: "Cap trades per day at half your current average for two weeks and re-measure expectancy.",
      });
    } else if (tpd > 15) {
      leaks.push({
        id: "overtrading",
        title: "Trade frequency is high",
        severity: "medium",
        explanation: `You average ${tpd.toFixed(1)} trades per day.`,
        suggestedRule: "Track your expectancy on your first 5 trades of the day vs the rest — the second half is usually worse.",
      });
    }
  }

  // Revenge trading: avg PnL of trades immediately following a loss vs overall
  if (trades.length > 20) {
    const afterLoss = [];
    for (let i = 1; i < trades.length; i++) {
      if (trades[i - 1].netPnl < 0) afterLoss.push(trades[i].netPnl);
    }
    if (afterLoss.length >= 10) {
      const overall = basic.expectancy;
      const afterAvg = afterLoss.reduce((a, b) => a + b, 0) / afterLoss.length;
      if (overall > 0 && afterAvg < 0) {
        leaks.push({
          id: "revenge",
          title: "You lose money after a losing trade",
          severity: "high",
          explanation: `Your expectancy after a loss is ${afterAvg.toFixed(2)} vs ${overall.toFixed(2)} overall. The next-trade behavior is likely revenge trading.`,
          suggestedRule: "Stop trading for 30 minutes after any losing trade.",
        });
      } else if (afterAvg < overall * 0.5 && overall > 0) {
        leaks.push({
          id: "revenge",
          title: "Performance dips after a loss",
          severity: "medium",
          explanation: `Your expectancy after a loss is ${afterAvg.toFixed(2)} vs ${overall.toFixed(2)} overall.`,
          suggestedRule: "Take a 15-minute break after every losing trade.",
        });
      }
    }
  }

  // Late-day deterioration
  if (time.available && time.byHour) {
    const morning = time.byHour.slice(9, 12).reduce((a, b) => ({ pnl: a.pnl + b.pnl, count: a.count + b.count }), { pnl: 0, count: 0 });
    const lateDay = time.byHour.slice(14, 17).reduce((a, b) => ({ pnl: a.pnl + b.pnl, count: a.count + b.count }), { pnl: 0, count: 0 });
    if (morning.count >= 10 && lateDay.count >= 10) {
      const mExp = morning.pnl / morning.count;
      const lExp = lateDay.pnl / lateDay.count;
      if (mExp > 0 && lExp < 0) {
        leaks.push({
          id: "late-day",
          title: "You give back profits in the afternoon",
          severity: "high",
          explanation: `Morning expectancy ${mExp.toFixed(2)} vs afternoon ${lExp.toFixed(2)}. You make money in the morning and lose it later.`,
          suggestedRule: "Stop trading by 2pm. Treat afternoon trades as a separate strategy that must prove itself.",
        });
      }
    }
  }

  // Inconsistent edge
  if (basic.expectancy !== 0 && basic.stddev > 0) {
    const cv = basic.stddev / Math.abs(basic.expectancy);
    if (cv > 15 && trades.length < 100) {
      leaks.push({
        id: "noisy-edge",
        title: "Your edge is noisy and unproven",
        severity: "medium",
        explanation: `Trade-level variance is ${cv.toFixed(0)}x your average — and you have only ${trades.length} trades. You cannot yet tell skill from luck.`,
        suggestedRule: "Collect at least 100 more trades before changing position size or strategy based on these results.",
      });
    }
  }

  return leaks;
}

export function realityCheckScore({ basic, outliers, leaks, sampleSize }) {
  let score = 50;

  if (basic.profitFactor === Infinity) score += 15;
  else if (basic.profitFactor > 2) score += 15;
  else if (basic.profitFactor > 1.5) score += 10;
  else if (basic.profitFactor > 1.2) score += 5;
  else if (basic.profitFactor < 1.0) score -= 15;

  if (basic.expectancy > 0) score += 5;
  else score -= 10;

  if (basic.totalPnl > 0 && Math.abs(basic.worst) > basic.totalPnl) score -= 10;

  if (outliers.pctFromTop3 < 0.3) score += 10;
  else if (outliers.pctFromTop3 < 0.5) score += 0;
  else if (outliers.pctFromTop3 < 0.7) score -= 10;
  else score -= 20;

  const high = leaks.filter((l) => l.severity === "high").length;
  const med = leaks.filter((l) => l.severity === "medium").length;
  score -= high * 10;
  score -= med * 5;

  if (sampleSize < 30) score = Math.round(score * 0.85);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreLabel(score) {
  if (score >= 80) return { label: "Strong, but still needs risk controls", tone: "positive" };
  if (score >= 60) return { label: "Promising but fragile", tone: "neutral" };
  if (score >= 40) return { label: "Mixed — edge unclear", tone: "neutral" };
  if (score >= 20) return { label: "High-risk behavior", tone: "warn" };
  return { label: "Likely gambling — no measurable edge", tone: "bad" };
}

export function confidenceLabel(n) {
  if (n < 30) return { label: "Low confidence", note: `Only ${n} trades — anything below 30 is noise.` };
  if (n < 100) return { label: "Medium confidence", note: `${n} trades — enough to spot patterns but not enough to trust the size of the edge.` };
  return { label: "High confidence", note: `${n} trades — statistically meaningful sample.` };
}

export function recommendedRules({ basic, outliers, leaks, sampleSize, time, daily }) {
  const rules = [];

  for (const l of leaks) {
    if (l.suggestedRule && !rules.includes(l.suggestedRule)) rules.push(l.suggestedRule);
  }

  if (time && time.available && time.worstHour && time.worstHour.pnl < 0) {
    rules.push(`Avoid trading during your worst-performing hour (${time.worstHour.hour}:00).`);
  }

  if (sampleSize < 100) {
    const need = 100 - sampleSize;
    rules.push(`Collect at least ${need} more trades before trusting this edge.`);
  }

  if (basic.totalPnl > 0 && outliers.pctFromTop3 > 0.5) {
    rules.push("Do not scale position size — your current profits are outlier-driven.");
  }

  if (daily && daily.length > 0) {
    const worstDay = daily.reduce((a, b) => (a.pnl < b.pnl ? a : b));
    if (worstDay.pnl < -Math.abs(basic.totalPnl) * 0.5 && basic.totalPnl !== 0) {
      rules.push("Set a daily loss limit — your single worst day is a big share of cumulative P&L.");
    }
  }

  return rules.slice(0, 6);
}

export function fullReport(trades, opts = {}) {
  const basic = basicMetrics(trades);
  const curve = equityCurve(trades);
  const dd = drawdownSeries(curve);
  const ddStats = drawdownStats(dd);
  const str = streaks(trades);
  const daily = dailyPnl(trades);
  const dStats = dailyStats(daily);
  const sharpe = sharpeLike(trades);
  const outliers = outlierAnalysis(trades);
  const time = timeAnalysis(trades, opts.hasTimestamps);
  const leaks = behaviorLeaks(trades, basic, outliers, daily, time);
  const score = realityCheckScore({ basic, outliers, leaks, sampleSize: trades.length });
  const label = scoreLabel(score);
  const confidence = confidenceLabel(trades.length);
  const rules = recommendedRules({ basic, outliers, leaks, sampleSize: trades.length, time, daily });

  return {
    basic, curve, dd, ddStats, streaks: str, daily, dailyStats: dStats,
    sharpe, outliers, time, leaks, score, label, confidence, rules,
    hasDates: opts.hasDates,
    hasTimestamps: opts.hasTimestamps,
    anyEstimated: opts.anyEstimated,
  };
}
