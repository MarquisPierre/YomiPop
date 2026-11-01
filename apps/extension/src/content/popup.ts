import type { DictionaryEntry, WordMatch } from "../dictionary/types";

// Sets the gap between the cursor and the pop-up.
const CURSOR_OFFSET = 12;

// Sets how many entries the pop-up shows at once.
const MAX_ENTRIES = 3;

// Styles the pop-up. The shadow root keeps the page's CSS out.
const STYLES = `
  .popup {
    position: fixed;
    z-index: 2147483647;
    max-width: 320px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #1f2328;
    color: #f0f3f6;
    font: 14px/1.4 system-ui, sans-serif;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }
  .number { margin-right: 8px; color: #9fb3c8; font-size: 12px; }
  .word { font-size: 22px; font-weight: 600; }
  .reasons { font-size: 12px; color: #9fb3c8; }
  .reading { margin-left: 8px; color: #9fb3c8; }
  .saved { margin-left: 8px; color: #7ee787; font-size: 12px; }
  .meanings { margin: 6px 0 0; padding-left: 18px; }
  .entry + .entry { margin-top: 10px; padding-top: 10px; border-top: 1px solid #3a4048; }
  .status { margin-top: 8px; padding-top: 6px; border-top: 1px solid #3a4048; font-size: 12px; color: #9fb3c8; }
`;

let popup: HTMLDivElement | null = null;
let status: HTMLDivElement | null = null;
let shownEntries: DictionaryEntry[] = [];

// Builds the pop-up once and attaches it to the page.
function createPopup(): HTMLDivElement {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;

  const element = document.createElement("div");
  element.className = "popup";
  element.setAttribute("role", "tooltip");
  element.hidden = true;

  shadow.append(style, element);
  document.documentElement.append(host);
  return element;
}

// Shows the matches next to the given point.
export function showPopup(matches: WordMatch[], x: number, y: number): void {
  popup ??= createPopup();
  const shown = matches.slice(0, MAX_ENTRIES);
  shownEntries = shown.map((match) => match.entry);

  status = document.createElement("div");
  status.className = "status";
  status.textContent =
    shown.length > 1 ? `A or 1–${shown.length} to save` : "A to save";

  const numbered = shown.length > 1;
  popup.replaceChildren(
    ...shown.map((match, index) =>
      renderMatch(match, numbered ? index + 1 : null),
    ),
    status,
  );
  popup.hidden = false;
  positionPopup(popup, x, y);
}

// Replaces the footer text, e.g. after saving a card.
export function setPopupStatus(text: string): void {
  if (status) status.textContent = text;
}

// Lists the entries on screen, or none if the pop-up is hidden.
export function getShownEntries(): DictionaryEntry[] {
  return popup && !popup.hidden ? shownEntries : [];
}

// Builds the number, word, reading, saved badge, conjugations and meanings for one match.
function renderMatch(
  { entry, reasons, saved }: WordMatch,
  number: number | null,
): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "entry";

  if (number !== null) {
    const label = document.createElement("span");
    label.className = "number";
    label.textContent = String(number);
    element.append(label);
  }

  const word = document.createElement("span");
  word.className = "word";
  word.lang = "ja";
  word.textContent = entry.kanji[0] ?? entry.readings[0] ?? "";

  const reading = document.createElement("span");
  reading.className = "reading";
  reading.lang = "ja";
  reading.textContent = entry.kanji.length > 0 ? (entry.readings[0] ?? "") : "";

  element.append(word, reading);

  if (saved) {
    const badge = document.createElement("span");
    badge.className = "saved";
    badge.textContent = "✓ Saved";
    element.append(badge);
  }

  if (reasons.length > 0) {
    const conjugations = document.createElement("div");
    conjugations.className = "reasons";
    conjugations.textContent = reasons.join(" · ");
    element.append(conjugations);
  }

  const meanings = document.createElement("ol");
  meanings.className = "meanings";
  for (const sense of entry.senses) {
    const item = document.createElement("li");
    item.textContent = sense.meanings.join("; ");
    meanings.append(item);
  }

  element.append(meanings);
  return element;
}

// Hides the pop-up if it's showing.
export function hidePopup(): void {
  if (popup) popup.hidden = true;
}

// Places the pop-up below and to the right of the point, flipping it to stay on screen.
function positionPopup(element: HTMLDivElement, x: number, y: number): void {
  const { width, height } = element.getBoundingClientRect();

  let left = x + CURSOR_OFFSET;
  let top = y + CURSOR_OFFSET;
  if (left + width > window.innerWidth) left = x - width - CURSOR_OFFSET;
  if (top + height > window.innerHeight) top = y - height - CURSOR_OFFSET;

  element.style.left = `${Math.max(0, left)}px`;
  element.style.top = `${Math.max(0, top)}px`;
}
