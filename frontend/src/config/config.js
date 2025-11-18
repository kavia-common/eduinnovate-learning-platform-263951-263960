//
// Centralized configuration for LMS Frontend
// Reads REACT_APP_* environment variables with validation and safe defaults.
// No secrets are hardcoded here. Ensure .env provides necessary values.
//
// PUBLIC_INTERFACE
export const config = (() => {
  /**
   * Parse feature flags from REACT_APP_FEATURE_FLAGS.
   * Accepts JSON object/string or comma-separated values.
   * - JSON object: {"flagA": true, "flagB": false}
   * - JSON array: ["flagA","flagB"]
   * - Comma-separated: "flagA,flagB"
   * Returns a normalized object mapping flagName -> boolean.
   */
  const parseFeatureFlags = (raw) => {
    const result = {};
    if (!raw || typeof raw !== "string") return result;

    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        parsed.forEach((k) => {
          if (typeof k === "string" && k.trim()) result[k.trim()] = true;
        });
      } else if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach((k) => {
          result[k] = Boolean(parsed[k]);
        });
      }
      return result;
    } catch {
      // Fallback: comma-separated list
      trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((k) => {
          result[k] = true;
        });
      return result;
    }
  };

  const env = {
    NODE_ENV: process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || "development",
    API_BASE: process.env.REACT_APP_API_BASE || "",
    BACKEND_URL: process.env.REACT_APP_BACKEND_URL || "",
    FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || "",
    WS_URL: process.env.REACT_APP_WS_URL || "",
    NEXT_TELEMETRY_DISABLED: process.env.REACT_APP_NEXT_TELEMETRY_DISABLED === "true",
    ENABLE_SOURCE_MAPS: process.env.REACT_APP_ENABLE_SOURCE_MAPS !== "false",
    PORT: Number(process.env.REACT_APP_PORT) || 3000,
    TRUST_PROXY: process.env.REACT_APP_TRUST_PROXY === "true",
    LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL || "info",
    HEALTHCHECK_PATH: process.env.REACT_APP_HEALTHCHECK_PATH || "/healthz",
    FEATURE_FLAGS_RAW: process.env.REACT_APP_FEATURE_FLAGS || "",
    EXPERIMENTS_ENABLED: process.env.REACT_APP_EXPERIMENTS_ENABLED === "true",
  };

  // Validate critical runtime URLs (non-fatal; we log to console with no PII)
  const warnings = [];
  if (!env.API_BASE && !env.BACKEND_URL) {
    warnings.push("API_BASE and BACKEND_URL are not set. Some non-auth API requests may fall back to local mocks.");
  }
  if (!env.FRONTEND_URL) {
    warnings.push("FRONTEND_URL is not set. Some redirects may not work as expected.");
  }
  if (!env.WS_URL) {
    warnings.push("WS_URL is not set. Real-time features may be disabled.");
  }
  if (warnings.length) {
    // Do not include PII or secrets in logs
    // eslint-disable-next-line no-console
    console.warn("[LMS Config] Warnings:", warnings);
  }

  const FEATURES = parseFeatureFlags(env.FEATURE_FLAGS_RAW);

  return Object.freeze({
    ...env,
    FEATURES,
  });
})();

/**
 * PUBLIC_INTERFACE
 * Returns the base URL for REST calls, preferring REACT_APP_API_BASE then REACT_APP_BACKEND_URL.
 */
export function getApiBase() {
  return config.API_BASE || config.BACKEND_URL || "";
}

/**
 * PUBLIC_INTERFACE
 * Utility: Build a full API URL from a path segment.
 * Ensures single slash joining and avoids leaking secrets.
 */
export function apiUrl(path = "") {
  const base = getApiBase();
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${String(path || "")}`;
  return `${base}${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");
}
