import type { FastifyInstance } from "fastify";
import type { Grade } from "ts-fsrs";
import { getDefaultDeck } from "../decks.js";
import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireUser } from "../requireUser.js";
import { reportImageUse } from "../services/ai/images.js";
import {
  fromSchedulerCard,
  restoreSchedule,
  saveSchedule,
  scheduler,
  toSchedulerCard,
} from "../scheduler.js";
import {
  isTimeZone,
  NEW_CARD,
  newCardsLeftToday,
  reviewQuerySchema,
  type ReviewQuery,
} from "../today.js";

// Describes the body of a request to add a card.
// Describes a picture chosen for a new card.
interface NewImage {
  url: string;
  attribution: string;
  width?: number;
  height?: number;
  // Holds the address Unsplash asks us to visit when the photo is picked. It isn't stored.
  downloadLocation?: string;
}

interface NewCard {
  word: string;
  reading: string;
  meanings: string[];
  entryId?: string;
  sentence?: string | null;
  translation?: string | null;
  deckId?: string;
  image?: NewImage;
}

// Picks out the picture fields to send with each card.
const CARD_IMAGE = {
  image: { select: { url: true, attribution: true } },
} as const;

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
    sentence: { type: ["string", "null"], maxLength: 300 },
    translation: { type: ["string", "null"], maxLength: 500 },
    deckId: { type: "string" },
    image: {
      type: "object",
      required: ["url", "attribution"],
      additionalProperties: false,
      properties: {
        // Only accepts Unsplash pictures, the one image source the app uses.
        // Unsplash image links are long, so this allows up to 1000 characters.
        url: {
          type: "string",
          maxLength: 1000,
          pattern: "^https://images\\.unsplash\\.com/",
        },
        attribution: { type: "string", maxLength: 200 },
        width: { type: "integer" },
        height: { type: "integer" },
        // Only accepts Unsplash's own "photo was picked" address.
        downloadLocation: {
          type: "string",
          maxLength: 500,
          pattern: "^https://api\\.unsplash\\.com/",
        },
      },
    },
  },
} as const;

// Describes the fields a card edit can change.
type CardChanges = Partial<
  Pick<
    NewCard,
    "word" | "reading" | "meanings" | "sentence" | "translation" | "deckId"
  >
> & {
  imageId?: null;
};

// Checks card edits. The word, reading, meanings, sentence, translation and deck can change, never the schedule.
const cardChangesSchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    word: { type: "string", minLength: 1 },
    reading: { type: "string" },
    meanings: { type: "array", items: { type: "string" }, minItems: 1 },
    sentence: { type: ["string", "null"], maxLength: 300 },
    translation: { type: ["string", "null"], maxLength: 500 },
    deckId: { type: "string" },
    // Removes the card's picture. Null is the only value allowed.
    imageId: { type: "null" },
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

