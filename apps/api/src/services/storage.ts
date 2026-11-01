// Means file storage isn't set up, or refused the file.
export class StorageUnavailableError extends Error {}

// Uploads a file to a public Supabase bucket and returns its public link.
// The secret key stays on the server; browsers only ever get the public link.
export async function uploadPublicFile(
  bucket: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  // Reads the settings when used, so tests can supply fake ones.
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageUnavailableError("Supabase isn't set up");
  }
  const base = SUPABASE_URL.replace(/\/$/, "");

  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": contentType,
      // Replaces a file already at that path, e.g. if a first upload half-failed.
      "x-upsert": "true",
    },
    // Passes the bytes as a plain array, the form fetch's types accept.
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new StorageUnavailableError(`Supabase answered ${response.status}`);
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
