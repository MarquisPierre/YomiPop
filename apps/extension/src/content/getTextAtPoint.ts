// Limits how much text is read past the cursor.
const MAX_TEXT_LENGTH = 20;

// Returns the text starting at the character under the point, or null.
export function getTextAtPoint(x: number, y: number): string | null {
  const position = document.caretPositionFromPoint(x, y);
  if (!position || !(position.offsetNode instanceof Text)) return null;

  const node = position.offsetNode;
  let offset = position.offset;

  // Steps back one character when the caret lands just after the hovered one.
  if (!isPointOnCharacter(node, offset, x, y)) {
    offset -= 1;
    if (offset < 0 || !isPointOnCharacter(node, offset, x, y)) return null;
  }

  return node.data.slice(offset, offset + MAX_TEXT_LENGTH);
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
