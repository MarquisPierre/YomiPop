import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createUploadLink,
  StorageUnavailableError,
  uploadPublicFile,
} from "./storage.js";

// Makes fetch answer like Supabase Storage with the given status, and returns it
// so tests can read the request it was given.
function fakeSupabase(status = 200) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response("{}", { status }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("uploadPublicFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uploads with the secret key and returns the public link", async () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret");
    const fetch = fakeSupabase();
    const url = await uploadPublicFile(
      "audio",
      "Kore/x.wav",
      Buffer.from("wav"),
      "audio/wav",
    );
    const [address, init] = fetch.mock.calls[0]!;
    expect(address).toBe(
      "https://abc.supabase.co/storage/v1/object/audio/Kore/x.wav",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer secret",
    );
    expect(url).toBe(
      "https://abc.supabase.co/storage/v1/object/public/audio/Kore/x.wav",
    );
  });

  it("says storage is unavailable when Supabase refuses the file", async () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret");
    fakeSupabase(400);
    await expect(
      uploadPublicFile("audio", "x.wav", Buffer.from("x"), "audio/wav"),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it("says storage is unavailable when it isn't set up", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(
      uploadPublicFile("audio", "x.wav", Buffer.from("x"), "audio/wav"),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
  });
});

describe("createUploadLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks for a signed link with the secret key and returns both links", async () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret");
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({
            url: "/object/upload/sign/avatars/u1/x.webp?token=t",
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const links = await createUploadLink("avatars", "u1/x.webp");
    const [address, init] = fetch.mock.calls[0]!;
    expect(address).toBe(
      "https://abc.supabase.co/storage/v1/object/upload/sign/avatars/u1/x.webp",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer secret",
    );
    expect(links).toEqual({
      uploadUrl:
        "https://abc.supabase.co/storage/v1/object/upload/sign/avatars/u1/x.webp?token=t",
      publicUrl:
        "https://abc.supabase.co/storage/v1/object/public/avatars/u1/x.webp",
    });
  });

  it("says storage is unavailable when it isn't set up", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(
      createUploadLink("avatars", "u1/x.webp"),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
  });
});
