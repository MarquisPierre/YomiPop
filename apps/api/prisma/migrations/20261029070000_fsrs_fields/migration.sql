-- Renames the schedule columns to match ts-fsrs, keeping existing data.
ALTER TABLE "Card" RENAME COLUMN "due" TO "dueAt";
ALTER TABLE "Card" RENAME COLUMN "lastReview" TO "lastReviewAt";
ALTER TABLE "Card" RENAME COLUMN "learningSteps" TO "learningStep";

-- Lets scheduledDays hold fractions of a day.
ALTER TABLE "Card" ALTER COLUMN "scheduledDays" SET DATA TYPE DOUBLE PRECISION;

-- Adds the fields FSRS-7 needs.
ALTER TABLE "Card" ADD COLUMN "stabilityFast" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "scheduleStatus" TEXT NOT NULL DEFAULT 'new';
