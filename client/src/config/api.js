// Centralized API Base configuration
// Supports:
// 1. Production unified full-stack server (Express serving client/dist) -> uses relative "/api"
// 2. Decoupled deployment (e.g. Vercel frontend + Render backend) -> uses VITE_API_URL
// 3. Local development -> uses "http://localhost:5000/api" or Vite dev proxy

export const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.trim().replace(/\/$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }

  // In production builds, default to relative "/api" if served by the same host
  if (import.meta.env.PROD) {
    return "/api";
  }

  // In local development, direct to port 5000
  return "http://localhost:5000/api";
};

export const API_BASE = getApiBase();
export default API_BASE;
