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

// Reads the text aloud in Japanese, cutting off anything still being read.
// When the voice list isn't ready yet, the browser picks a Japanese voice itself.
export function speak(text: string): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  const voice = findJapaneseVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// Shows a speaker button that reads the text aloud.
export function SpeakButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label}
      title={label}
      className="rounded-md px-1 text-base text-zinc-500 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-900"
    >
      🔊
    </button>
  );
}
