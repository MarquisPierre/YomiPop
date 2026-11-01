import { prisma } from "./db.js";

// Returns the user's oldest deck, making a "Default" one if they have none yet.
// New accounts start with no decks, so this is where their first one comes from.
export async function getDefaultDeck(userId: string) {
  const oldest = await prisma.deck.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (oldest) return oldest;
  // Uses upsert, so two requests at once can't make two Default decks.
  return prisma.deck.upsert({
    where: { userId_name: { userId, name: "Default" } },
    create: { userId, name: "Default" },
    update: {},
  });
}
