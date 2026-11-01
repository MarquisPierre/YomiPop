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

// Makes a one-time link that lets a browser upload one file straight to the bucket,
// as the build plan describes, so pictures never pass through the API.
// Returns the link to upload to and the picture's public link once it's there.
export async function createUploadLink(
  bucket: string,
  path: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  // Reads the settings when used, so tests can supply fake ones.
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageUnavailableError("Supabase isn't set up");
  }
  const base = SUPABASE_URL.replace(/\/$/, "");

  const response = await fetch(
    `${base}/storage/v1/object/upload/sign/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new StorageUnavailableError(`Supabase answered ${response.status}`);
  }
  // Supabase sends back the link's path and its one-time token.
  const { url } = (await response.json()) as { url: string };
  return {
    uploadUrl: `${base}/storage/v1${url}`,
    publicUrl: `${base}/storage/v1/object/public/${bucket}/${path}`,
  };
}

// Builds the start of the public links for a bucket, to check a picture really is ours.
export function publicBucketPrefix(bucket: string): string | null {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${bucket}/` : null;
}
