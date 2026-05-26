/**
 * The only test that runs against deployed production. Loads the live URL,
 * opens the in-page tutor chat without screen-sharing, sends a question,
 * and asserts the assistant streams a non-empty response.
 *
 * Why this exists: 2026-05-25 outage was a Render cold-start that GH Actions
 * cron drifted past. Nothing in unit tests or build CI would have caught it.
 * This is the canary.
 */

import { test, expect } from "@playwright/test";

test.describe("tutor flow on production", () => {
  test("loads the app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Panko/);
    // Wordmark renders somewhere on the page.
    await expect(page.getByText(/Panko/i).first()).toBeVisible();
  });

  test("in-page tutor chat streams a reply against the live backend", async ({ page }) => {
    await page.goto("/");

    // Land on the Live Tutor surface. If the app boots into a different page,
    // a sidebar item named "Panko" routes back to it.
    const panko = page.getByRole("button", { name: /^Panko$/ }).first();
    if (await panko.isVisible().catch(() => false)) {
      await panko.click();
    }

    // New-user empty state shows three entry cards. We pick "Just ask me anything"
    // (the one that exercises /api/chat end-to-end without needing screen share).
    const justAsk = page.getByRole("button", { name: /Open the chat/i }).first();
    // If the user has a saved portfolio, they see a different empty state.
    // Either path should expose some way into the chat surface — fall back to
    // the suggested-question chip that fires send() directly.
    if (await justAsk.isVisible().catch(() => false)) {
      await justAsk.click();
    }

    // Now we should see a chat composer. Type and submit.
    const composer = page.getByPlaceholder(/What do you want to know/i).or(
      page.getByPlaceholder(/Ask anything about investing/i)
    );
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.fill("What's a Sharpe ratio in plain English?");
    await composer.press("Enter");

    // Within 90s (cold-start tolerant) we expect a non-empty assistant bubble.
    // The selector matches the assistant bubble's bg-neutral-100 class. If
    // styling changes, update this — the test should still pass on intent.
    const assistantBubbleSelector = "div.bg-neutral-100";
    await expect
      .poll(
        async () => {
          const text = await page.locator(assistantBubbleSelector).first().innerText().catch(() => "");
          return text.trim().length;
        },
        { timeout: 90_000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(10);
  });
});
