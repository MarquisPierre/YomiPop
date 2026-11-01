-- Adds the English translation of a card's sentence. Older cards have none.
ALTER TABLE "Card" ADD COLUMN "translation" TEXT;
