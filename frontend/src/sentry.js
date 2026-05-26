/**
 * Sentry frontend init. No-op unless VITE_SENTRY_DSN is set in the build
 * environment. Imported once from main.jsx before React mounts.
 *
 * Dynamic import: @sentry/react is loaded on demand only when DSN is set,
 * so dev builds without Sentry don't pay the ~50kb bundle cost.
 *
 * In Vercel: set VITE_SENTRY_DSN under Project → Settings → Environment
 * Variables. It bakes into the build, so a redeploy is needed after change.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN;

export async function initSentry() {
  if (!DSN) return;
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || undefined,
      tracesSampleRate: 0.0,        // errors only — flip on for perf when relevant
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 0.0,
    });
  } catch (err) {
    // Sentry init failure must never block the app boot.
    // eslint-disable-next-line no-console
    console.warn("[sentry] init failed:", err);
  }
}
