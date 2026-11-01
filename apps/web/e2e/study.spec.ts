import { expect, test } from "@playwright/test";
import { saveCard, signUpAndSignIn } from "./helpers";

test("signs up, saves a card, studies it, and sees it come back later", async ({
  page,
}) => {
  await signUpAndSignIn(page, "Eve");
  await saveCard(page, "猫", "ねこ", "cat");

  // Starts reviewing from the Decks page, like a person would.
  await page.goto("/decks");
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByText("猫").first()).toBeVisible();

  // Shows the answer with Space and answers Good with 3.
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("listitem").filter({ hasText: "cat" }),
  ).toBeVisible();
  await page.keyboard.press("3");
  await expect(page.getByText("All done for now")).toBeVisible();

  // Checks the card is now scheduled for later, not due now.
  await page.goto("/cards");
  await expect(page.getByText(/^in \d+ (min|h|days)$/)).toBeVisible();
});
