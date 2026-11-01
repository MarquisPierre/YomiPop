import type { FastifyInstance } from "fastify";
import type { Grade } from "ts-fsrs";
import { prisma } from "../db.js";
import { requireUser } from "../requireUser.js";
import {
  fromSchedulerCard,
  restoreSchedule,
  saveSchedule,
  scheduler,
  toSchedulerCard,
} from "../scheduler.js";

// Describes the body of a request to add a card.
interface NewCard {
  word: string;
  reading: string;
  meanings: string[];
  entryId?: string;
  sentence?: string | null;
  translation?: string | null;
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
    sentence: { type: ["string", "null"], maxLength: 300 },
    translation: { type: ["string", "null"], maxLength: 500 },
  },
} as const;

// Describes the fields a card edit can change.
type CardChanges = Partial<
  Pick<NewCard, "word" | "reading" | "meanings" | "sentence" | "translation">
>;

// Checks card edits. Only the word, reading, meanings, sentence and translation can change, never the schedule.
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

// Checks requests that need the user's time zone to know when their day starts.
const timeZoneSchema = {
  type: "object",
  required: ["timeZone"],
  properties: { timeZone: { type: "string", minLength: 1 } },
} as const;

// Checks whether the text is a real time zone, like "America/New_York".
function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

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

// Marks a card that has never been answered. It's how ts-fsrs numbers the "new" state.
const NEW_CARD = 0;

// Counts how many more brand-new cards the user can start today, in their time zone.
// A card uses up a slot when it gets its first answer today; undoing that answer gives it back.
async function newCardsLeftToday(
  userId: string,
  timeZone: string,
): Promise<number> {
  const { newCardsPerDay } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { newCardsPerDay: true },
  });

  // Finds today's answers given to cards that were new at the time.
  const [row] = await prisma.$queryRaw<{ started: bigint }[]>`
    SELECT count(*) AS started
    FROM "Review"
    JOIN "Card" ON "Card".id = "Review"."cardId"
    WHERE "Card"."userId" = ${userId}
      AND ("Review"."previousState"->>'state')::int = ${NEW_CARD}
      AND ("Review"."reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date
        = (now() AT TIME ZONE ${timeZone})::date
  `;
  return Math.max(0, newCardsPerDay - Number(row?.started ?? 0));
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

  // Lists the cards to review now: every started card that's due, oldest first,
  // then brand-new cards, oldest saved first, up to what's left of today's limit.
  app.get<{ Querystring: { timeZone: string } }>(
    "/cards/due",
    { schema: { querystring: timeZoneSchema } },
    async (request, reply) => {
      const { userId } = request;
      const { timeZone } = request.query;
      if (!isTimeZone(timeZone)) {
        return reply.code(400).send({ message: "Unknown time zone" });
      }

      const started = await prisma.card.findMany({
        where: { userId, state: { not: NEW_CARD }, dueAt: { lte: new Date() } },
        orderBy: { dueAt: "asc" },
      });
      const fresh = await prisma.card.findMany({
        where: { userId, state: NEW_CARD },
        orderBy: { createdAt: "asc" },
        take: await newCardsLeftToday(userId, timeZone),
      });
      return [...started, ...fresh];
    },
  );

  // Counts cards due now and later today, reviews today, and the review streak.
  // Days are counted in the user's time zone, since the server runs on UTC.
  app.get<{ Querystring: { timeZone: string } }>(
    "/cards/stats",
    { schema: { querystring: timeZoneSchema } },
    async (request, reply) => {
      const { userId } = request;
      const { timeZone } = request.query;
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
