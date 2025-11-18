import React, { createContext, useContext, useMemo } from "react";
import { resolveAIProvider } from "./config";
import { MockAIClient } from "./providers/mockClient";
import { SupabaseFunctionAIClient } from "./providers/supabaseFunctionClient";
import { OpenAICompatibleClient } from "./providers/openaiClient";
import { useToast } from "../ui/ToastContext";
import { useAuth } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * AIContext - Provides summarize, generateQuiz, explainELI5 methods.
 */
const AIContext = createContext({
  summarize: async (_opts) => {},
  generateQuiz: async (_opts) => {},
  explainELI5: async (_opts) => {},
  provider: "mock",
});

function buildClient(provider, showToast) {
  try {
    switch (provider) {
      case "supabase":
        return new SupabaseFunctionAIClient();
      case "openai":
        return new OpenAICompatibleClient();
      default:
        showToast?.(
          "AI provider not configured. Using safe mock responses.",
          { tone: "warning", duration: 4000 }
        );
        return new MockAIClient();
    }
  } catch {
    showToast?.(
      "Failed to initialize AI provider. Falling back to mock.",
      { tone: "warning" }
    );
    return new MockAIClient();
  }
}

/**
 * PUBLIC_INTERFACE
 * AIProvider - Injects AI tools with provider selection and auth gating.
 */
export function AIProvider({ children }) {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const provider = resolveAIProvider();
  const client = useMemo(() => buildClient(provider, showToast), [provider, showToast]);

  async function guardAuth(fnName, action) {
    if (!isAuthenticated) {
      const err = new Error("AUTH_REQUIRED");
      err.code = "AUTH_REQUIRED";
      throw err;
    }
    try {
      return await action();
    } catch (e) {
      // Surface safe errors to UI via toast
      const msg = e?.message || "AI request failed";
      showToast?.(msg.includes("AUTH_REQUIRED") ? "Please sign in to use AI tools." : "AI request failed. Showing fallback if available.", {
        tone: "error",
      });
      throw e;
    }
  }

  const value = useMemo(() => {
    return {
      provider,
      summarize: (opts) => guardAuth("summarize", () => client.summarize(opts || {})),
      generateQuiz: (opts) => guardAuth("generateQuiz", () => client.generateQuiz(opts || {})),
      explainELI5: (opts) => guardAuth("explainELI5", () => client.explainELI5(opts || {})),
    };
  }, [client, provider, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * PUBLIC_INTERFACE
 * useAI - Hook exposing AI tools: summarize, generateQuiz, explainELI5
 */
export function useAI() {
  return useContext(AIContext);
}
