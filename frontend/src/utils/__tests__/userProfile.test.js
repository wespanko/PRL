import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserProfileForRequest,
  applyMemoryWrite,
  loadStoredUserProfile,
  clearStoredUserProfile,
} from "../userProfile";

describe("userProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is known", () => {
    expect(getUserProfileForRequest()).toBeNull();
  });

  it("stores a risk_tolerance write and surfaces it on the next request", () => {
    applyMemoryWrite({ category: "risk_tolerance", value: "conservative" });
    const profile = getUserProfileForRequest();
    expect(profile).not.toBeNull();
    expect(profile.risk_tolerance).toBe("conservative");
  });

  it("rejects an invalid risk_tolerance value", () => {
    applyMemoryWrite({ category: "risk_tolerance", value: "yolo" });
    expect(getUserProfileForRequest()).toBeNull();
  });

  it("dedupes facts and prepends most recent", () => {
    applyMemoryWrite({ category: "fact", value: "Hates individual stocks" });
    applyMemoryWrite({ category: "fact", value: "Hates individual stocks" });
    applyMemoryWrite({ category: "fact", value: "Retiring in 10 years" });
    const profile = getUserProfileForRequest();
    expect(profile.facts).toEqual([
      "Retiring in 10 years",
      "Hates individual stocks",
    ]);
  });

  it("caps facts at 12 entries", () => {
    for (let i = 0; i < 20; i++) {
      applyMemoryWrite({ category: "fact", value: `fact ${i}` });
    }
    const profile = getUserProfileForRequest();
    expect(profile.facts).toHaveLength(12);
    // Most recent kept; earliest dropped.
    expect(profile.facts[0]).toBe("fact 19");
  });

  it("clearStoredUserProfile wipes the store", () => {
    applyMemoryWrite({ category: "goal", value: "Retire by 2040" });
    expect(loadStoredUserProfile()).not.toBeNull();
    clearStoredUserProfile();
    expect(loadStoredUserProfile()).toBeNull();
  });

  it("ignores empty or whitespace-only values", () => {
    applyMemoryWrite({ category: "fact", value: "   " });
    applyMemoryWrite({ category: "fact", value: "" });
    expect(getUserProfileForRequest()).toBeNull();
  });
});
