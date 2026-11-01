import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

// Sets where your screenshots come from and where the finished store images go.
const RAW_DIR = "store/raw";
const OUT_DIR = "store/images";

// Matches each screenshot, by file name, to the caption shown above it.
const CAPTIONS: Record<string, string> = {
  "1.png": "Hover any Japanese word for its reading and meaning",
  "2.png": "Build a card with a sentence, picture and audio",
  "3.png": "Review cards right before you'd forget them",
  "4.png": "Sort your words into decks",
};

// Loads the site's fonts, only for the characters used, so the page loads fast.
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=block">`;

// Builds the 440×280 promo tile: the 読 stamp, the name and a short tagline.
function promoTile(): string {
  return `<html><head>${FONTS}<style>
    body { margin: 0; width: 440px; height: 280px; display: flex; align-items: center;
      justify-content: center; gap: 24px; background: #faf6ef; color: #2a2420;
      font-family: "M PLUS Rounded 1c"; font-weight: 800; }
    .stamp { width: 120px; height: 120px; border-radius: 28px; background: #c8352a;
      color: #fffdf8; font-size: 80px; display: flex; align-items: center;
      justify-content: center; transform: rotate(-4deg);
      box-shadow: 0 10px 24px rgba(42, 36, 32, 0.18); }
    h1 { margin: 0; font-size: 44px; }
    p { margin: 4px 0 0; font-size: 18px; color: #6b6055; }
  </style></head><body>
    <div class="stamp">読</div>
    <div><h1>YomiPop</h1><p>Hover. Save. Remember.</p></div>
  </body></html>`;
}

// Builds one 1280×800 screenshot: the caption on top and your screenshot floating below it.
function framedShot(image: string, caption: string): string {
  return `<html><head>${FONTS}<style>
    body { margin: 0; width: 1280px; height: 800px; box-sizing: border-box;
      padding: 48px 64px; display: flex; flex-direction: column; align-items: center;
      gap: 32px; background: #faf6ef; color: #2a2420;
      font-family: "M PLUS Rounded 1c"; font-weight: 800; }
    h1 { margin: 0; font-size: 40px; text-align: center; }
    /* Shrinks the screenshot to fit the space left, without stretching it. */
    img { min-height: 0; max-width: 100%; flex: 1; object-fit: contain;
      border-radius: 16px; box-shadow: 0 16px 40px rgba(42, 36, 32, 0.2); }
  </style></head><body>
    <h1>${caption}</h1>
    <img src="${image}">
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
// Makes both folders, so the first run works before any screenshots are added.
mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

// Renders a page at the given size and saves it as a PNG once the fonts have loaded.
async function render(
  html: string,
  width: number,
  height: number,
  name: string,
) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT_DIR}/${name}` });
  console.log(`made ${name}`);
}

await render(promoTile(), 440, 280, "promo-440x280.png");

// Frames each screenshot that has a caption. Embeds it as data, since the page has no files.
for (const file of readdirSync(RAW_DIR)) {
  const caption = CAPTIONS[file];
  if (!caption) continue;
  const image = `data:image/png;base64,${readFileSync(`${RAW_DIR}/${file}`).toString("base64")}`;
  await render(framedShot(image, caption), 1280, 800, `screenshot-${file}`);
}

await browser.close();
