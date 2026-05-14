const rawApiBase = import.meta.env.VITE_API_BASE?.trim() || "/api";

export const API_BASE = rawApiBase.replace(/\/+$/, "");

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
