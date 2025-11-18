import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
 * Accessibility and UX:
 * - Semantic structure (section/header/main/aside)
 * - Keyboard navigation (Tab/Shift+Tab, Enter/Space)
 * - ESC to close (when used as a panel), focus management
 * - aria-live regions for loading/success/error
 * - Visible focus styles and labels for history list items
 * - Responsive layout + overflow handling for long outputs
 * Props:
 * - contextText: optional preset text for tools
 * - contentId: optional id for provider context
 * - assignmentId: optional for granular context
 * - onClose: optional callback for closing the panel (ESC triggers when provided)
 */
export default function AIAssistantPanel({ contextText = "", contentId = "", assignmentId = "", onClose }) {
  const { summarize, generateQuiz, explainELI5, provider } = useAI();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState(contextText || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState(false);

  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const liveRegionRef = useRef(null);
  const runButtonsRef = useRef(null);

  const placeholder = useMemo(
    () =>
      "Paste notes or write a prompt. Leave empty to use the current page context (if available).",
    []
  );

  // Announce helper
  const announce = useCallback((msg) => {
    const node = liveRegionRef.current;
    if (!node) return;
    node.textContent = "";
    // small delay to ensure the screen reader announces changes
    setTimeout(() => {
      node.textContent = msg;
    }, 10);
  }, []);

  // load history for context
  useEffect(() => {
    const items = listHistory({ courseId: contentId, assignmentId });
    setHistory(items);
  }, [contentId, assignmentId]);

  // focus management on mount
  useEffect(() => {
    // Move focus to heading for screen readers
    try {
      headingRef.current?.focus();
    } catch {}
  }, []);

  // ESC to close if panel supports closing
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (onClose) {
          e.stopPropagation();
          e.preventDefault();
          onClose();
          announce("AI panel closed");
        }
      }
    };
    const el = sectionRef.current;
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, [onClose, announce]);

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
    announce("Starting AI request");
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
      announce("AI request complete");
    } catch (e) {
      const msg = e?.message || "Request failed";
      setError(msg);
      announce("AI request failed");
    } finally {
      setLoading(false);
      // Return focus to the first run button to continue keyboard flow
      try {
        runButtonsRef.current?.querySelector("button")?.focus();
      } catch {}
    }
  }

  function openFromHistory(id) {
    setSelectedId(id);
    const item = (history || []).find((x) => x.id === id);
    if (item) {
      setResult(item.result || null);
      setPrompt(item.prompt || "");
      announce(`Opened AI result from ${new Date(item.timestamp).toLocaleString()}`);
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
      announce("Copy successful");
    } catch {
      showToast("Copy failed", { tone: "error" });
      announce("Copy failed");
    }
  }

  async function saveToNotes() {
    if (!result) {
      showToast("Nothing to save. Run an AI action first.", { tone: "warning" });
      announce("Nothing to save");
      return;
    }
    try {
      const titleBase =
        result.type === "quiz"
          ? "Generated Quiz"
          : result.type === "eli5"
          ? "ELI5 Explanation"
          : "AI Summary";
      const content =
        result.type === "quiz"
          ? (result.items || [])
              .map((qa, i) => `${i + 1}. ${qa.q}\nAnswer: ${qa.a}`)
              .join("\n\n")
          : String(result.content || "");
      await NotesRepo.create({
        context_type: assignmentId ? "assignment" : "course",
        context_id: assignmentId || contentId || "",
        title: `${titleBase} - ${new Date().toLocaleString()}`,
        content,
      });
      showToast("Saved to Notes", { tone: "success" });
      announce("Saved to notes");
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Sign in to sync Notes to your account. Note saved locally if available.", { tone: "info" });
      } else {
        showToast("Failed to save note", { tone: "error" });
      }
      announce("Save to notes failed");
    }
  }

  async function shareCurrent() {
    if (!result) {
      showToast("Nothing to share. Run an AI action first.", { tone: "warning" });
      announce("Nothing to share");
      return;
    }
    try {
      const titleBase =
        result.type === "quiz"
          ? "Generated Quiz"
          : result.type === "eli5"
          ? "ELI5 Explanation"
          : "AI Summary";
      const content =
        result.type === "quiz"
          ? (result.items || [])
              .map((qa, i) => `${i + 1}. ${qa.q}\nAnswer: ${qa.a}`)
              .join("\n\n")
          : String(result.content || "");

      // create a note (for share id if supabase)
      const note = await NotesRepo.create({
        context_type: assignmentId ? "assignment" : "course",
        context_id: assignmentId || contentId || "",
        title: `${titleBase}`,
        content,
      });
      const { url, mode } = await NotesRepo.createShareLink(note, {
        frontendOrigin: process.env.REACT_APP_FRONTEND_URL || window.location.origin,
      });

      if (mode === "supabase" && url) {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied", { tone: "success" });
      } else {
        await navigator.clipboard.writeText(content);
        showToast("Copied content to clipboard (local share)", { tone: "success" });
      }
      announce("Share ready");
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Sign in to create shareable links. Copied content instead.", { tone: "info" });
      } else {
        showToast("Share failed", { tone: "error" });
      }
      announce("Share failed");
    }
  }

  function clearContextHistory() {
    clearHistory({ courseId: contentId, assignmentId });
    setHistory([]);
    setSelectedId("");
    showToast("History cleared", { tone: "success" });
    announce("History cleared");
  }

  // Compose accessible aria-labels for history items
  const historyLabel = (h) => {
    const type =
      h?.result?.type === "quiz"
        ? "Quiz"
        : h?.result?.type === "eli5"
        ? "ELI5"
        : "Summary";
    return `AI result: ${type}, from ${new Date(h.timestamp).toLocaleString()}`;
  };

  // Result text for copy-to-clipboard in-place button (in result box)
  const resultText = useMemo(() => {
    if (!result) return "";
    if (result.type === "quiz") {
      return (result.items || [])
        .map((qa, i) => `${i + 1}. ${qa.q}\n   - ${qa.a}`)
        .join("\n");
    }
    return String(result.content || "");
  }, [result]);

  // Keyboard activation helper for non-anchor controls if needed
  const onKeyActivate = (handler) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-label="AI Study Assistant"
      role="region"
      tabIndex={-1}
      style={{
        border: "1px solid rgba(17,24,39,0.08)",
        borderRadius: 12,
        padding: 12,
        background: "white",
        boxShadow: "var(--ocean-shadow)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <h2
          ref={headingRef}
          tabIndex={-1}
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}
        >
          🤖 AI Study Assistant
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge tone="info" aria-label={`AI provider: ${provider}`}>{provider}</Badge>
          {onClose ? (
            <Button
              ariaLabel="Close AI panel"
              variant="ghost"
              onClick={onClose}
              title="Close"
            >
              Close
            </Button>
          ) : null}
        </div>
      </header>

      {!isAuthenticated && (
        <div
          style={{ marginBottom: 8, color: "var(--ocean-muted)", fontSize: 14 }}
          role="note"
          aria-live="polite"
        >
          You can run AI with login. Local history is still available.
        </div>
      )}

      {/* live region for status announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        role="status"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(1px, 1px, 1px, 1px)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 10,
        }}
      >
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

          <div
            ref={runButtonsRef}
            style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
            role="group"
            aria-label="AI Actions"
          >
            <Button onClick={() => run("summarize")} disabled={loading} ariaLabel="Summarize">
              {loading ? "Working..." : "Summarize"}
            </Button>
            <Button onClick={() => run("quiz")} disabled={loading} variant="secondary" ariaLabel="Generate Quiz">
              {loading ? "Working..." : "Generate Quiz"}
            </Button>
            <Button onClick={() => run("eli5")} disabled={loading} variant="ghost" ariaLabel="Explain like I'm five">
              {loading ? "Working..." : "Explain like I’m 5"}
            </Button>
            <span style={{ flex: 1 }} />
            <Button onClick={saveToNotes} variant="ghost" ariaLabel="Save to Notes" disabled={!result}>
              Save to Notes
            </Button>
            <Button onClick={copyCurrent} variant="ghost" ariaLabel="Copy AI result" disabled={!result}>
              Copy
            </Button>
            <Button onClick={shareCurrent} variant="ghost" ariaLabel="Share AI result" disabled={!result}>
              Share
            </Button>
            <Button onClick={clearContextHistory} variant="danger" ariaLabel="Clear history">
              Clear
            </Button>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading && <Loading label="Thinking..." />}
            {error && (
              <div style={{ color: "var(--ocean-error)", fontSize: 14 }} role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            {/* Results with overflow handling and copy button */}
            {result && result.type !== "quiz" && (
              <article
                aria-label={result.type === "eli5" ? "ELI5 explanation" : "Summary result"}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background:
                    result.type === "eli5"
                      ? "rgba(245,158,11,0.06)"
                      : "rgba(37,99,235,0.04)",
                  border:
                    result.type === "eli5"
                      ? "1px solid rgba(245,158,11,0.25)"
                      : "1px solid rgba(37,99,235,0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>{result.type === "eli5" ? "ELI5" : "Summary"}:</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" ariaLabel="Copy result text" onClick={copyCurrent}>
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      ariaLabel={expanded ? "Collapse text" : "Expand text"}
                      onClick={() => setExpanded((v) => !v)}
                      onKeyDown={onKeyActivate(() => setExpanded((v) => !v))}
                    >
                      {expanded ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                    maxHeight: expanded ? "none" : 220,
                    overflow: expanded ? "visible" : "auto",
                  }}
                >
                  {resultText}
                </div>
              </article>
            )}

            {result && result.type === "quiz" && (
              <article
                aria-label="Quiz result"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(17,24,39,0.02)",
                  border: "1px solid rgba(17,24,39,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>Quiz:</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" ariaLabel="Copy quiz" onClick={copyCurrent}>
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      ariaLabel={expanded ? "Collapse quiz" : "Expand quiz"}
                      onClick={() => setExpanded((v) => !v)}
                      onKeyDown={onKeyActivate(() => setExpanded((v) => !v))}
                    >
                      {expanded ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </div>
                <ol
                  style={{
                    marginTop: 8,
                    paddingLeft: 18,
                    maxHeight: expanded ? "none" : 220,
                    overflow: expanded ? "visible" : "auto",
                  }}
                >
                  {(result.items || []).map((qa, idx) => (
                    <li key={idx} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{qa.q}</div>
                      <div style={{ color: "var(--ocean-muted)" }}>{qa.a}</div>
                    </li>
                  ))}
                </ol>
              </article>
            )}
          </div>
        </div>

        {/* History sidebar */}
        <aside
          aria-label="AI history for this context"
          style={{ borderLeft: "1px solid rgba(17,24,39,0.06)", paddingLeft: 10 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <strong>History</strong>
            <span style={{ fontSize: 12, color: "var(--ocean-muted)" }}>
              Last {Math.min(20, history.length)}
            </span>
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ocean-muted)" }}>No history yet.</div>
          ) : (
            <ul
              role="listbox"
              aria-label="Past AI runs"
              tabIndex={0}
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: 6,
              }}
            >
              {history.map((h) => {
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
                        border: isSelected
                          ? "1px solid rgba(37,99,235,0.3)"
                          : "1px solid rgba(17,24,39,0.08)",
                        borderRadius: 10,
                        background: isSelected ? "#fff" : "transparent",
                      }}
                      aria-label={`${historyLabel(h)}, open`}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {h?.result?.type === "quiz"
                          ? "Quiz"
                          : h?.result?.type === "eli5"
                          ? "ELI5"
                          : "Summary"}
                      </div>
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

      {/* Responsive adjustments */}
      <style>
        {`
          @media (max-width: 960px) {
            [aria-label="AI Study Assistant"][role="region"] > div {
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            [aria-label="AI history for this context"] {
              border-left: none !important;
              border-top: 1px solid rgba(17,24,39,0.06);
              padding-left: 0 !important;
              padding-top: 10px;
            }
          }
        `}
      </style>
    </section>
  );
}
