/**
 * Persists the most recent analysis (payload + results) to localStorage so a
 * page refresh doesn't blow away the user's work. Only the *latest* analysis
 * is kept here — long-term history lives in snapshots.
 *
 * Light validation on load: if the JSON is malformed or wrong shape, we
 * silently return null rather than rendering broken state.
 */

const KEY = "panko_last_session";
const TTL_HOURS = 24 * 7;  // a week

export function saveSession(payload, results) {
  if (!payload || !results) return;
  try {
    const blob = {
      payload,
      results,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    /* localStorage full — silently no-op, user just loses persistence */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw);
    if (!blob || !blob.payload || !blob.results || !blob.savedAt) return null;

    const ageHours = (Date.now() - new Date(blob.savedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > TTL_HOURS) {
      localStorage.removeItem(KEY);
      return null;
    }

    // sanity check the shape — must look like our analysis result
    if (typeof blob.results.sharpe_ratio !== "number") return null;
    if (!Array.isArray(blob.results.tickers)) return null;

    return blob;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
