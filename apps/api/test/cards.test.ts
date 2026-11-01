import { beforeEach, describe, expect, it } from "vitest";
import {
  addCard,
  app,
  hasTestDatabase,
  resetDatabase,
  signUp,
  type TestUser,
} from "./helpers.js";

describe.skipIf(!hasTestDatabase)("cards belong to their owner", () => {
  let a: TestUser;
  let b: TestUser;
  let bCard: { id: string; deckId: string };

  // Starts each test with two users, where only B has a card.
  beforeEach(async () => {
    await resetDatabase();
    a = await signUp("Alice");
    b = await signUp("Bob");
    bCard = await addCard(b, "猫");
  });

  it("doesn't list another user's cards", async () => {
    await addCard(a, "犬");
    const response = await app.inject({
      url: "/api/cards",
      headers: a.headers,
    });
    expect(response.json().map((card: { word: string }) => card.word)).toEqual([
      "犬",
    ]);
  });

  it("can't edit, delete, review or undo another user's card", async () => {
    const tries = [
      {
        method: "PATCH",
        url: `/api/cards/${bCard.id}`,
        payload: { word: "x" },
      },
      { method: "DELETE", url: `/api/cards/${bCard.id}` },
      {
        method: "POST",
        url: `/api/cards/${bCard.id}/review`,
        payload: { rating: 3 },
      },
    ] as const;
    for (const attempt of tries) {
      const response = await app.inject({ ...attempt, headers: a.headers });
      expect(response.statusCode, `${attempt.method} ${attempt.url}`).toBe(404);
    }
    // Answers B's card as B, then checks A can't undo it.
    await app.inject({
      method: "POST",
      url: `/api/cards/${bCard.id}/review`,
      headers: b.headers,
      payload: { rating: 3 },
    });
    const undo = await app.inject({
      method: "POST",
      url: `/api/cards/${bCard.id}/undo`,
      headers: a.headers,
      payload: {},
    });
    expect(undo.statusCode).toBe(409);
  });

  it("can't save a card into another user's deck", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cards",
      headers: a.headers,
      payload: {
        word: "鳥",
        reading: "",
        meanings: ["bird"],
        deckId: bCard.deckId,
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("can't attach a picture from another user's upload folder", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cards",
      headers: a.headers,
      payload: {
        word: "鳥",
        reading: "",
        meanings: ["bird"],
        image: {
          url: `https://abc.supabase.co/storage/v1/object/public/card-images/${b.id}/x.webp`,
        },
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
