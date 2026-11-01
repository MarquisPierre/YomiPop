import { config } from "dotenv";

// Loads the test database's address from apps/api/.env.test, if there is one.
// Tests never read the real .env, so no real emails, AI calls or uploads can happen.
config({ path: new URL("../.env.test", import.meta.url), quiet: true });

// Holds the test database's address, or nothing when tests that need it should be skipped.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
