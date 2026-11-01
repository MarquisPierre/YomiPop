import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

// Makes every route in the group require a logged-in user, and remembers who's asking.
export function requireUser(app: FastifyInstance): void {
  app.decorateRequest("userId", "");

  // Rejects requests from anyone who isn't logged in.
  app.addHook("preHandler", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) return reply.code(401).send({ message: "Not logged in" });
    request.userId = session.user.id;
  });
}
