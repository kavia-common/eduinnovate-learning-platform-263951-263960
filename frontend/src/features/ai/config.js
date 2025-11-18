//
// AI configuration reader for provider selection and endpoints.
// Reads only environment variables; no secrets are hardcoded.
//
// PUBLIC_INTERFACE
export const AIConfig = Object.freeze({
  PROVIDER: (process.env.REACT_APP_AI_PROVIDER || "").trim().toLowerCase(), // "", "openai", "supabase"
  SUPABASE_URL: (process.env.REACT_APP_SUPABASE_URL || "").trim(),
  OPENAI_API_BASE: (process.env.REACT_APP_OPENAI_API_BASE || "").trim(),
  OPENAI_API_KEY: (process.env.REACT_APP_OPENAI_API_KEY || "").trim(),
});

// PUBLIC_INTERFACE
export function resolveAIProvider() {
  // Prefer Supabase Edge Function if Supabase URL present (per requirement).
  if (AIConfig.SUPABASE_URL) return "supabase";
  // If explicit provider=openai and base/key present, use OpenAI-compatible
  if (
    AIConfig.PROVIDER === "openai" &&
    AIConfig.OPENAI_API_BASE &&
    AIConfig.OPENAI_API_KEY
  ) {
    return "openai";
  }
  // Otherwise fallback to mock
  return "mock";
}
