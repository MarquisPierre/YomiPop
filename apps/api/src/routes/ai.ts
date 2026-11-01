import type { FastifyInstance, FastifyReply } from "fastify";
import { requireUser } from "../requireUser.js";
import { cached } from "../services/ai/cache.js";
import { AiUnavailableError } from "../services/ai/gemini.js";
import { findImages } from "../services/ai/images.js";
import { writeSentences } from "../services/ai/sentences.js";
import {
  AiLimitReachedError,
  checkAiLimit,
  DAILY_AI_LIMIT,
  recordAiRequest,
} from "../services/ai/usage.js";

// Describes a request about one word. Fresh asks for new results instead of saved ones.
interface WordRequest {
  word: string;
  reading: string;
  meaning: string;
  fresh?: boolean;
}

// Checks word requests. Lengths are capped, since the text goes into the AI's instructions.
const wordSchema = {
  type: "object",
  required: ["word", "reading", "meaning"],
  additionalProperties: false,
  properties: {
    word: { type: "string", minLength: 1, maxLength: 30 },
    reading: { type: "string", maxLength: 60 },
    meaning: { type: "string", minLength: 1, maxLength: 200 },
    fresh: { type: "boolean" },
  },
} as const;

// Turns AI problems into clear messages for the user.
function sendAiError(error: unknown, reply: FastifyReply) {
  if (error instanceof AiLimitReachedError) {
    return reply.code(429).send({
      message: `You've used today's ${DAILY_AI_LIMIT} AI requests. They reset at midnight UTC.`,
    });
  }
  if (error instanceof AiUnavailableError) {
    reply.log.error(error, "AI service failed");
    return reply
      .code(503)
      .send({ message: "AI isn't available right now. Try again later." });
  }
  throw error;
}

// Adds the AI routes to the server.
export async function aiRoutes(app: FastifyInstance): Promise<void> {
  requireUser(app);

  // Writes 3 example sentences for a word, reusing saved ones when it can.
  app.post<{ Body: WordRequest }>(
    "/ai/sentences",
    { schema: { body: wordSchema } },
    async (request, reply) => {
      const { word, reading, meaning, fresh = false } = request.body;
      try {
        const sentences = await cached(
          `sentences|${word}|${meaning}`,
          async () => {
            await checkAiLimit(request.userId);
            const sentences = await writeSentences(word, reading, meaning);
            // Counts the request only now that it worked.
            await recordAiRequest(request.userId, "sentences");
            return sentences;
          },
          fresh,
        );
        return { sentences };
      } catch (error) {
        return sendAiError(error, reply);
      }
    },
  );

  // Finds photos for a word, reusing saved results when it can.
  app.post<{ Body: WordRequest }>(
    "/ai/image",
    { schema: { body: wordSchema } },
    async (request, reply) => {
      const { word, meaning, fresh = false } = request.body;
      try {
        const images = await cached(
          `image|${word}|${meaning}`,
          async () => {
            await checkAiLimit(request.userId);
            const images = await findImages(word, meaning);
            // Counts the request only now that it worked.
            await recordAiRequest(request.userId, "image");
            return images;
          },
          fresh,
        );
        return { images };
      } catch (error) {
        return sendAiError(error, reply);
      }
    },
  );
}
