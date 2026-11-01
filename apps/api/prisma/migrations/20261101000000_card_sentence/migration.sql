-- Adds the sentence a card was saved from. Older cards have none.
ALTER TABLE "Card" ADD COLUMN "sentence" TEXT;
