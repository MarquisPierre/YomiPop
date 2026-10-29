import { describe, expect, it } from "vitest";
import { findWord } from "./fakeDictionary";

// Tests the longest-match lookup against the sample words.
describe("findWord", () => {
  // Checks that 日本語 wins over the shorter 日本 and 日.
  it("prefers the longest matching word", () => {
    expect(findWord("日本語を勉強する")?.word).toBe("日本語");
  });

  // Checks that trailing text is trimmed off until a word matches.
  it("finds a word followed by other text", () => {
    expect(findWord("勉強する")?.word).toBe("勉強");
  });

  // Checks that a word filling the whole text still matches.
  it("matches a word that fills the whole text", () => {
    expect(findWord("日本")?.word).toBe("日本");
  });

  // Checks that every field of the entry comes back.
  it("returns the full entry", () => {
    expect(findWord("本を読む")).toEqual({
      word: "本",
      reading: "ほん",
      meanings: ["book"],
    });
  });

  // Checks that conjugated forms aren't matched yet.
  it("returns undefined for conjugated forms", () => {
    expect(findWord("食べた")).toBeUndefined();
  });

  // Checks that empty text doesn't crash.
  it("returns undefined for empty text", () => {
    expect(findWord("")).toBeUndefined();
  });
});
