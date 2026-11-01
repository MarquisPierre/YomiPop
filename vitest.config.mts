import { defineConfig } from "vitest/config";

// Runs each app's tests with that app's own settings, so `npm test` still runs everything.
export default defineConfig({
  test: { projects: ["apps/api", "apps/extension"] },
});
