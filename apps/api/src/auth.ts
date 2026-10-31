import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";
import { prisma } from "./db.js";
import { sendEmail } from "./email.js";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// Handles sign-up, log-in and sessions.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Keeps new accounts from signing in until they click the link in their email.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // Signs out every device after a reset, in case someone else got in.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Reset your YomiPop password",
        `Hi ${user.name},\n\nClick this link to choose a new password. It works for 1 hour:\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Verify your YomiPop email",
        `Hi ${user.name},\n\nClick this link to verify your email and start using YomiPop:\n${url}\n\nIf you didn't sign up, you can ignore this email.`,
      );
    },
  },
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
  // Lets users delete their account, which also deletes their cards and reviews.
  user: { deleteUser: { enabled: true } },
  // Logs a Google user into the existing account with the same email, since Google has checked it.
  account: { accountLinking: { trustedProviders: ["google"] } },
  trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
  plugins: [bearer()],
});
