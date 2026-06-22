// Polymarket Gamma API client.
// Public endpoints; direct browser fetch. If CORS blocks, we surface a
// clear error to the UI and fall back to embedded sample data so the
// product remains usable for the demo.

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";

// Polymarket Gamma returns most numeric fields as strings — normalize.
function normalizeMarket(m) {
  // outcomes / outcomePrices / clobTokenIds may come as JSON-stringified arrays
  const safeArr = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { return JSON.parse(v); } catch { return []; }
    }
    return [];
  };
  const outcomes = safeArr(m.outcomes);
  const outcomePricesRaw = safeArr(m.outcomePrices);
  const outcomePrices = outcomePricesRaw.map((p) => Number(p));
  const clobTokenIds = safeArr(m.clobTokenIds);

  const yesPrice = outcomePrices[0] ?? null;
  const noPrice = outcomePrices[1] ?? null;
  const yesNoBasis = yesPrice !== null && noPrice !== null
    ? yesPrice + noPrice - 1
    : null;

  return {
    id: m.id,
    conditionId: m.conditionId,
    question: m.question,
    slug: m.slug,
    description: m.description,
    category: m.category,
    image: m.image,
    icon: m.icon,
    endDate: m.endDate ? new Date(m.endDate) : null,
    startDate: m.startDate ? new Date(m.startDate) : null,
    liquidity: Number(m.liquidity) || 0,
    volume: Number(m.volume) || 0,
    volume24hr: Number(m.volume24hr) || 0,
    outcomes,
    outcomePrices,
    yesPrice,
    noPrice,
    yesNoBasis,
    yesNoSum: yesPrice !== null && noPrice !== null ? yesPrice + noPrice : null,
    clobTokenIds,
    active: !!m.active,
    closed: !!m.closed,
    archived: !!m.archived,
    resolutionSource: m.resolutionSource,
    isBinary: outcomes.length === 2,
    eventSlug: m.events?.[0]?.slug || null,
    eventTitle: m.events?.[0]?.title || null,
  };
}

async function fetchJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

export async function listActiveMarkets({ limit = 200, offset = 0, signal } = {}) {
  const url = `${GAMMA_BASE}/markets?active=true&closed=false&archived=false&limit=${limit}&offset=${offset}&order=volume24hr&ascending=false`;
  try {
    const data = await fetchJson(url, signal);
    return { markets: data.map(normalizeMarket), error: null, fromCache: false };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { markets: SAMPLE_MARKETS.map(normalizeMarket), error: e.message, fromCache: true };
  }
}

export async function getMarket(id, { signal } = {}) {
  try {
    const data = await fetchJson(`${GAMMA_BASE}/markets/${id}`, signal);
    return { market: normalizeMarket(data), error: null };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { market: null, error: e.message };
  }
}

export async function getOrderbook(tokenId, { signal } = {}) {
  try {
    const data = await fetchJson(`${CLOB_BASE}/book?token_id=${tokenId}`, signal);
    return { book: data, error: null };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { book: null, error: e.message };
  }
}

// Minimal embedded fallback so the app demos when CORS / network blocks the API.
// Shape mirrors a real Polymarket /markets response.
const SAMPLE_MARKETS = [
  {
    id: "DEMO-1",
    conditionId: "0xdemo1",
    question: "Will Bitcoin close above $200k by end of 2026?",
    slug: "btc-200k-2026",
    endDate: "2026-12-31T23:59:59Z",
    startDate: "2026-01-01T00:00:00Z",
    liquidity: "84320",
    volume: "1245000",
    volume24hr: "18200",
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.34", "0.66"],
    clobTokenIds: ["demo-yes-1", "demo-no-1"],
    category: "Crypto",
    active: true,
    closed: false,
  },
  {
    id: "DEMO-2",
    conditionId: "0xdemo2",
    question: "Will the Fed cut rates at the next FOMC meeting?",
    slug: "fed-cut-next-fomc",
    endDate: "2026-07-30T19:00:00Z",
    startDate: "2026-06-01T00:00:00Z",
    liquidity: "210400",
    volume: "3850000",
    volume24hr: "98000",
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.62", "0.39"],
    clobTokenIds: ["demo-yes-2", "demo-no-2"],
    category: "Macro",
    active: true,
    closed: false,
  },
  {
    id: "DEMO-3",
    conditionId: "0xdemo3",
    question: "Will GTA VI release in 2026?",
    slug: "gta-vi-2026",
    endDate: "2026-12-31T23:59:59Z",
    startDate: "2025-01-01T00:00:00Z",
    liquidity: "440000",
    volume: "8200000",
    volume24hr: "210000",
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.74", "0.27"],
    clobTokenIds: ["demo-yes-3", "demo-no-3"],
    category: "Culture",
    active: true,
    closed: false,
  },
  {
    id: "DEMO-4",
    conditionId: "0xdemo4",
    question: "Will the S&P 500 close above 6500 by year-end?",
    slug: "spx-6500-eoy",
    endDate: "2026-12-31T20:00:00Z",
    startDate: "2026-01-01T00:00:00Z",
    liquidity: "180000",
    volume: "2400000",
    volume24hr: "44000",
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.49", "0.50"],
    clobTokenIds: ["demo-yes-4", "demo-no-4"],
    category: "Macro",
    active: true,
    closed: false,
  },
  {
    id: "DEMO-5",
    conditionId: "0xdemo5",
    question: "Will OpenAI announce GPT-6 in 2026?",
    slug: "gpt6-2026",
    endDate: "2026-12-31T23:59:59Z",
    startDate: "2026-01-01T00:00:00Z",
    liquidity: "62000",
    volume: "890000",
    volume24hr: "12500",
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.41", "0.61"],
    clobTokenIds: ["demo-yes-5", "demo-no-5"],
    category: "AI",
    active: true,
    closed: false,
  },
];

// === Quant helpers ===

// Expected value of a YES bet given your probability vs market price.
// Bet $1 at YES price p: cost p, payoff 1 (if YES). EV = q*1 - p where q is your prob.
// Edge in cents = q - p.
export function evYes(myProb, marketPrice) {
  return myProb - marketPrice;
}

// Kelly fraction for a binary bet at decimal odds b = (1-p)/p, given true prob q.
// Kelly f* = (b*q - (1 - q)) / b. Clamped to [0, 1].
export function kellyFraction(myProb, marketPrice) {
  if (marketPrice <= 0 || marketPrice >= 1) return 0;
  const b = (1 - marketPrice) / marketPrice;
  const f = (b * myProb - (1 - myProb)) / b;
  if (!Number.isFinite(f)) return 0;
  return Math.max(0, Math.min(1, f));
}

// Implied probability is just the market price for a YES (binary).
export function impliedProb(marketPrice) {
  return marketPrice;
}

// Annualized expected return = EV / cost / years to resolution
export function annualizedEdgeReturn(myProb, marketPrice, daysToResolve) {
  if (marketPrice <= 0 || daysToResolve <= 0) return 0;
  const ev = (myProb / marketPrice) - 1; // multiplicative if YES wins
  const years = daysToResolve / 365;
  if (years <= 0) return 0;
  return (1 + ev) ** (1 / years) - 1;
}
