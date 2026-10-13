import axios from "axios";

// The production container serves the UI and proxies `/api` through nginx.
// Keeping the default same-origin avoids browser calls to the server's
// localhost-only port, while still allowing a separate API in development.
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Global request interceptor: automatically attach Authorization header if token exists
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor: silently handle session expiration without displaying ugly error banners
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || "";
      if (!url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("name");
        localStorage.removeItem("roleId");
        localStorage.removeItem("roleName");
        const path = window.location.pathname;
        if (path !== "/" && path !== "/register" && path !== "/forgot-password" && path !== "/reset-password") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);
