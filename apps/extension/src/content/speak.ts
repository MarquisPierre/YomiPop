import type { SpeechMessage } from "../messages";

let playing: HTMLAudioElement | null = null;
// Counts presses, so a slow answer for an earlier press doesn't play over a newer one.
let latestPress = 0;

// Reads the text aloud with the browser's own voice, for when the AI voice can't play.
function speakWithBrowser(text: string): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  speechSynthesis.speak(utterance);
}

// Reads Japanese text aloud with the natural AI voice, or the browser's voice when that can't play,
// e.g. when logged out, the daily limit is used up, or the page blocks outside audio.
export async function speak(text: string): Promise<void> {
  const press = ++latestPress;
  playing?.pause();
  speechSynthesis.cancel();

  const message: SpeechMessage = { type: "speech", text };
  const url: string | null = await chrome.runtime.sendMessage(message);
  if (press !== latestPress) return;
  if (url) {
    playing = new Audio(url);
    try {
      await playing.play();
      return;
    } catch {
      // The page or browser wouldn't play it, so the browser voice reads it instead.
    }
  }
  speakWithBrowser(text);
}
