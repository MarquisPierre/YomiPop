// Points at the YomiPop web app. Its /api routes are forwarded to the API,
// and its login cookie is the one the extension reads. Set VITE_WEB_URL when building for production.
export const WEB_URL: string =
  import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
