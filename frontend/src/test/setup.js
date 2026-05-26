import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library auto-cleanup between tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
