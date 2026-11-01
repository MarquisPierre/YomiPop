import { prisma } from "../../db.js";

// Sets how many AI requests each person gets per day, so one person can't use up the free quota.
export const DAILY_AI_LIMIT = 50;

// Means the user has used today's AI requests.
export class AiLimitReachedError extends Error {}

// Refuses the request when the user has reached today's limit. Days start at midnight UTC.
export async function checkAiLimit(userId: string): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const used = await prisma.aiUsage.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });
  if (used >= DAILY_AI_LIMIT) throw new AiLimitReachedError();
}

// Records a request that worked. Failed ones and results from the cache don't count.
export async function recordAiRequest(
  userId: string,
  type: "sentences" | "image",
): Promise<void> {
  await prisma.aiUsage.create({ data: { userId, type } });
}
