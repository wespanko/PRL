const KEY = "panko_snapshots";
const MAX = 20;

function tickerFingerprint(payload) {
  return (payload.holdings || [])
    .map((h) => h.ticker.toUpperCase())
    .sort()
    .join(",");
}

function detailedFingerprint(payload) {
  const weights = (payload.holdings || [])
    .map((h) => `${h.ticker.toUpperCase()}:${Number(h.weight).toFixed(4)}`)
    .sort()
    .join(",");
  return `${weights}|${payload.start_date}|${payload.end_date}`;
}

export function saveSnapshot(payload, results, name = null) {
  const snaps = getSnapshots();
  const snap = {
    id: `${Date.now()}_${tickerFingerprint(payload)}`,
    timestamp: new Date().toISOString(),
    name: name || null,
    pinned: false,
    fingerprint: tickerFingerprint(payload),
    detailedFingerprint: detailedFingerprint(payload),
    payload,
    results,
  };
  const updated = [snap, ...snaps].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    localStorage.setItem(KEY, JSON.stringify([snap, ...snaps.slice(0, 10)]));
  }
  return snap;
}

export function getSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(snaps) {
  localStorage.setItem(KEY, JSON.stringify(snaps));
}

export function deleteSnapshot(id) {
  persist(getSnapshots().filter((s) => s.id !== id));
}

export function renameSnapshot(id, name) {
  persist(getSnapshots().map((s) => s.id === id ? { ...s, name: name || null } : s));
}

export function pinSnapshot(id) {
  persist(getSnapshots().map((s) => s.id === id ? { ...s, pinned: !s.pinned } : s));
}

export function clearSnapshots() {
  localStorage.removeItem(KEY);
}

export function findPriorSnapshot(payload) {
  const fp = tickerFingerprint(payload);
  const dfp = detailedFingerprint(payload);
  // Find the most recent snapshot with same tickers but NOT identical (different weights or dates)
  return getSnapshots().find((s) => s.fingerprint === fp && s.detailedFingerprint !== dfp) ?? null;
}
