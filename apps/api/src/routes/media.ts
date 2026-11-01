import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { DEMO_MESSAGE, isDemoEmail } from "../demo.js";
import { requireUser } from "../requireUser.js";
import {
  createUploadLink,
  StorageUnavailableError,
} from "../services/storage.js";

// Lists what can be uploaded, and the bucket each kind goes in.
const BUCKETS = { avatar: "avatars", card: "card-images" } as const;

// Checks upload requests: which kind of picture.
const uploadSchema = {
  type: "object",
  required: ["kind"],
  additionalProperties: false,
  properties: { kind: { type: "string", enum: ["avatar", "card"] } },
} as const;

// Adds the media routes to the server.
export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  requireUser(app);

  // Gives the browser a one-time link to upload one picture to the user's own folder.
  // The file name is made here, never chosen by the browser, and always ends in .webp,
  // since the browser shrinks every picture to WebP before uploading.
  app.post<{ Body: { kind: keyof typeof BUCKETS } }>(
    "/media/upload-url",
    { schema: { body: uploadSchema } },
    async (request, reply) => {
      // Turns off uploads for the demo account, so visitors can't host files in our storage.
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true },
      });
      if (isDemoEmail(user?.email)) {
        return reply.code(403).send({ message: DEMO_MESSAGE });
      }

      const path = `${request.userId}/${randomUUID()}.webp`;
      try {
        return await createUploadLink(BUCKETS[request.body.kind], path);
      } catch (error) {
        if (!(error instanceof StorageUnavailableError)) throw error;
        reply.log.error(error, "Storage failed");
        return reply
          .code(503)
          .send({ message: "Uploads aren't available right now." });
      }
    },
  );
}
