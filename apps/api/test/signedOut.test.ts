import { describe, expect, it } from "vitest";
import { app, hasTestDatabase } from "./helpers.js";

// Lists every route that needs a signed-in user, with a valid body for the POSTs,
// so they get past the input checks and reach the login check.
const ROUTES = [
  { method: "GET", url: "/api/cards" },
  { method: "GET", url: "/api/cards/due?timeZone=UTC" },
  { method: "GET", url: "/api/cards/stats?timeZone=UTC" },
  { method: "GET", url: "/api/decks?timeZone=UTC" },
  { method: "GET", url: "/api/settings" },
  { method: "POST", url: "/api/media/upload-url", payload: { kind: "card" } },
  {
    method: "POST",
    url: "/api/ai/sentences",
    payload: { word: "猫", reading: "ねこ", meaning: "cat" },
  },
  { method: "POST", url: "/api/ai/explain", payload: { sentence: "猫です。" } },
  { method: "POST", url: "/api/ai/speech", payload: { text: "猫" } },
] as const;

describe.skipIf(!hasTestDatabase)("signed-out visitors", () => {
  it("can't use any route that needs an account", async () => {
    for (const route of ROUTES) {
      const response = await app.inject(route);
      expect(response.statusCode, `${route.method} ${route.url}`).toBe(401);
    }
  });
});
