//
// Supabase client initialization for LMS Frontend.
// Uses environment variables for configuration. No secrets are hardcoded.
//
// PUBLIC_INTERFACE
import { createClient } from "@supabase/supabase-js";

/**
 * Get Supabase config from environment. All values are optional at runtime;
 * if missing, the rest of the app should gracefully fall back to mocks.
 */
function getSupabaseConfig() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  return { url, key };
}

// PUBLIC_INTERFACE
export function makeSupabaseClient() {
  /**
   * Create a Supabase client if env variables are present; otherwise return null.
   * This avoids crashing builds and keeps secrets out of source.
   */
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Supabase] REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY missing. Falling back to mock/local flows."
    );
    return null;
  }
  // Set auth options to persist session in local storage
  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return supabase;
}

// Singleton instance for app usage
const supabase = makeSupabaseClient();
export default supabase;
