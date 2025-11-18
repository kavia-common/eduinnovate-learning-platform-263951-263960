//
// Supabase Edge Function AI client. Calls POST {SUPABASE_URL}/functions/v1/ai-tools
// with proper headers. If Supabase client exists, attaches auth bearer token.
//
// PUBLIC_INTERFACE
import supabase from "../../auth/supabaseClient";
import { AIConfig } from "../config";

async function getBearer() {
  try {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export class SupabaseFunctionAIClient {
  constructor() {
    this.base = AIConfig.SUPABASE_URL;
    this.endpoint = this.base
      ? `${this.base.replace(/\/+$/, "")}/functions/v1/ai-tools`
      : "";
  }

  async _call(tool, payload) {
    if (!this.endpoint) {
      const err = new Error("SUPABASE_URL_MISSING");
      err.code = "SUPABASE_URL_MISSING";
      throw err;
    }
    const token = await getBearer();
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tool, ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`EDGE_FN_ERROR ${res.status}: ${text || res.statusText}`);
      err.code = "EDGE_FN_ERROR";
      throw err;
    }
    // Expect JSON: { type, content | items }
    return await res.json();
  }

  // PUBLIC_INTERFACE
  async summarize({ text = "", contentId = "" }) {
    return this._call("summarize", { text, contentId });
  }

  // PUBLIC_INTERFACE
  async generateQuiz({ text = "", contentId = "", n = 5 }) {
    return this._call("generateQuiz", { text, contentId, n });
  }

  // PUBLIC_INTERFACE
  async explainELI5({ text = "", contentId = "" }) {
    return this._call("explainELI5", { text, contentId });
  }
}
