import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the end-to-end tests build into their own folder, so they don't clash with the dev server's.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Forwards every /api request to the API, so the browser only ever talks to this site.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
