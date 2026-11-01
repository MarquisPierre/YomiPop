// Limits how much text is read past the cursor.
const MAX_TEXT_LENGTH = 20;

// Limits how far the sentence reaches on each side of the cursor.
const MAX_SENTENCE_REACH = 75;

// Matches the characters that end a sentence.
const SENTENCE_END = /[。！？!?\n]/;

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

  return {
    text: node.data.slice(offset, offset + MAX_TEXT_LENGTH),
    sentence: getSentence(node.data, offset),
  };
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
