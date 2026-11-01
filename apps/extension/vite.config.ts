import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

// Leaves out the localhost permission in the live build, so the store version
// only asks for what it uses there, as the build plan's least-privilege rule says.
function forProduction(base: typeof manifest): typeof manifest {
  return {
    ...base,
    host_permissions: base.host_permissions.filter(
      (host) => !host.startsWith("http://localhost"),
    ),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    crx({
      manifest: mode === "production" ? forProduction(manifest) : manifest,
    }),
  ],
}));
