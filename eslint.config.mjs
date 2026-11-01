import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/dist-prod/**",
    "**/.next/**",
    "**/.next-e2e/**",
    "apps/web/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
]);