// Returns the day before a "YYYY-MM-DD" date, in the same format.
function dayBefore(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Counts the days in a row with reviews, ending today, or yesterday if today has none yet.
function countStreak(reviewDays: Set<string>, today: string): number {
  let day = reviewDays.has(today) ? today : dayBefore(today);
  let streak = 0;
  while (reviewDays.has(day)) {
    streak++;
    day = dayBefore(day);
  }
  return streak;
}

// Adds the card routes to the server.
export async function cardRoutes(app: FastifyInstance): Promise<void> {
  // Makes every card route require a logged-in user.
  requireUser(app);

  // Lists the user's cards, newest first.
  app.get("/cards", async (request) => {
    return prisma.card.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "desc" },
      include: CARD_IMAGE,
    });
  });

  // Lists the dictionary entries the user has saved, so the extension can mark them.
  app.get("/cards/saved-entries", async (request) => {
    const cards = await prisma.card.findMany({
      where: { userId: request.userId, entryId: { not: null } },
      select: { entryId: true },
    });
    return cards.map((card) => card.entryId);
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

      // Puts the card in the chosen deck, or the Default deck when none is given.
      // A deck that isn't the user's is refused, rather than quietly saving somewhere else.
      const deck = request.body.deckId
        ? await prisma.deck.findFirst({
            where: { id: request.body.deckId, userId },
          })
        : await getDefaultDeck(userId);
      if (!deck) return reply.code(400).send({ message: "Unknown deck" });

      // Saves the picture first, then the card pointing to it, together so neither is left half-saved.
      const { image, ...fields } = request.body;
      // Keeps the Unsplash "picked" address out of the database; it's only reported.
      const downloadLocation = image?.downloadLocation;
      const card = await prisma.$transaction(async (tx) => {
        const media = image
          ? await tx.media.create({
              data: {
                url: image.url,
                attribution: image.attribution,
                width: image.width,
                height: image.height,
                userId,
                source: "search",
              },
            })
          : null;
        return tx.card.create({
          data: {
            ...fields,
            userId,
            deckId: deck.id,
            imageId: media?.id ?? null,
          },
          include: CARD_IMAGE,
        });
      });
      // Tells Unsplash the photo was picked, without making the save wait.
      if (downloadLocation) void reportImageUse(downloadLocation);
      return reply.code(201).send(card);
    },
  );

  // Changes a card's word, reading, meanings, sentence, translation or deck.
  app.patch<{ Params: { id: string }; Body: CardChanges }>(
    "/cards/:id",
    { schema: { body: cardChangesSchema } },
    async (request, reply) => {
      const { userId } = request;
      const where = { id: request.params.id, userId };
      if (!(await prisma.card.findFirst({ where }))) {
        return reply.code(404).send({ message: "Card not found" });
      }
      // Refuses a move to a deck that isn't the user's.
      const { deckId } = request.body;
      if (
        deckId &&
        !(await prisma.deck.findFirst({ where: { id: deckId, userId } }))
      ) {
        return reply.code(400).send({ message: "Unknown deck" });
      }
      return prisma.card.update({
        where: { id: request.params.id },
        data: request.body,
        include: CARD_IMAGE,
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

  // Lists the cards to review now: every started card that's due, oldest first,
  // then brand-new cards, oldest saved first, up to what's left of today's limit.
  app.get<{ Querystring: ReviewQuery }>(
    "/cards/due",
    { schema: { querystring: reviewQuerySchema } },
    async (request, reply) => {
      const { userId } = request;
      const { timeZone, deckId } = request.query;
      if (!isTimeZone(timeZone)) {
        return reply.code(400).send({ message: "Unknown time zone" });
      }

      // Narrows the review to one deck when the user picked one.
      const inDeck = deckId ? { deckId } : {};
      const started = await prisma.card.findMany({
        where: {
          userId,
          ...inDeck,
          state: { not: NEW_CARD },
          dueAt: { lte: new Date() },
        },
        orderBy: { dueAt: "asc" },
        include: CARD_IMAGE,
      });
      const fresh = await prisma.card.findMany({
        where: { userId, ...inDeck, state: NEW_CARD },
        orderBy: { createdAt: "asc" },
        take: await newCardsLeftToday(userId, timeZone),
        include: CARD_IMAGE,
      });
      return [...started, ...fresh];
    },
  );

  // Counts cards due now and later today, reviews today, and the review streak.
  // Days are counted in the user's time zone, since the server runs on UTC.
  // Due counts follow the chosen deck; reviews today and the streak cover all decks.
  app.get<{ Querystring: ReviewQuery }>(
    "/cards/stats",
    { schema: { querystring: reviewQuerySchema } },
    async (request, reply) => {
      const { userId } = request;
      const { timeZone, deckId } = request.query;
      if (!isTimeZone(timeZone)) {
        return reply.code(400).send({ message: "Unknown time zone" });
      }

      // Dates are stored in UTC without a zone, so they're tagged as UTC before converting.
      // Counting always returns exactly one row.
      const [counts] = await prisma.$queryRaw<
        {
          today: string;
          dueNow: bigint;
          newCards: bigint;
          laterToday: bigint;
        }[]
      >`
        SELECT
          to_char(now() AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS today,
          count(*) FILTER (WHERE "dueAt" <= now() AT TIME ZONE 'UTC' AND state <> ${NEW_CARD}) AS "dueNow",
          count(*) FILTER (WHERE state = ${NEW_CARD}) AS "newCards",
          count(*) FILTER (
            WHERE "dueAt" > now() AT TIME ZONE 'UTC'
              AND "dueAt" < (((now() AT TIME ZONE ${timeZone})::date + 1)::timestamp AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC'
          ) AS "laterToday"
        FROM "Card"
        WHERE "userId" = ${userId}
        ${deckId ? Prisma.sql`AND "deckId" = ${deckId}` : Prisma.empty}
      `;
      const days = await prisma.$queryRaw<{ day: string; reviews: bigint }[]>`
        SELECT
          to_char("reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
          count(*) AS reviews
        FROM "Review"
        JOIN "Card" ON "Card".id = "Review"."cardId"
        WHERE "Card"."userId" = ${userId}
        GROUP BY day
      `;

      if (!counts) throw new Error("Stats query returned no row");
      const today = counts.today;
      // Adds the new cards the review will actually bring in today, not all of them.
      const newToday = Math.min(
        Number(counts.newCards),
        await newCardsLeftToday(userId, timeZone),
      );
      return {
        dueNow: Number(counts.dueNow) + newToday,
        laterToday: Number(counts.laterToday),
        reviewedToday: Number(
          days.find((row) => row.day === today)?.reviews ?? 0,
        ),
        streak: countStreak(new Set(days.map((row) => row.day)), today),
      };
    },
  );

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
            previousState: saveSchedule(card),
          },
        }),
      ]);
      return updated;
    },
  );

  // Takes back the user's most recent answer, putting the card's schedule back as it was.
  // Only the latest answer can be undone, so older ones can't be changed out of order.
  app.post<{ Params: { id: string } }>(
    "/cards/:id/undo",
    async (request, reply) => {
      const latest = await prisma.review.findFirst({
        where: { card: { userId: request.userId } },
        orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      });
      if (!latest || latest.cardId !== request.params.id) {
        return reply
          .code(409)
          .send({ message: "Only your last answer can be undone" });
      }
      if (!latest.previousState) {
        return reply
          .code(409)
          .send({ message: "That answer was given before undo existed" });
      }

      const [restored] = await prisma.$transaction([
        prisma.card.update({
          where: { id: latest.cardId },
          data: restoreSchedule(
            latest.previousState as Parameters<typeof restoreSchedule>[0],
          ),
        }),
        prisma.review.delete({ where: { id: latest.id } }),
      ]);
      return restored;
    },
  );
}
