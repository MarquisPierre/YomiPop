import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

// Describes the body of a request to add a card.
interface NewCard {
  word: string;
  reading: string;
  meanings: string[];
  entryId?: string;
}

// Checks new cards before they're saved.
const newCardSchema = {
  type: "object",
  required: ["word", "reading", "meanings"],
  additionalProperties: false,
  properties: {
    word: { type: "string", minLength: 1 },
    reading: { type: "string" },
    meanings: { type: "array", items: { type: "string" }, minItems: 1 },
    entryId: { type: "string" },
  },
} as const;

// Adds the card routes to the server.
export async function cardRoutes(app: FastifyInstance): Promise<void> {
  // Lists every card, newest first.
  app.get("/cards", async () => {
    return prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  });

  // Saves a new card.
  app.post<{ Body: NewCard }>(
    "/cards",
    { schema: { body: newCardSchema } },
    async (request, reply) => {
      const card = await prisma.card.create({ data: request.body });
      return reply.code(201).send(card);
    },
  );
}
