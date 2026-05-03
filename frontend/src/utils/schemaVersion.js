/**
 * Bump CURRENT_SCHEMA_VERSION to force-wipe every user's local data on their
 * next page load. Used when:
 *   - schema changes incompatibly (profile fields, snapshot shape)
 *   - we want every tester to start fresh
 *
 * Anything stored under a `panko_*` localStorage key is removed.
 * The backend price cache (server-side, in-memory) is unaffected.
 */

const CURRENT_SCHEMA_VERSION = "2025-05-03-reset-1";
const VERSION_KEY = "panko_schema_version";

export function ensureSchemaVersion() {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === CURRENT_SCHEMA_VERSION) return;

    // Wipe every panko_* key, then write the new version.
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("panko_")) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    localStorage.setItem(VERSION_KEY, CURRENT_SCHEMA_VERSION);
  } catch {
    /* localStorage unavailable (e.g. private mode quota) — silently no-op */
  }
}

/** Manual reset, exposed via the Settings page button. */
export function clearAllLocalData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("panko_")) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* no-op */
  }
}
