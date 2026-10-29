import { DefaultScheduler } from "ts-fsrs";
import type { Card } from "./generated/prisma/client.js";

// Schedules reviews with FSRS-7 and Anki-style learning steps.
export const scheduler = await DefaultScheduler({
  enableShortTerm: true,
  learningSteps: ["1m", "10m"],
  relearningSteps: ["10m"],
});

// Describes a card the way the scheduler sees it.
type SchedulerCard = Parameters<typeof scheduler.review>[0]["card"];

// Picks out the fields the scheduler needs from a saved card.
// The database stores state and scheduleStatus as plain values, so they're cast back.
export function toSchedulerCard(card: Card): SchedulerCard {
  return {
    cardId: card.id,
    state: card.state as SchedulerCard["state"],
    scheduleStatus: card.scheduleStatus as SchedulerCard["scheduleStatus"],
    dueAt: card.dueAt,
    lastReviewAt: card.lastReviewAt,
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}

// Picks out the fields to save from a card the scheduler returned.
export function fromSchedulerCard(card: SchedulerCard) {
  return {
    state: card.state,
    scheduleStatus: card.scheduleStatus,
    dueAt: card.dueAt,
    lastReviewAt: card.lastReviewAt,
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}
