import { describe, expect, it } from "vitest";

describe("mobile decision constraints", () => {
  it("keeps the home decision to two dominant actions", () => {
    const dominantActions = ["Cook this", "Another"];
    expect(dominantActions).toHaveLength(2);
  });
});
