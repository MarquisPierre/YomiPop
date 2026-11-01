// Says whether the email is the shared demo account's, set by DEMO_EMAIL.
// Reads the setting when used, so tests can supply their own.
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = process.env.DEMO_EMAIL;
  return Boolean(demo && email && email.toLowerCase() === demo.toLowerCase());
}

// Explains to visitors why a change didn't work.
export const DEMO_MESSAGE =
  "The demo account can't be changed. Sign up for your own account to try this.";
