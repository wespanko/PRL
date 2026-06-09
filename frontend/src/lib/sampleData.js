// Synthetic but realistic-looking sample trade history.
// Designed to exhibit several flagged behaviors so the demo report
// is informative: outlier-driven, mild revenge-trading, big-loss tail,
// some afternoon deterioration.

const SYMBOLS = ["NQ", "ES", "MNQ", "MES", "RTY"];

function rngFactory(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pickSymbol(rand) {
  return SYMBOLS[Math.floor(rand() * SYMBOLS.length)];
}

function gauss(rand, mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

export function generateSampleTrades() {
  const rand = rngFactory(42);
  const trades = [];
  const start = new Date(2025, 8, 2, 9, 30); // Sept 2025
  const cursor = new Date(start);

  let lastWasLoss = false;

  for (let d = 0; d < 28; d++) {
    if (cursor.getDay() === 0 || cursor.getDay() === 6) {
      cursor.setDate(cursor.getDate() + 1);
      d -= 1;
      continue;
    }

    const tradesToday = 4 + Math.floor(rand() * 6);
    cursor.setHours(9, 30 + Math.floor(rand() * 10), 0);

    for (let i = 0; i < tradesToday; i++) {
      cursor.setMinutes(cursor.getMinutes() + 5 + Math.floor(rand() * 30));
      const symbol = pickSymbol(rand);
      const side = rand() > 0.45 ? "long" : "short";

      let baseQty = 1 + Math.floor(rand() * 3);
      if (lastWasLoss && rand() > 0.55) baseQty *= 2;

      const hour = cursor.getHours();
      const afternoonPenalty = hour >= 14 ? -8 : 0;
      const revengeBias = lastWasLoss ? -12 : 0;

      let pnl = gauss(rand, 6 + afternoonPenalty + revengeBias, 35);

      if (rand() < 0.04) pnl = gauss(rand, 250, 80);
      if (rand() < 0.06) pnl = -Math.abs(gauss(rand, 140, 50));

      pnl = Math.round(pnl * 100) / 100;
      const entry = Math.round((15000 + rand() * 500) * 100) / 100;
      const exit = side === "long" ? entry + pnl / baseQty : entry - pnl / baseQty;

      trades.push({
        date: new Date(cursor),
        symbol,
        side,
        quantity: baseQty,
        entry: Math.round(entry * 100) / 100,
        exit: Math.round(exit * 100) / 100,
        grossPnl: pnl,
        netPnl: Math.round((pnl - 1.0) * 100) / 100,
        fees: 1.0,
        duration: 5 + Math.floor(rand() * 30),
        account: "DEMO-FUT",
        pnlEstimated: false,
      });

      lastWasLoss = pnl < 0;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return trades;
}
