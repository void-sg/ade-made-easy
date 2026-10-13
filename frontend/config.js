/**
 * frontend/config.js — Frontend Environment & API Endpoint Configuration
 *
 * Automatically detects whether running locally (127.0.0.1 / localhost)
 * or in production on Vercel / Cloud CDN.
 */
const isLocal = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:"
);

const API_BASE = isLocal
  ? "http://127.0.0.1:8000"
  : "https://logic-sim-suite.onrender.com";

window.API_BASE = API_BASE;

