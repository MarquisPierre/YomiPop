// Limits how much text is read past the cursor.
const MAX_TEXT_LENGTH = 20;

// Limits how far the sentence reaches on each side of the cursor.
const MAX_SENTENCE_REACH = 75;

// Matches the characters that end a sentence.
const SENTENCE_END = /[。！？!?\n]/;

// Lists the tags that hold their own block of text, like a paragraph.
const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "BODY",
  "CAPTION",
  "DD",
  "DIV",
  "DT",
  "FIGCAPTION",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "P",
  "PRE",
  "SECTION",
  "TD",
  "TH",
]);

// Lists the tags whose text isn't part of the sentence: furigana and code.
const SKIPPED_TAGS = new Set(["RP", "RT", "SCRIPT", "STYLE", "TEMPLATE"]);

// Describes the text under the point and the sentence around it.
export interface TextAtPoint {
  text: string;
  sentence: string;
}

// Returns the text starting at the character under the point and its sentence, or null.
export function getTextAtPoint(x: number, y: number): TextAtPoint | null {
  const position = document.caretPositionFromPoint(x, y);
  if (!position || !(position.offsetNode instanceof Text)) return null;

  const node = position.offsetNode;
  let offset = position.offset;

  // Steps back one character when the caret lands just after the hovered one.
  if (!isPointOnCharacter(node, offset, x, y)) {
    offset -= 1;
    if (offset < 0 || !isPointOnCharacter(node, offset, x, y)) return null;
  }

  return readAround(node, offset);
}

// Reads the text from the offset onwards and the sentence around it, joining the
// pieces of the paragraph that links, bold text and furigana split it into.
export function readAround(node: Text, offset: number): TextAtPoint {
  const block = findBlock(node);
  if (classify(node, block) !== "same") {
    return {
      text: node.data.slice(offset, offset + MAX_TEXT_LENGTH),
      sentence: "",
    };
  }

  const before = collect(node, block, "back") + node.data.slice(0, offset);
  const after = node.data.slice(offset) + collect(node, block, "forward");
  return {
    text: after.slice(0, MAX_TEXT_LENGTH),
    sentence: getSentence(before + after, before.length),
  };
}

// Finds the paragraph or other block the node sits in.
function findBlock(node: Node): Element {
  let element = node.parentElement;
  while (element && !BLOCK_TAGS.has(element.tagName)) {
    element = element.parentElement;
  }
  return element ?? node.ownerDocument!.documentElement;
}

// Sorts a text piece by whether it belongs to the block's sentence, should be
// skipped like furigana, or sits in another block where reading should stop.
function classify(node: Text, block: Element): "same" | "skip" | "other" {
  for (let element = node.parentElement; element && element !== block;) {
    if (SKIPPED_TAGS.has(element.tagName)) return "skip";
    if (BLOCK_TAGS.has(element.tagName)) return "other";
    element = element.parentElement;
  }
  return "same";
}

// Gathers the block's text before or after the node, stopping at line breaks,
// other blocks or once there's enough for the sentence.
function collect(
  node: Text,
  block: Element,
  direction: "back" | "forward",
): string {
  const walker = document.createTreeWalker(
    block,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  walker.currentNode = node;

  let text = "";
  while (text.length < MAX_SENTENCE_REACH) {
    const next =
      direction === "back" ? walker.previousNode() : walker.nextNode();
    if (!next || (next instanceof Element && next.tagName === "BR")) break;
    if (!(next instanceof Text)) continue;

    const kind = classify(next, block);
    if (kind === "other") break;
    if (kind === "skip") continue;
    text = direction === "back" ? next.data + text : text + next.data;
  }
  return text;
}

// Returns the sentence around the offset, stopping at sentence ends or the reach limit.
function getSentence(data: string, offset: number): string {
  let start = offset;
  const earliest = Math.max(0, offset - MAX_SENTENCE_REACH);
  while (start > earliest && !SENTENCE_END.test(data[start - 1] ?? "")) start--;

  let end = offset;
  const latest = Math.min(data.length, offset + MAX_SENTENCE_REACH);
  while (end < latest && !SENTENCE_END.test(data[end] ?? "")) end++;
  // Keeps the 。 or ！ that ends the sentence, but not a line break.
  if (/[。！？!?]/.test(data[end] ?? "")) end++;

  return data.slice(start, end).trim();
}

// Checks whether the point is inside the character at the given offset.
function isPointOnCharacter(
  node: Text,
  offset: number,
  x: number,
  y: number,
): boolean {
  if (offset >= node.data.length) return false;

  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset + 1);
  const rect = range.getBoundingClientRect();

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
