import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./testEnv.js";

// Brings the test database up to date with every migration, once, before the tests run.
export default function setup(): void {
  if (!TEST_DATABASE_URL) {
    console.warn(
      "TEST_DATABASE_URL isn't set, so the API tests that need a database are skipped.",
    );
    return;
  }
  execSync("npx prisma migrate deploy", {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
  });
}
