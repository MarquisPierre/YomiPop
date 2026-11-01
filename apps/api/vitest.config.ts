import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    // Runs test files one at a time, since they share one test database.
    fileParallelism: false,
    // Prepares the test database once, before any test runs.
    globalSetup: ["./test/globalSetup.ts"],
    // Points the API at the test database before any test file loads it.
    setupFiles: ["./test/setup.ts"],
  },
});
