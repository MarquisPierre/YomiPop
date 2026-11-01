-- Creates decks, so cards can be grouped and reviewed a group at a time.
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Deck_userId_name_key" ON "Deck"("userId", "name");
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gives every existing account a "Default" deck, with a random ID like the ones Prisma makes.
INSERT INTO "Deck" ("id", "userId", "name")
SELECT 'deck' || md5(random()::text || "id"), "id", 'Default' FROM "user";

-- Puts every existing card into its owner's Default deck, then makes a deck required.
ALTER TABLE "Card" ADD COLUMN "deckId" TEXT;
UPDATE "Card" SET "deckId" = "Deck"."id" FROM "Deck" WHERE "Deck"."userId" = "Card"."userId";
ALTER TABLE "Card" ALTER COLUMN "deckId" SET NOT NULL;
CREATE INDEX "Card_deckId_idx" ON "Card"("deckId");
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey"
    FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
