import React, { useEffect, useMemo, useState } from "react";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Loading from "../../ui/Loading";
import { useAI } from "../AIContext";
import { useAuth } from "../../auth/AuthContext";
import { saveInteraction, listHistory, clearHistory } from "../history/historyManager";
import { useToast } from "../../ui/ToastContext";
import { NotesRepo } from "../../notes/notesRepository";

/**
 * PUBLIC_INTERFACE
 * AIAssistantPanel - Enhanced panel with prompt, actions, history, and export/share.
 * Props:
 * - contextText: optional preset text to summarize/explain or build quiz from
 * - contentId: optional id used by provider for context lookup (assumed as courseId)
 * - assignmentId: optional for more granular context
 */
export default function AIAssistantPanel({ contextText = "", contentId = "", assignmentId = "" }) {
  const { summarize, generateQuiz, explainELI5, provider } = useAI();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState(contextText || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const disabled = !isAuthenticated;
  const placeholder = useMemo(
    () =>
      "Paste notes or write a prompt. Leave empty to use the current page context (if available).",
    []
  );

  // load history for context
  useEffect(() => {
    const items = listHistory({ courseId: contentId, assignmentId });
    setHistory(items);
  }, [contentId, assignmentId]);

  function afterRunStore(actionName, res) {
    const entry = saveInteraction(
      { courseId: contentId, assignmentId },
      {
        prompt,
        result: res,
        provider,
        meta: { action: actionName },
      }
    );
    setHistory((h) => [entry, ...h]);
    setSelectedId(entry.id);
  }

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
      afterRunStore(action, res || null);
    } catch (e) {
      const msg = e?.message || "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function openFromHistory(id) {
    setSelectedId(id);
    const item = (history || []).find((x) => x.id === id);
    if (item) {
      setResult(item.result || null);
      setPrompt(item.prompt || "");
    }
  }

  async function copyCurrent() {
    try {
      const text =
        result?.type === "quiz"
          ? (result.items || [])
              .map((qa, i) => `${i + 1}. ${qa.q}\n   - ${qa.a}`)
              .join("\n")
          : String(result?.content || "");
      await navigator.clipboard.writeText(text || "");
      showToast("Copied to clipboard", { tone: "success" });
    } catch {
      showToast("Copy failed", { tone: "error" });
    }
  }

  async function saveToNotes() {
    if (!result) {
      showToast("Nothing to save. Run an AI action first.", { tone: "warning" });
      return;
    }
    try {
      const titleBase = result.type === "quiz" ? "Generated Quiz" : result.type === "eli5" ? "ELI5 Explanation" : "AI Summary";
      const content =
        result.type === "quiz"
          ? (result.items || []).map((qa, i) => `${i + 1}. ${qa.q}\nAnswer: ${qa.a}`).join("\n\n")
          : String(result.content || "");
      await NotesRepo.create({
        context_type: assignmentId ? "assignment" : "course",
        context_id: assignmentId || contentId || "",
        title: `${titleBase} - ${new Date().toLocaleString()}`,
        content,
      });
      showToast("Saved to Notes", { tone: "success" });
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Sign in to sync Notes to your account. Note saved locally if available.", { tone: "info" });
      } else {
        showToast("Failed to save note", { tone: "error" });
      }
    }
  }

  async function shareCurrent() {
    if (!result) {
      showToast("Nothing to share. Run an AI action first.", { tone: "warning" });
      return;
    }
    try {
      const titleBase = result.type === "quiz" ? "Generated Quiz" : result.type === "eli5" ? "ELI5 Explanation" : "AI Summary";
      const content =
        result.type === "quiz"
          ? (result.items || []).map((qa, i) => `${i + 1}. ${qa.q}\nAnswer: ${qa.a}`).join("\n\n")
          : String(result.content || "");

      // we first try to create a note (to get share id if supabase)
      const note = await NotesRepo.create({
        context_type: assignmentId ? "assignment" : "course",
        context_id: assignmentId || contentId || "",
        title: `${titleBase}`,
        content,
      });
      const { url, mode, encoded } = await NotesRepo.createShareLink(note, {
        frontendOrigin: process.env.REACT_APP_FRONTEND_URL || window.location.origin,
      });

      if (mode === "supabase" && url) {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied", { tone: "success" });
      } else {
        // local-only sharing: copy content to clipboard
        await navigator.clipboard.writeText(content);
        showToast("Copied content to clipboard (local share)", { tone: "success" });
      }
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Sign in to create shareable links. Copied content instead.", { tone: "info" });
      } else {
        showToast("Share failed", { tone: "error" });
      }
    }
  }

  function clearContextHistory() {
    clearHistory({ courseId: contentId, assignmentId });
    setHistory([]);
    setSelectedId("");
    showToast("History cleared", { tone: "success" });
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
          You can run AI with login. Local history is still available.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 10 }}>
        <div>
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
            <Button onClick={() => run("summarize")} disabled={loading}>
              {loading ? "Working..." : "Summarize"}
            </Button>
            <Button onClick={() => run("quiz")} disabled={loading} variant="secondary">
              {loading ? "Working..." : "Generate Quiz"}
            </Button>
            <Button onClick={() => run("eli5")} disabled={loading} variant="ghost">
              {loading ? "Working..." : "Explain like I’m 5"}
            </Button>
            <span style={{ flex: 1 }} />
            <Button onClick={saveToNotes} variant="ghost" ariaLabel="Save to Notes" disabled={!result}>
              Save to Notes
            </Button>
            <Button onClick={copyCurrent} variant="ghost" ariaLabel="Copy result" disabled={!result}>
              Copy
            </Button>
            <Button onClick={shareCurrent} variant="ghost" ariaLabel="Share result" disabled={!result}>
              Share
            </Button>
            <Button onClick={clearContextHistory} variant="danger" ariaLabel="Clear history">
              Clear
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
        </div>

        {/* History sidebar */}
        <aside aria-label="AI history for this context" style={{ borderLeft: "1px solid rgba(17,24,39,0.06)", paddingLeft: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>History</strong>
            <span style={{ fontSize: 12, color: "var(--ocean-muted)" }}>
              Last {Math.min(20, history.length)}
            </span>
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ocean-muted)" }}>No history yet.</div>
          ) : (
            <ul role="listbox" aria-label="Past AI runs" tabIndex={0} style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {history.map((h) => {
                const label =
                  h?.result?.type === "quiz"
                    ? "Quiz"
                    : h?.result?.type === "eli5"
                    ? "ELI5"
                    : "Summary";
                const isSelected = selectedId === h.id;
                return (
                  <li key={h.id} role="option" aria-selected={isSelected}>
                    <button
                      onClick={() => openFromHistory(h.id)}
                      className="nav-link"
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        textAlign: "left",
                        padding: 10,
                        border: isSelected ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(17,24,39,0.08)",
                        borderRadius: 10,
                        background: isSelected ? "#fff" : "transparent",
                      }}
                      aria-label={`Open ${label} from ${new Date(h.timestamp).toLocaleString()}`}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "var(--ocean-muted)" }}>
                        {new Date(h.timestamp).toLocaleString()}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
