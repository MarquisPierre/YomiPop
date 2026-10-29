import { createAuthClient } from "better-auth/react";
import { API_URL } from "./api";

// Signs in, signs up, signs out and reads the session from the browser.
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: "include" },
});
