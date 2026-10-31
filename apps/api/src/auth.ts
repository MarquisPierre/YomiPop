import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";
import { prisma } from "./db.js";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// Handles sign-up, log-in and sessions.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  // Turns on "Continue with Google" only when its settings are present.
  socialProviders:
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  // Logs a Google user into the existing account with the same email, since Google has checked it.
  account: { accountLinking: { trustedProviders: ["google"] } },
  trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
  plugins: [bearer()],
});
