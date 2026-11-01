import { prisma } from "./db.js";

// Checks requests that need the user's time zone, and optionally a deck.
export const reviewQuerySchema = {
  type: "object",
  required: ["timeZone"],
  properties: {
    timeZone: { type: "string", minLength: 1 },
    deckId: { type: "string", minLength: 1 },
  },
} as const;

// Describes those requests.
export interface ReviewQuery {
  timeZone: string;
  deckId?: string;
}

// Checks whether the text is a real time zone, like "America/New_York".
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Marks a card that has never been answered. It's how ts-fsrs numbers the "new" state.
export const NEW_CARD = 0;

// Counts how many more brand-new cards the user can start today, in their time zone.
// A card uses up a slot when it gets its first answer today; undoing that answer gives it back.
export async function newCardsLeftToday(
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
