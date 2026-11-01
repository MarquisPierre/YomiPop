import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";

// Returns the saved result for the key, or makes it and saves it for everyone.
// Asking for fresh results skips the saved one and doesn't replace it, so others still get the first.
export async function cached<T>(
  key: string,
  make: () => Promise<T>,
  fresh: boolean,
): Promise<T> {
  if (!fresh) {
    const hit = await prisma.aiCache.findUnique({ where: { key } });
    if (hit) return hit.result as T;
  }
  const result = await make();
  if (!fresh) {
    await prisma.aiCache.upsert({
      where: { key },
      create: { key, result: result as Prisma.InputJsonValue },
      update: {},
    });
  }
  return result;
}
