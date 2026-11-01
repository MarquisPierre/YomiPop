import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Loads the test database's address, shared with the API tests, from apps/api/.env.test.
config({ path: "../api/.env.test", quiet: true });
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  // Refuses to run without a test database, so these tests can never touch the real one.
  throw new Error(
    "Set TEST_DATABASE_URL (see apps/api/.env.test.example) to run the end-to-end tests.",
  );
}

// Points at the test copy of the website, on its own port so `npm run dev` can keep running.
const WEB_URL = "http://localhost:3100";

// Switches off every outside service in the test copy of the API, so the tests never send real
// emails or make real AI, picture or storage calls. Empty values win over the real .env.
const NO_OUTSIDE_SERVICES = {
  EMAIL_SCRIPT_URL: "",
  EMAIL_SCRIPT_SECRET: "",
  GEMINI_API_KEY: "",
  UNSPLASH_ACCESS_KEY: "",
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
};

export default defineConfig({
  testDir: "./e2e",
  // Runs tests one at a time, since they share one test database.
  workers: 1,
  globalSetup: "./e2e/globalSetup.ts",
  use: { ...devices["Desktop Chrome"], baseURL: WEB_URL },
  // Starts a test copy of the API and of the website, both on the test database.
  webServer: [
    {
      command: "npx tsx src/server.ts",
      cwd: "../api",
      url: "http://localhost:4100/health",
      env: {
        ...NO_OUTSIDE_SERVICES,
        PORT: "4100",
        DATABASE_URL: TEST_DATABASE_URL,
        BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters",
        BETTER_AUTH_URL: WEB_URL,
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      // Builds and serves the website the way it runs live, which takes a minute or two.
      command: "npx next build && npx next start --port 3100",
      url: WEB_URL,
      timeout: 300_000,
      env: { NEXT_DIST_DIR: ".next-e2e", API_URL: "http://localhost:4100" },
    },
  ],
});
