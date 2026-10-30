import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import type { Grade } from "ts-fsrs";
import { auth } from "../auth.js";
import { prisma } from "../db.js";
import { fromSchedulerCard, scheduler, toSchedulerCard } from "../scheduler.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

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

// Describes the fields a card edit can change.
type CardChanges = Partial<Pick<NewCard, "word" | "reading" | "meanings">>;

// Checks card edits. Only the word, reading and meanings can change, never the schedule.
const cardChangesSchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    word: { type: "string", minLength: 1 },
    reading: { type: "string" },
    meanings: { type: "array", items: { type: "string" }, minItems: 1 },
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
  app.decorateRequest("userId", "");

  // Rejects requests from anyone who isn't logged in, and remembers who's asking.
  app.addHook("preHandler", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) return reply.code(401).send({ message: "Not logged in" });
    request.userId = session.user.id;
  });

  // Lists the user's cards, newest first.
  app.get("/cards", async (request) => {
    return prisma.card.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "desc" },
    });
  });

  // Saves a new card, unless the user already saved its dictionary entry.
  app.post<{ Body: NewCard }>(
    "/cards",
    { schema: { body: newCardSchema } },
    async (request, reply) => {
      const { userId } = request;
      const { entryId } = request.body;
      if (
        entryId &&
        (await prisma.card.findUnique({
          where: { userId_entryId: { userId, entryId } },
        }))
      ) {
        return reply.code(409).send({ message: "Card already saved" });
      }

      const card = await prisma.card.create({
        data: { ...request.body, userId },
      });
      return reply.code(201).send(card);
    },
  );

  // Changes a card's word, reading or meanings.
  app.patch<{ Params: { id: string }; Body: CardChanges }>(
    "/cards/:id",
    { schema: { body: cardChangesSchema } },
    async (request, reply) => {
      const where = { id: request.params.id, userId: request.userId };
      if (!(await prisma.card.findFirst({ where }))) {
        return reply.code(404).send({ message: "Card not found" });
      }
      return prisma.card.update({
        where: { id: request.params.id },
        data: request.body,
      });
    },
  );

  // Deletes a card and its review history.
  app.delete<{ Params: { id: string } }>(
    "/cards/:id",
    async (request, reply) => {
      const { count } = await prisma.card.deleteMany({
        where: { id: request.params.id, userId: request.userId },
      });
      if (count === 0) {
        return reply.code(404).send({ message: "Card not found" });
      }
      return reply.code(204).send();
    },
  );

  // Lists the user's cards that are due now, oldest first.
  app.get("/cards/due", async (request) => {
    return prisma.card.findMany({
      where: { userId: request.userId, dueAt: { lte: new Date() } },
      orderBy: { dueAt: "asc" },
    });
  });

  // Records an answer and schedules the card's next review.
  app.post<{ Params: { id: string }; Body: { rating: Grade } }>(
    "/cards/:id/review",
    { schema: { body: reviewSchema } },
    async (request, reply) => {
      const card = await prisma.card.findFirst({
        where: { id: request.params.id, userId: request.userId },
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
