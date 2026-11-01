// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { readAround } from "./getTextAtPoint";

// Puts the HTML on the page and reads around the first place the word appears.
function readAt(html: string, word: string) {
  document.body.innerHTML = html;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const offset = text.data.indexOf(word);
    if (offset !== -1) return readAround(text, offset);
  }
  throw new Error(`${word} isn't in the HTML`);
}

describe("readAround", () => {
  it("reads a sentence in a single piece of text", () => {
    expect(readAt("<p>今日は晴れです。公園で猫を見ました。</p>", "猫")).toEqual(
      {
        text: "猫を見ました。",
        sentence: "公園で猫を見ました。",
      },
    );
  });

  it("joins a sentence split by a link", () => {
    const html =
      "<p>前文です。日本では<a href='#'>憲法</a>において日本語を用いることが規定され、</p>";
    expect(readAt(html, "用いる").sentence).toBe(
      "日本では憲法において日本語を用いることが規定され、",
    );
  });

  it("finds a word split by bold text", () => {
    expect(readAt("<p>新しい<b>勉</b>強を始めた。</p>", "新しい").text).toBe(
      "新しい勉強を始めた。",
    );
  });

  it("leaves out furigana", () => {
    const html =
      "<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>を勉強する。</p>";
    expect(readAt(html, "漢字")).toEqual({
      text: "漢字を勉強する。",
      sentence: "漢字を勉強する。",
    });
  });

  it("stops at the edge of the paragraph", () => {
    const html = "<p>前の段落</p><p>次の段落の猫</p><p>後の段落</p>";
    expect(readAt(html, "猫").sentence).toBe("次の段落の猫");
  });

  it("stops at a line break", () => {
    expect(readAt("<p>一行目<br>二行目の猫</p>", "猫").sentence).toBe(
      "二行目の猫",
    );
  });
});
