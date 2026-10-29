import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";
import { prisma } from "./db.js";

// Handles sign-up, log-in and sessions.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
  plugins: [bearer()],
});
