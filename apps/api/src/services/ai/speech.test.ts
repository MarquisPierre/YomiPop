import { afterEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError } from "./gemini.js";
import { synthesizeSpeech } from "./speech.js";

// Makes fetch answer like Gemini's voice model, with the given audio, or none.
function fakeGemini(audio: { mimeType: string; bytes: Buffer } | null) {
  const inlineData = audio
    ? { mimeType: audio.mimeType, data: audio.bytes.toString("base64") }
    : undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ inlineData }] } }],
          }),
        ),
    ),
  );
}

describe("synthesizeSpeech", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("passes WAV audio straight through", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const wav = Buffer.from("RIFF....WAVEfake");
    fakeGemini({ mimeType: "audio/wav", bytes: wav });
    expect(await synthesizeSpeech("猫")).toEqual(wav);
  });

  it("adds a WAV header to bare sound, with its rate and length", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const pcm = Buffer.alloc(100, 1);
    fakeGemini({ mimeType: "audio/l16; rate=24000; channels=1", bytes: pcm });
    const wav = await synthesizeSpeech("猫");
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(40)).toBe(100);
    expect(wav.length).toBe(144);
  });

  it("says the AI is unavailable when no audio comes back", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fakeGemini(null);
    await expect(synthesizeSpeech("猫")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it("says the AI is unavailable when there's no key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(synthesizeSpeech("猫")).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });
});
