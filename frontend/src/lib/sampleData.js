// Synthetic but realistic-looking daily bar data for the MVP demo.
// Replaces the trade-level sample data from Trade Reality Check.
// Users can swap to real bars via the CSV upload path.
//
// Each "ticker" is generated with a deterministic seed so the demo is
// reproducible. Drift, vol, and occasional drawdown regimes are tuned
// per-symbol to look qualitatively different (growth vs broad index
// vs volatile single-name).

function rngFactory(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gauss(rand, mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Generate ~10y of daily bars (~2520 trading days)
function generateBars({ seed, startPrice, dailyDrift, dailyVol, regimeShifts = [], symbol }) {
  const rand = rngFactory(seed);
  const bars = [];
  const start = new Date(2015, 0, 2);
  const cursor = new Date(start);
  let price = startPrice;
  let regimeIdx = 0;
  let drift = dailyDrift;
  let vol = dailyVol;

  for (let i = 0; i < 365 * 11; i++) {
    if (isWeekend(cursor)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    if (regimeShifts[regimeIdx] && i >= regimeShifts[regimeIdx].day) {
      drift = regimeShifts[regimeIdx].drift;
      vol = regimeShifts[regimeIdx].vol;
      regimeIdx += 1;
    }

    const ret = gauss(rand, drift, vol);
    const newPrice = price * (1 + ret);

    const intradayVol = vol * 0.5;
    const high = Math.max(price, newPrice) * (1 + Math.abs(gauss(rand, 0, intradayVol)));
    const low = Math.min(price, newPrice) * (1 - Math.abs(gauss(rand, 0, intradayVol)));
    const open = price;
    const close = newPrice;
    const volume = Math.floor(50_000_000 * (0.7 + rand() * 0.6));

    bars.push({
      date: new Date(cursor),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    });

    price = newPrice;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { symbol, bars };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// Pre-baked synthetic universes. Loaded lazily.
let _cache = null;

export function getSampleUniverse() {
  if (_cache) return _cache;

  const datasets = [
    // Broad index — steady drift, modest vol, with a 2020-style crash and 2022 chop
    generateBars({
      seed: 7,
      startPrice: 200,
      dailyDrift: 0.00045,
      dailyVol: 0.011,
      symbol: "SPX-syn",
      regimeShifts: [
        { day: 1300, drift: -0.0035, vol: 0.038 },   // sharp crash
        { day: 1335, drift: 0.0010, vol: 0.018 },    // recovery
        { day: 1700, drift: -0.0008, vol: 0.022 },   // 2022-style choppy bear
        { day: 1900, drift: 0.00055, vol: 0.013 },   // resumption of bull
      ],
    }),
    // Tech / growth — higher drift, higher vol
    generateBars({
      seed: 13,
      startPrice: 80,
      dailyDrift: 0.00075,
      dailyVol: 0.022,
      symbol: "QQQ-syn",
      regimeShifts: [
        { day: 1300, drift: -0.0050, vol: 0.055 },
        { day: 1340, drift: 0.0014, vol: 0.028 },
        { day: 1700, drift: -0.0015, vol: 0.033 },
        { day: 1900, drift: 0.0008, vol: 0.024 },
      ],
    }),
    // Single-name growth — much wilder
    generateBars({
      seed: 29,
      startPrice: 50,
      dailyDrift: 0.0010,
      dailyVol: 0.038,
      symbol: "GROWTH-syn",
      regimeShifts: [
        { day: 1300, drift: -0.008, vol: 0.080 },
        { day: 1340, drift: 0.003, vol: 0.045 },
        { day: 1700, drift: -0.0025, vol: 0.055 },
        { day: 1900, drift: 0.0010, vol: 0.042 },
      ],
    }),
  ];

  _cache = Object.fromEntries(datasets.map((d) => [d.symbol, d]));
  return _cache;
}

export function getSampleSymbols() {
  return Object.keys(getSampleUniverse());
}

export function getBars(symbol) {
  const u = getSampleUniverse();
  return u[symbol]?.bars || [];
}
