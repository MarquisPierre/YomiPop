-- Adds each user's daily limit for new cards. Everyone starts at 20.
ALTER TABLE "user" ADD COLUMN "newCardsPerDay" INTEGER NOT NULL DEFAULT 20;
