import { describe, expect, it } from "vitest";
import { deinflect, fitsType } from "./deinflect";
import type { DictionaryEntry } from "./types";

// Lists just the words deinflect finds for the text.
function forms(text: string): string[] {
  return deinflect(text).map((result) => result.word);
}

// Builds an entry with the given parts of speech.
function entryOfType(...partsOfSpeech: string[]): DictionaryEntry {
  return {
    id: "1",
    kanji: [],
    readings: [],
    senses: [{ partsOfSpeech, meanings: [] }],
  };
}

describe("deinflect", () => {
  it("keeps the text as written first", () => {
    expect(deinflect("食べる")[0]).toEqual({ word: "食べる", reasons: [] });
  });

  it("undoes ichidan past", () => {
    expect(forms("食べた")).toContain("食べる");
  });

  it("undoes godan past", () => {
    expect(forms("書いた")).toContain("書く");
  });

  it("undoes polite forms", () => {
    expect(forms("読みました")).toContain("読む");
  });

  it("chains negative and past", () => {
    const result = deinflect("食べなかった").find((r) => r.word === "食べる");
    expect(result?.reasons).toEqual(["negative", "past"]);
  });

  it("undoes adjective past", () => {
    expect(forms("高かった")).toContain("高い");
  });

  it("finds the noun in a suru verb", () => {
    expect(forms("勉強した")).toContain("勉強");
  });

  it("handles irregular verbs", () => {
    expect(forms("きます")).toContain("くる");
    expect(forms("行って")).toContain("行く");
  });

  it("undoes ている and てる", () => {
    expect(forms("食べている")).toContain("食べる");
    expect(forms("食べてる")).toContain("食べる");
  });

  it("undoes でいる and でる after godan verbs", () => {
    expect(forms("読んでいる")).toContain("読む");
    expect(forms("読んでる")).toContain("読む");
  });

  it("chains polite past onto ている", () => {
    const result = deinflect("食べていました").find((r) => r.word === "食べる");
    expect(result?.reasons).toEqual([
      "te-form",
      "progressive",
      "polite",
      "past",
    ]);
  });

  it("keeps a real verb ending in てる as written first", () => {
    expect(deinflect("捨てる")[0]?.word).toBe("捨てる");
  });
});

describe("fitsType", () => {
  it("matches any godan code to v5", () => {
    expect(fitsType(entryOfType("v5k"), "v5")).toBe(true);
  });

  it("rejects the wrong type", () => {
    expect(fitsType(entryOfType("v5k"), "v1")).toBe(false);
  });

  it("accepts anything when there's no type", () => {
    expect(fitsType(entryOfType("n"))).toBe(true);
  });
});
