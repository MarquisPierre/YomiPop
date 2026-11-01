import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app, hasTestDatabase, resetDatabase, signUp } from "./helpers.js";

// Sends a POST the way the website does, with the user's sign-in and the site's origin.
function post(url: string, headers: object, payload: object) {
  return app.inject({
    method: "POST",
    url,
    headers: { ...headers, origin: "http://localhost:3000" },
    payload,
  });
}

describe.skipIf(!hasTestDatabase)("the demo account", () => {
  beforeEach(async () => {
    await resetDatabase();
    // Makes demo@example.com the demo account, which is the email signUp("Demo") uses.
    vi.stubEnv("DEMO_EMAIL", "demo@example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("can't change its name, password or email, or delete itself", async () => {
    const demo = await signUp("Demo");
    const attempts = [
      { url: "/api/auth/update-user", payload: { name: "Hacked" } },
      {
        url: "/api/auth/change-password",
        payload: {
          currentPassword: "test-password-123",
          newPassword: "new-password-456",
        },
      },
      {
        url: "/api/auth/change-email",
        payload: { newEmail: "other@example.com" },
      },
      { url: "/api/auth/delete-user", payload: {} },
    ];
    for (const { url, payload } of attempts) {
      const response = await post(url, demo.headers, payload);
      expect(response.statusCode, url).toBe(403);
    }
  });

  it("can't upload pictures", async () => {
    const demo = await signUp("Demo");
    const response = await post("/api/media/upload-url", demo.headers, {
      kind: "card",
    });
    expect(response.statusCode).toBe(403);
  });

  it("can't be sent a password-reset email", async () => {
    const response = await post(
      "/api/auth/request-password-reset",
      {},
      {
        email: "demo@example.com",
        redirectTo: "http://localhost:3000/reset-password",
      },
    );
    expect(response.statusCode).toBe(403);
  });

  it("still lets other accounts change their name", async () => {
    const eve = await signUp("Eve");
    const response = await post("/api/auth/update-user", eve.headers, {
      name: "Eve 2",
    });
    expect(response.statusCode).toBe(200);
  });
});
