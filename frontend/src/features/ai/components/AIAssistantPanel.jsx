import React, { useMemo, useState } from "react";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Loading from "../../ui/Loading";
import { useAI } from "../AIContext";
import { useAuth } from "../../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * AIAssistantPanel - Minimal, accessible panel with textarea prompt and 3 actions.
 * Props:
 * - contextText: optional preset text to summarize/explain or build quiz from
 * - contentId: optional id used by provider for context lookup
 */
export default function AIAssistantPanel({ contextText = "", contentId = "" }) {
  const { summarize, generateQuiz, explainELI5, provider } = useAI();
  const { isAuthenticated } = useAuth();
  const [prompt, setPrompt] = useState(contextText || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const disabled = !isAuthenticated;
  const placeholder = useMemo(
    () =>
      "Paste notes or write a prompt. Leave empty to use the current page context (if available).",
    []
  );

  async function run(action) {
    setLoading(true);
    setError("");
    try {
      let res;
      if (action === "summarize") {
        res = await summarize({ text: prompt, contentId });
      } else if (action === "quiz") {
        res = await generateQuiz({ text: prompt, contentId, n: 5 });
      } else if (action === "eli5") {
        res = await explainELI5({ text: prompt, contentId });
      }
      setResult(res || null);
    } catch (e) {
      const msg = e?.message || "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="AI Study Assistant"
      style={{
        border: "1px solid rgba(17,24,39,0.08)",
        borderRadius: 12,
        padding: 12,
        background: "white",
        boxShadow: "var(--ocean-shadow)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          🤖 AI Study Assistant
        </h3>
        <Badge tone="info">{provider}</Badge>
      </header>

      {!isAuthenticated && (
        <div style={{ marginBottom: 8, color: "var(--ocean-muted)", fontSize: 14 }}>
          Please login to use AI tools.
        </div>
      )}

      <label htmlFor="ai-prompt" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>
        Prompt or Notes
      </label>
      <textarea
        id="ai-prompt"
        aria-label="AI prompt or content"
        placeholder={placeholder}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(17,24,39,0.12)",
          resize: "vertical",
          marginTop: 6,
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Button onClick={() => run("summarize")} disabled={disabled || loading}>
          {loading ? "Working..." : "Summarize"}
        </Button>
        <Button onClick={() => run("quiz")} disabled={disabled || loading} variant="secondary">
          {loading ? "Working..." : "Generate Quiz"}
        </Button>
        <Button onClick={() => run("eli5")} disabled={disabled || loading} variant="ghost">
          {loading ? "Working..." : "Explain like I’m 5"}
        </Button>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <Loading label="Thinking..." />}
        {error && (
          <div style={{ color: "var(--ocean-error)", fontSize: 14 }}>
            {error}
          </div>
        )}
        {result && result.type === "summary" && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(37,99,235,0.04)",
              border: "1px solid rgba(37,99,235,0.2)",
            }}
            aria-live="polite"
          >
            <strong>Summary:</strong>
            <div style={{ marginTop: 6 }}>{result.content}</div>
          </div>
        )}
        {result && result.type === "eli5" && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
            aria-live="polite"
          >
            <strong>ELI5:</strong>
            <div style={{ marginTop: 6 }}>{result.content}</div>
          </div>
        )}
        {result && result.type === "quiz" && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(17,24,39,0.02)",
              border: "1px solid rgba(17,24,39,0.08)",
            }}
            aria-live="polite"
          >
            <strong>Quiz:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
              {(result.items || []).map((qa, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{qa.q}</div>
                  <div style={{ color: "var(--ocean-muted)" }}>{qa.a}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
