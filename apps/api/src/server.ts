import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { cardRoutes } from "./routes/cards.js";

const app = Fastify({ logger: true });

// Lets the web app call the API from the browser, sending its login cookie.
app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  credentials: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.register(authRoutes);
app.register(cardRoutes);

const port = Number(process.env.PORT ?? 4000);

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
