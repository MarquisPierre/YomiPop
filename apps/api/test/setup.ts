import { vi } from "vitest";
import { TEST_DATABASE_URL } from "./testEnv.js";

// Points the API at the test database, with test-only settings, before any test file loads it.
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

// Stops sign-ups in tests from sending, or printing, verification emails.
vi.mock("../src/email.js", () => ({ sendEmail: vi.fn() }));
