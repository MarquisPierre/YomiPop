import { afterEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError } from "./gemini.js";
import { findImages } from "./images.js";

// Describes one photo the fake Unsplash sends back.
const PHOTO = {
  width: 1200,
  height: 800,
  urls: { raw: "https://images.unsplash.com/photo-1?ixid=abc" },
  user: { name: "Jane Doe" },
  links: { download_location: "https://api.unsplash.com/photos/1/download" },
};

// Makes fetch answer like Gemini and Unsplash, and returns it so tests can see what was asked.
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
    return new Response(JSON.stringify({ results: [PHOTO] }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

// Finds the Unsplash search the code made.
function unsplashSearch(fetch: ReturnType<typeof fakeServices>): string {
  const call = fetch.mock.calls.find(([url]) =>
    String(url).includes("api.unsplash.com"),
  );
  return new URL(String(call?.[0])).searchParams.get("query") ?? "";
}

describe("findImages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("searches Unsplash with the words Gemini picked", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    const fetch = fakeServices("black cat");
    await findImages("猫", "cat");
    expect(unsplashSearch(fetch)).toBe("black cat");
  });

  it("searches by the meaning when Gemini fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    const fetch = fakeServices(null);
    await findImages("猫", "cat");
    expect(unsplashSearch(fetch)).toBe("cat");
  });

  it("returns 512 px WebP photos with their credit", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    fakeServices("cat");
    expect(await findImages("猫", "cat")).toEqual([
      {
        url: "https://images.unsplash.com/photo-1?ixid=abc&w=512&fm=webp&q=80",
        width: 1200,
        height: 800,
        attribution: "Photo by Jane Doe on Unsplash",
        downloadLocation: "https://api.unsplash.com/photos/1/download",
      },
    ]);
  });

  it("says images are unavailable when there's no Unsplash key", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
    await expect(findImages("猫", "cat")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });
});
