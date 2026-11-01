import { AiUnavailableError } from "./gemini.js";

// Names the AI voice, a calm one. Changing it makes new audio, since saved audio is kept per voice.
export const VOICE = "Kore";

// Caps how much text one request reads aloud: a word or one sentence.
export const MAX_SPEECH_LENGTH = 300;

// Asks Gemini to read Japanese text aloud and returns the audio as a WAV file.
// The key stays on the server, as the build plan requires.
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  // Reads the settings when used, so tests can supply fake ones.
  const { GEMINI_API_KEY, GEMINI_TTS_MODEL = "gemini-3.8-flash-tts" } =
    process.env;
  if (!GEMINI_API_KEY) throw new AiUnavailableError("GEMINI_API_KEY isn't set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
          },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new AiUnavailableError(`Gemini answered ${response.status}`);
  }

  const body = await response.json();
  const audio = body.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audio?.data) throw new AiUnavailableError("Gemini sent no audio");

  const bytes = Buffer.from(audio.data, "base64");
  // Some voice models send bare sound without a WAV header; adds one so browsers can play it.
  if (String(audio.mimeType).startsWith("audio/wav")) return bytes;
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000);
  return wrapAsWav(bytes, rate);
}

// Puts a WAV header in front of bare 16-bit mono sound, so it plays as a normal file.
export function wrapAsWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // size of the format section
  header.writeUInt16LE(1, 20); // plain, uncompressed sound
  header.writeUInt16LE(1, 22); // one channel
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per sample
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
