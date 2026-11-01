import { buildApp } from "../src/app.js";
import { auth } from "../src/auth.js";
import { prisma } from "../src/db.js";
import { TEST_DATABASE_URL } from "./testEnv.js";

// Says whether there's a test database; tests that need one are skipped without it.
export const hasTestDatabase = Boolean(TEST_DATABASE_URL);

// Holds the API, built once and called with fake requests through Fastify's inject.
export const app = buildApp({ logger: false });

// Describes a signed-in test user and the headers that prove who they are.
export interface TestUser {
  id: string;
  headers: { authorization: string };
}

// Empties every table, so each test starts from nothing. Deleting users also deletes
// their sessions, decks, cards, reviews, pictures and AI usage.
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "user", "verification", "AiCache" CASCADE`,
  );
}

// Makes a verified user and signs them in, the same way the website does.
export async function signUp(name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}@example.com`;
  const password = "test-password-123";
  const { user } = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password },
  });
  return {
    id: user.id,
    headers: {
      authorization: `Bearer ${response.headers["set-auth-token"]}`,
    },
  };
}

// Saves a card for the user, optionally in a given deck, and returns it.
export async function addCard(user: TestUser, word: string, deckId?: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/cards",
    headers: user.headers,
    payload: {
      word,
      reading: "",
      meanings: ["test"],
      ...(deckId ? { deckId } : {}),
    },
  });
  return response.json<{ id: string; deckId: string }>();
}
