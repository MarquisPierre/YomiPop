import { beforeEach, describe, expect, it } from "vitest";
import {
  addCard,
  app,
  hasTestDatabase,
  resetDatabase,
  signUp,
  type TestUser,
} from "./helpers.js";

describe.skipIf(!hasTestDatabase)("decks belong to their owner", () => {
  let a: TestUser;
  let b: TestUser;
  let secret: { id: string };

  // Starts each test with two users, where B has a deck called Secret holding one card.
  beforeEach(async () => {
    await resetDatabase();
    a = await signUp("Alice");
    b = await signUp("Bob");
    const response = await app.inject({
      method: "POST",
      url: "/api/decks",
      headers: b.headers,
      payload: { name: "Secret" },
    });
    secret = response.json();
    await addCard(b, "猫", secret.id);
  });

  it("doesn't list another user's decks", async () => {
    const response = await app.inject({
      url: "/api/decks?timeZone=UTC",
      headers: a.headers,
    });
    const names = response.json().map((deck: { name: string }) => deck.name);
    expect(names).not.toContain("Secret");
  });

  it("can't rename or delete another user's deck", async () => {
    const rename = await app.inject({
      method: "PATCH",
      url: `/api/decks/${secret.id}`,
      headers: a.headers,
      payload: { name: "Mine now" },
    });
    expect(rename.statusCode).toBe(404);
    const remove = await app.inject({
      method: "DELETE",
      url: `/api/decks/${secret.id}`,
      headers: a.headers,
    });
    expect(remove.statusCode).toBe(404);
  });

  it("can't review another user's deck", async () => {
    const response = await app.inject({
      url: `/api/cards/due?timeZone=UTC&deckId=${secret.id}`,
      headers: a.headers,
    });
    expect(response.json()).toEqual([]);
  });
});
