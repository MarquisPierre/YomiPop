import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireUser } from "../requireUser.js";

// Describes the settings a user can change.
interface Settings {
  newCardsPerDay: number;
}

// Checks setting changes. The daily limit can't go below 0 or above 9999.
const settingsSchema = {
  type: "object",
  required: ["newCardsPerDay"],
  additionalProperties: false,
  properties: {
    newCardsPerDay: { type: "integer", minimum: 0, maximum: 9999 },
  },
} as const;

// Picks out the fields that count as settings.
const SETTINGS_FIELDS = { newCardsPerDay: true } as const;

// Adds the settings routes to the server.
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  requireUser(app);

  // Returns the user's settings.
  app.get("/settings", async (request) => {
    return prisma.user.findUniqueOrThrow({
      where: { id: request.userId },
      select: SETTINGS_FIELDS,
    });
  });

  // Changes the user's settings and returns them.
  app.patch<{ Body: Settings }>(
    "/settings",
    { schema: { body: settingsSchema } },
    async (request) => {
      return prisma.user.update({
        where: { id: request.userId },
        data: request.body,
        select: SETTINGS_FIELDS,
      });
    },
  );
}
