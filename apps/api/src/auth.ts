import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";
import { prisma } from "./db.js";
import { DEMO_MESSAGE, isDemoEmail } from "./demo.js";
import { sendEmail } from "./email.js";
import { deleteUserFiles } from "./services/storage.js";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const WEB_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Lists the account changes the demo account can't make, so one visitor can't lock out the rest.
const DEMO_BLOCKED_PATHS = new Set([
  "/update-user",
  "/change-password",
  "/change-email",
  "/delete-user",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/link-social",
  "/unlink-account",
]);

// Stops changes to the demo account before Better Auth makes them. It's a plugin so its
// matcher can limit it to the few account routes, keeping other requests fast.
const demoLock = {
  id: "demo-lock",
  hooks: {
    before: [
      {
        matcher: (ctx) =>
          DEMO_BLOCKED_PATHS.has(ctx.path ?? "") ||
          ctx.path === "/request-password-reset",
        handler: createAuthMiddleware(async (ctx) => {
          // Refuses reset emails for the demo account, since visitors can't read its inbox anyway.
          if (ctx.path === "/request-password-reset") {
            if (isDemoEmail(ctx.body?.email)) {
              throw new APIError("FORBIDDEN", { message: DEMO_MESSAGE });
            }
            return;
          }
          // Finds who's asking from the website's sign-in cookie, or else from the extension's
          // token, which bearer() only turns into a cookie after every check has run.
          let email = (await getSessionFromCtx(ctx))?.user.email;
          const header = ctx.headers?.get("authorization") ?? "";
          if (!email && header.toLowerCase().startsWith("bearer ")) {
            // Keeps only the token part; the rest is its signature.
            const token =
              decodeURIComponent(header.slice(7).trim()).split(".")[0] ?? "";
            const found = await ctx.context.internalAdapter.findSession(token);
            email = found?.user.email;
          }
          if (isDemoEmail(email)) {
            throw new APIError("FORBIDDEN", { message: DEMO_MESSAGE });
          }
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;

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
    // Tells the owner instead, since the sign-up page can't say the email is taken without revealing who has an account.
    onExistingUserSignUp: async ({ user }) => {
      await sendEmail(
        user.email,
        "You already have a YomiPop account",
        `Hi ${user.name},\n\nSomeone (hopefully you) just tried to sign up for YomiPop with this email, but you already have an account.\n\nSign in here: ${WEB_URL}/sign-in\nForgot your password? Reset it here: ${WEB_URL}/forgot-password\n\nIf this wasn't you, you can ignore this email. Your account is safe.`,
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
  user: {
    deleteUser: {
      enabled: true,
      // Removes their uploaded pictures too, which the database can't cascade to.
      // Logs a failure instead of throwing, since the account is already gone by then.
      afterDelete: async (user) => {
        for (const bucket of ["avatars", "card-images"]) {
          await deleteUserFiles(bucket, user.id).catch((error) =>
            console.error(`Couldn't delete ${bucket} for ${user.id}`, error),
          );
        }
      },
    },
  },
  // Logs a Google user into the existing account with the same email, since Google has checked it.
  account: { accountLinking: { trustedProviders: ["google"] } },
  trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
  plugins: [bearer(), demoLock],
});
