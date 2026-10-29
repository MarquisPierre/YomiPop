import type { FastifyInstance } from "fastify";
import type { Grade } from "ts-fsrs";
import { prisma } from "../db.js";
import { fromSchedulerCard, scheduler, toSchedulerCard } from "../scheduler.js";

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

// Checks review answers: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
const reviewSchema = {
  type: "object",
  required: ["rating"],
  additionalProperties: false,
  properties: {
    rating: { type: "integer", enum: [1, 2, 3, 4] },
  },
} as const;

// Adds the card routes to the server.
export async function cardRoutes(app: FastifyInstance): Promise<void> {
  // Lists every card, newest first.
  app.get("/cards", async () => {
    return prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  });

  // Saves a new card, unless its dictionary entry is already saved.
  app.post<{ Body: NewCard }>(
    "/cards",
    { schema: { body: newCardSchema } },
    async (request, reply) => {
      const { entryId } = request.body;
      if (entryId && (await prisma.card.findUnique({ where: { entryId } }))) {
        return reply.code(409).send({ message: "Card already saved" });
      }

      const card = await prisma.card.create({ data: request.body });
      return reply.code(201).send(card);
    },
  );

  // Lists cards that are due now, oldest first.
  app.get("/cards/due", async () => {
    return prisma.card.findMany({
      where: { dueAt: { lte: new Date() } },
      orderBy: { dueAt: "asc" },
    });
  });

  // Records an answer and schedules the card's next review.
  app.post<{ Params: { id: string }; Body: { rating: Grade } }>(
    "/cards/:id/review",
    { schema: { body: reviewSchema } },
    async (request, reply) => {
      const card = await prisma.card.findUnique({
        where: { id: request.params.id },
      });
      if (!card) return reply.code(404).send({ message: "Card not found" });

      const now = new Date();
      const result = scheduler.review({
        card: toSchedulerCard(card),
        grade: request.body.rating,
        now,
      });

      const [updated] = await prisma.$transaction([
        prisma.card.update({
          where: { id: card.id },
          data: fromSchedulerCard(result.card),
        }),
        prisma.review.create({
          data: {
            cardId: card.id,
            rating: request.body.rating,
            reviewedAt: now,
          },
        }),
      ]);
      return updated;
    },
  );
}
