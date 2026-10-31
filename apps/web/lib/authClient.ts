import { createAuthClient } from "better-auth/react";

// Signs in, signs up, signs out and reads the session from the browser.
// It talks to /api/auth on this site, which the web app forwards to the API.
export const authClient = createAuthClient();
