import { execSync } from "node:child_process";
import pg from "pg";

// Brings the test database up to date and empties it, so every run starts the same.
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL!;
  execSync("npx prisma migrate deploy", {
    cwd: "../api",
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  const client = new pg.Client(url);
  await client.connect();
  await client.query(`TRUNCATE "user", "verification", "AiCache" CASCADE`);
  await client.end();
}
