import { describe, expect, it } from "vitest";
import { pathFromLegacyHash, redirectLegacyHashLocation } from "./routing";

describe("pathFromLegacyHash", () => {
  it("maps hash roster bookmarks onto /player paths", () => {
    expect(pathFromLegacyHash("#/roster/abc")).toBe("/player/abc");
    expect(pathFromLegacyHash("#/fall-ball")).toBe("/fall-ball");
    expect(pathFromLegacyHash("#/schedule/game-1")).toBe("/schedule/game-1");
    expect(pathFromLegacyHash("#/")).toBe("/");
    expect(pathFromLegacyHash("")).toBeNull();
  });
});

describe("redirectLegacyHashLocation", () => {
  it("replaces the URL when a legacy hash is present", () => {
    let replaced = "";
    const next = redirectLegacyHashLocation(
      { hash: "#/news/story-1", search: "", pathname: "/" },
      (url) => {
        replaced = url;
      },
    );
    expect(next).toBe("/news/story-1");
    expect(replaced).toBe("/news/story-1");
  });
});
