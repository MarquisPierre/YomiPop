import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { saveCard, signUpAndSignIn } from "./helpers";

// Lists the pages to check, before and after signing in.
const SIGNED_OUT_PAGES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/privacy",
];
const SIGNED_IN_PAGES = ["/decks", "/cards", "/review", "/account"];

// Checks one page and fails on any serious or critical accessibility problem, naming each one.
async function expectNoSeriousProblems(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    // Names the elements each problem is on, so a failure says exactly what to fix.
    .map(
      (v) =>
        `${v.id}: ${v.help}, on ${v.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    );
  expect(serious, `on ${path}`).toEqual([]);
}

// Checks every page in both themes, as the build plan's accessibility section asks.
for (const theme of ["light", "dark"]) {
  test(`has no serious accessibility problems in ${theme} mode`, async ({
    page,
  }) => {
    // Picks the theme before any page loads, the way a saved choice would.
    await page.addInitScript(
      (choice) => localStorage.setItem("yomipop.theme", choice),
      theme,
    );

    for (const path of SIGNED_OUT_PAGES) {
      await expectNoSeriousProblems(page, path);
    }

    await signUpAndSignIn(page, `Axe${theme}`);
    await saveCard(page, "犬", "いぬ", "dog");
    for (const path of SIGNED_IN_PAGES) {
      await expectNoSeriousProblems(page, path);
    }
  });
}
