import { afterEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError } from "./gemini.js";
import { findImages } from "./images.js";

// Describes one photo the fake Pexels sends back.
const PHOTO = {
  width: 1200,
  height: 800,
  photographer: "Jane Doe",
  src: { medium: "https://images.pexels.com/photos/1/cat.jpeg?h=350" },
};

// Makes fetch answer like Gemini and Pexels, and returns it so tests can see what was asked.
// Gemini's search words are the given query, or it fails when the query is null.
function fakeServices(query: string | null) {
  const fetch = vi.fn(async (url: string | URL | Request) => {
    if (String(url).includes("generativelanguage")) {
      if (query === null) return new Response("{}", { status: 500 });
      const text = JSON.stringify({ query });
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
      );
    }
    return new Response(JSON.stringify({ photos: [PHOTO] }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

// Finds the Pexels search the code made.
function pexelsSearch(fetch: ReturnType<typeof fakeServices>): string {
  const call = fetch.mock.calls.find(([url]) =>
    String(url).includes("api.pexels.com"),
  );
  return new URL(String(call?.[0])).searchParams.get("query") ?? "";
}

describe("findImages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("searches Pexels with the words Gemini picked", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("PEXELS_API_KEY", "test-key");
    const fetch = fakeServices("black cat");
    await findImages("猫", "cat");
    expect(pexelsSearch(fetch)).toBe("black cat");
  });

  it("searches by the meaning when Gemini fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("PEXELS_API_KEY", "test-key");
    const fetch = fakeServices(null);
    await findImages("猫", "cat");
    expect(pexelsSearch(fetch)).toBe("cat");
  });

  it("returns medium-size photos with their credit", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("PEXELS_API_KEY", "test-key");
    fakeServices("cat");
    expect(await findImages("猫", "cat")).toEqual([
      {
        url: PHOTO.src.medium,
        width: 1200,
        height: 800,
        attribution: "Photo by Jane Doe on Pexels",
      },
    ]);
  });

  it("says images are unavailable when there's no Pexels key", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    await expect(findImages("猫", "cat")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });
});
