import { afterEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError } from "./gemini.js";
import { writeSentences } from "./sentences.js";

// Makes fetch answer like Gemini does, with the given JSON as its reply.
function fakeGemini(answer: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(answer) }] } },
            ],
          }),
          { status },
        ),
    ),
  );
}

describe("writeSentences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns complete sentences and drops broken ones", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fakeGemini({
      sentences: [
        {
          japanese: "猫が好きです。",
          reading: "ねこがすきです。",
          english: "I like cats.",
        },
        { japanese: "", reading: "", english: "missing Japanese" },
      ],
    });
    expect(await writeSentences("猫", "ねこ", "cat")).toEqual([
      {
        japanese: "猫が好きです。",
        reading: "ねこがすきです。",
        english: "I like cats.",
      },
    ]);
  });

  it("says the AI is unavailable when there's no key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(writeSentences("猫", "ねこ", "cat")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it("says the AI is unavailable when Gemini fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fakeGemini({}, 500);
    await expect(writeSentences("猫", "ねこ", "cat")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });
});
