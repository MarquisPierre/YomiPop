import type { FastifyInstance } from "fastify";
import { getDefaultDeck } from "../decks.js";
import { prisma } from "../db.js";
import { requireUser } from "../requireUser.js";
import {
  isTimeZone,
  NEW_CARD,
  newCardsLeftToday,
  reviewQuerySchema,
  type ReviewQuery,
} from "../today.js";

// Checks deck names: 1 to 50 characters, not just spaces.
const deckNameSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 50, pattern: "\\S" },
  },
} as const;

// Adds the deck routes to the server.
export async function deckRoutes(app: FastifyInstance): Promise<void> {
  requireUser(app);

  // Lists the user's decks, oldest first, with how many cards are due and new in each.
  // New counts are capped by what's left of today's limit, since that's all the review will show.
  app.get<{ Querystring: ReviewQuery }>(
    "/decks",
    { schema: { querystring: reviewQuerySchema } },
    async (request, reply) => {
      const { userId } = request;
      if (!isTimeZone(request.query.timeZone)) {
        return reply.code(400).send({ message: "Unknown time zone" });
      }

      // Makes sure even a brand-new account has a deck to show.
      await getDefaultDeck(userId);
      const decks = await prisma.deck.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      // Counts due and new cards per deck in one go.
      const counts = await prisma.$queryRaw<
        { deckId: string; due: bigint; fresh: bigint }[]
      >`
        SELECT "deckId",
          count(*) FILTER (WHERE state <> ${NEW_CARD} AND "dueAt" <= now() AT TIME ZONE 'UTC') AS due,
          count(*) FILTER (WHERE state = ${NEW_CARD}) AS fresh
        FROM "Card"
        WHERE "userId" = ${userId}
        GROUP BY "deckId"
      `;
      const left = await newCardsLeftToday(userId, request.query.timeZone);

      return decks.map((deck) => {
        const row = counts.find((count) => count.deckId === deck.id);
        return {
          id: deck.id,
          name: deck.name,
          due: Number(row?.due ?? 0),
          new: Math.min(Number(row?.fresh ?? 0), left),
        };
      });
    },
  );

  // Makes a new deck, unless the user already has one with that name.
  app.post<{ Body: { name: string } }>(
    "/decks",
    { schema: { body: deckNameSchema } },
    async (request, reply) => {
      const name = request.body.name.trim();
      const taken = await prisma.deck.findUnique({
        where: { userId_name: { userId: request.userId, name } },
      });
      if (taken) {
        return reply
          .code(409)
          .send({ message: "You already have a deck with that name" });
      }

      const deck = await prisma.deck.create({
        data: { userId: request.userId, name },
      });
      return reply.code(201).send(deck);
    },
  );

  // Renames a deck, unless another of the user's decks has that name.
  app.patch<{ Params: { id: string }; Body: { name: string } }>(
    "/decks/:id",
    { schema: { body: deckNameSchema } },
    async (request, reply) => {
      const { userId } = request;
      const name = request.body.name.trim();
      if (
        !(await prisma.deck.findFirst({
          where: { id: request.params.id, userId },
        }))
      ) {
        return reply.code(404).send({ message: "Deck not found" });
      }
      const taken = await prisma.deck.findUnique({
        where: { userId_name: { userId, name } },
      });
      if (taken && taken.id !== request.params.id) {
        return reply
          .code(409)
          .send({ message: "You already have a deck with that name" });
      }
      return prisma.deck.update({
        where: { id: request.params.id },
        data: { name },
      });
    },
  );

  // Deletes a deck and every card in it, unless it's the user's only deck.
  app.delete<{ Params: { id: string } }>(
    "/decks/:id",
    async (request, reply) => {
      const { userId } = request;
      if (
        !(await prisma.deck.findFirst({
          where: { id: request.params.id, userId },
        }))
      ) {
        return reply.code(404).send({ message: "Deck not found" });
      }
      if ((await prisma.deck.count({ where: { userId } })) === 1) {
        return reply.code(409).send({ message: "You need at least one deck" });
      }
      await prisma.deck.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    },
  );
}
