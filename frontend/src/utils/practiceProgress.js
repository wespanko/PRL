// LocalStorage-backed progress for the Practice tab.
// Shape: { xp, completedLessons: { lessonId: bestScore }, streak, lastPracticedISO }

const KEY = "panko_practice_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { xp: 0, completedLessons: {}, streak: 0, lastPracticedISO: null };
    return JSON.parse(raw);
  } catch {
    return { xp: 0, completedLessons: {}, streak: 0, lastPracticedISO: null };
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getProgress() {
  return load();
}

export function isLessonUnlocked(lessonId, lessonOrder) {
  const state = load();
  const idx = lessonOrder.findIndex((id) => id === lessonId);
  if (idx <= 0) return true;
  const prevId = lessonOrder[idx - 1];
  return state.completedLessons[prevId] != null;
}

export function isLessonCompleted(lessonId) {
  return load().completedLessons[lessonId] != null;
}

export function recordLessonComplete(lessonId, correctCount, totalCount, xpEarned) {
  const state = load();
  const prevBest = state.completedLessons[lessonId] ?? 0;
  state.completedLessons[lessonId] = Math.max(prevBest, correctCount);
  state.xp = (state.xp ?? 0) + xpEarned;

  // Streak: increment if last practiced was yesterday; reset if older; keep if today.
  const today = new Date().toISOString().slice(0, 10);
  const last = state.lastPracticedISO;
  if (!last) {
    state.streak = 1;
  } else if (last === today) {
    // already counted today
  } else {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - lastDate) / 86400000);
    state.streak = diffDays === 1 ? (state.streak ?? 0) + 1 : 1;
  }
  state.lastPracticedISO = today;
  save(state);
  return state;
}

export function resetPractice() {
  localStorage.removeItem(KEY);
}
