import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

// Lists the icon sizes Chrome and the Chrome Web Store use.
const SIZES = [16, 32, 48, 128];
const OUT_DIR = "apps/extension/public/icons";

// Builds a page with just the red 読 stamp filling the square, in the logo's rounded font.
// The stamp isn't tilted here, since a tilt blurs at 16 px.
function stampPage(size: number): string {
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=block&text=読">
<style>
  html, body { margin: 0; background: transparent; }
  .stamp {
    width: ${size}px; height: ${size}px; border-radius: ${size * 0.22}px;
    background: #c8352a; color: #fffdf8;
    display: flex; align-items: center; justify-content: center;
    font-family: "M PLUS Rounded 1c"; font-weight: 800;
    font-size: ${size * 0.66}px; line-height: 1;
  }
</style></head>
<body><div class="stamp">読</div></body></html>`;
}

// Opens the test browser, draws each size, and saves it as a PNG with see-through corners.
const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(stampPage(size), { waitUntil: "networkidle" });
  // Waits for the font, so the stamp never falls back to a plain one.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${OUT_DIR}/icon-${size}.png`,
    omitBackground: true,
  });
  console.log(`made icon-${size}.png`);
}
await browser.close();
