import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config. Single deployed target: PANKO_E2E_URL env var or
 * the live Vercel URL by default. We deliberately run against prod (not
 * a local dev server) because the test exists to catch *deploy* outages
 * like the 2026-05-25 cold-start incident.
 *
 * Workers=1: we don't want N parallel browsers racing the same backend's
 * cold start. The whole suite is one or two tests anyway.
 */

const BASE = process.env.PANKO_E2E_URL || "https://prl-seven.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  // Cold-start tolerant: give the first request up to 90s to complete the
  // full backend wake + stream.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
