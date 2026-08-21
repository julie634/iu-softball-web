import { describe, expect, it } from "vitest";
import {
  COACHES_SOURCE_URL,
  SOURCED_COACHES,
  coachingStaff,
} from "./coaches";

describe("SOURCED_COACHES", () => {
  it("only includes rows from the IU Athletics coaches page", () => {
    expect(COACHES_SOURCE_URL).toBe("https://iuhoosiers.com/sports/softball/coaches");
    expect(SOURCED_COACHES.length).toBeGreaterThanOrEqual(4);
    for (const coach of SOURCED_COACHES) {
      expect(coach.name.length).toBeGreaterThan(2);
      expect(coach.title.length).toBeGreaterThan(2);
      expect(coach.source_url).toBe(COACHES_SOURCE_URL);
      expect(coach).not.toHaveProperty("bio");
    }
  });

  it("has the four verified 2027 coaching-staff names", () => {
    const names = coachingStaff(SOURCED_COACHES).map((c) => c.name);
    expect(names).toEqual([
      "Shonda Stanton",
      "Chanda Bell",
      "Kendra Kirkhoff",
      "Cassie Hendrix",
    ]);
  });
});
