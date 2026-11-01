import Fastify from "fastify";
import { aiRoutes } from "./routes/ai.js";
import { authRoutes } from "./routes/auth.js";
import { cardRoutes } from "./routes/cards.js";
import { deckRoutes } from "./routes/decks.js";
import { mediaRoutes } from "./routes/media.js";
import { settingsRoutes } from "./routes/settings.js";

// Builds the API with all its routes, without starting it, so the server and the tests share it.
// Logging is off in tests, which would otherwise print every request.
export function buildApp({ logger = true } = {}) {
  // Rejects request bodies with unknown fields instead of quietly dropping them.
  const app = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false } },
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(authRoutes);
  app.register(cardRoutes, { prefix: "/api" });
  app.register(settingsRoutes, { prefix: "/api" });
  app.register(deckRoutes, { prefix: "/api" });
  app.register(aiRoutes, { prefix: "/api" });
  app.register(mediaRoutes, { prefix: "/api" });
  return app;
}
