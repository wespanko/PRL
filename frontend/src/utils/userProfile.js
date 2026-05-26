/**
 * Phase-3 cross-session user_profile — facts the tutor has learned about
 * the user, persisted in localStorage and shipped with every chat/tutor
 * request. The model writes new facts via the `remember_about_user` tool;
 * the SSE handler picks up the resulting `memory_write` ui_payload and
 * calls `applyMemoryWrite` here.
 *
 * Privacy: nothing leaves the browser except as part of an explicit
 * tutor request, where the backend forwards it to Claude and discards it.
 * Mirrors the same privacy stance as the screen-share snapshot.
 *
 * Schema:
 *   {
 *     risk_tolerance: "conservative" | "balanced" | "aggressive" | undefined,
 *     goals: string[],  // append-only, deduped, capped at 6
 *     facts: string[],  // append-only, deduped, capped at 12
 *     updated_at: ISO string,
 *   }
 *
 * We also fall back to reading the onboarding profile (utils/profile.js) for
 * risk_tolerance when the tutor hasn't learned anything yet — so first-time
 * users still get a calibrated voice if they completed onboarding.
 */

import { loadProfile } from "./profile";

const KEY = "panko_profile_v1";
const MAX_GOALS = 6;
const MAX_FACTS = 12;
const MAX_LEN = 240;

function _readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return p;
  } catch {
    return null;
  }
}

function _writeRaw(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, updated_at: new Date().toISOString() }));
  } catch {
    /* localStorage full — silently no-op. Tutor will re-learn next session. */
  }
}

/** Returns the wire shape sent in every chat/tutor request. Merges the
 *  tutor-memory store with the onboarding-profile risk_tolerance fallback,
 *  so the model sees a non-empty profile even on first turn. Returns null
 *  when there's truly nothing to send. */
export function getUserProfileForRequest() {
  const stored = _readRaw() || {};
  const onboarding = loadProfile();

  const risk_tolerance =
    stored.risk_tolerance ||
    (onboarding && onboarding.riskTolerance) ||
    undefined;

  const goals = Array.isArray(stored.goals) ? stored.goals.slice(0, MAX_GOALS) : [];
  const facts = Array.isArray(stored.facts) ? stored.facts.slice(0, MAX_FACTS) : [];

  if (!risk_tolerance && goals.length === 0 && facts.length === 0) return null;
  return { risk_tolerance, goals, facts };
}

/** Apply a `memory_write` ui_payload from the backend. Idempotent: the same
 *  fact written twice is stored once. */
export function applyMemoryWrite(payload) {
  if (!payload || typeof payload !== "object") return;
  const category = String(payload.category || "").toLowerCase();
  const value = String(payload.value || "").trim().slice(0, MAX_LEN);
  if (!value) return;

  const current = _readRaw() || { goals: [], facts: [] };
  current.goals = Array.isArray(current.goals) ? current.goals : [];
  current.facts = Array.isArray(current.facts) ? current.facts : [];

  if (category === "risk_tolerance") {
    const v = value.toLowerCase();
    if (["conservative", "balanced", "aggressive"].includes(v)) {
      current.risk_tolerance = v;
    }
  } else if (category === "goal") {
    if (!current.goals.includes(value)) {
      current.goals = [value, ...current.goals].slice(0, MAX_GOALS);
    }
  } else if (category === "fact") {
    if (!current.facts.includes(value)) {
      current.facts = [value, ...current.facts].slice(0, MAX_FACTS);
    }
  }

  _writeRaw(current);
}

/** UI-friendly read for displaying what the tutor knows about you. */
export function loadStoredUserProfile() {
  return _readRaw();
}

/** Reset everything the tutor has learned. Used by a future "forget me" button. */
export function clearStoredUserProfile() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
