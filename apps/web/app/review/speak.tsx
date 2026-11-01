import { Volume2 } from "lucide-react";

// Finds a Japanese voice in the browser, preferring Google's, which sounds the most natural.
function findJapaneseVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis
    .getVoices()
    .filter((voice) =>
      voice.lang.toLowerCase().replace("_", "-").startsWith("ja"),
    );
  return (
    voices.find((voice) => voice.name.includes("Google")) ?? voices[0] ?? null
  );
}

// Reads the text aloud with the browser's own voice, as before. Used when the AI voice isn't available.
// When the voice list isn't ready yet, the browser picks a Japanese voice itself.
function speakWithBrowser(text: string): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  const voice = findJapaneseVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// Remembers the audio links the API gave this visit, so each text is only asked for once.
const audioLinks = new Map<string, Promise<string | null>>();

// Asks the API for the AI voice's audio of the text, or null when it can't make it right now.
function getAudioLink(text: string): Promise<string | null> {
  let link = audioLinks.get(text);
  if (!link) {
    link = fetch("/api/ai/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 300) }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { url?: string } | null) => body?.url ?? null)
      .catch(() => null);
    audioLinks.set(text, link);
    // Forgets a failed try, so a later press can try again (e.g. after the daily limit resets).
    link.then((url) => url || audioLinks.delete(text));
  }
  return link;
}

let playing: HTMLAudioElement | null = null;
// Counts presses, so a slow answer for an earlier press doesn't play over a newer one.
let latestPress = 0;

// Reads the text aloud with the natural AI voice, or the browser's voice when that isn't available.
export async function speak(text: string): Promise<void> {
  const press = ++latestPress;
  playing?.pause();
  speechSynthesis.cancel();

  const url = await getAudioLink(text);
  if (press !== latestPress) return;
  if (url) {
    playing = new Audio(url);
    try {
      await playing.play();
      return;
    } catch {
      // The browser wouldn't play it, so the browser voice reads it instead.
    }
  }
  speakWithBrowser(text);
}

// Shows a round speaker button that reads the text aloud.
export function SpeakButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label}
      title={label}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Volume2 className="size-4" aria-hidden="true" />
    </button>
  );
}
