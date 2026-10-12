// The production container serves the UI and proxies `/api` through nginx.
// Keeping the default same-origin avoids browser calls to the server's
// localhost-only port, while still allowing a separate API in development.
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
