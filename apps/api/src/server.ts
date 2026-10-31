import "dotenv/config";
import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { cardRoutes } from "./routes/cards.js";

// Rejects request bodies with unknown fields instead of quietly dropping them.
const app = Fastify({
  logger: true,
  ajv: { customOptions: { removeAdditional: false } },
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.register(authRoutes);
app.register(cardRoutes, { prefix: "/api" });

const port = Number(process.env.PORT ?? 4000);

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
