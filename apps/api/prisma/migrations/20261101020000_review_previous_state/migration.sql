-- Saves each card's schedule before an answer, so the answer can be undone. Older reviews have none.
ALTER TABLE "Review" ADD COLUMN "previousState" JSONB;
