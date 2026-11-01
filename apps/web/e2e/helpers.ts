import { expect, type Page } from "@playwright/test";
import pg from "pg";

// Marks a user's email as verified in the test database, since a test can't click the email's link.
async function verifyEmail(email: string): Promise<void> {
  const client = new pg.Client(process.env.TEST_DATABASE_URL);
  await client.connect();
  await client.query(
    `UPDATE "user" SET "emailVerified" = true WHERE email = $1`,
    [email],
  );
  await client.end();
}

// Signs up through the real form, verifies the email, and signs in through the real form.
export async function signUpAndSignIn(page: Page, name: string): Promise<void> {
  const email = `${name.toLowerCase()}@example.com`;
  const password = "e2e-password-123";

  await page.goto("/sign-up");
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  await verifyEmail(email);
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/review");
}

// Saves a card the way the extension does: through the API, as the signed-in user.
export async function saveCard(
  page: Page,
  word: string,
  reading: string,
  meaning: string,
): Promise<void> {
  const response = await page.request.post("/api/cards", {
    data: { word, reading, meanings: [meaning] },
  });
  expect(response.ok()).toBe(true);
}
