import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/ToastContext";
import { NotesRepo } from "./notesRepository";
import { useAuth } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * NotesListPage - browse/search/delete saved notes. Works with Supabase or local fallback.
 */
export default function NotesListPage() {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await NotesRepo.list({ q });
      setItems(list);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Sign in to sync Notes to your account. Showing local notes if available.", { tone: "info" });
      } else {
        showToast("Failed to load notes.", { tone: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (e) => {
    e.preventDefault();
    await load();
  };

  const remove = async (id) => {
    try {
      await NotesRepo.remove(id);
      showToast("Note deleted", { tone: "success" });
      await load();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Please sign in to manage cloud notes.", { tone: "warning" });
      } else {
        showToast("Delete failed", { tone: "error" });
      }
    }
  };

  const headerRight = useMemo(() => {
    return (
      <form onSubmit={onSearch} style={{ display: "flex", gap: 8 }}>
        <input
          aria-label="Search notes"
          placeholder="Search notes..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(17,24,39,0.12)",
          }}
        />
        <Button type="submit" ariaLabel="Search notes">Search</Button>
        <Button type="button" variant="ghost" onClick={load} ariaLabel="Refresh notes">Refresh</Button>
      </form>
    );
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card title="🗒️ Notes" subtitle={isAuthenticated ? "Your saved study notes" : "Local notes (sign in to sync)"} headerRight={headerRight}>
      {loading ? (
        <Loading label="Loading notes..." />
      ) : items.length === 0 ? (
        <EmptyState title="No notes yet" description="Save AI responses as notes to revisit later." />
      ) : (
        <div role="list" style={{ display: "grid", gap: 10 }}>
          {items.map((n) => (
            <div
              key={n.id}
              role="listitem"
              style={{
                border: "1px solid rgba(17,24,39,0.06)",
                borderRadius: 12,
                padding: 12,
                background: "white",
                boxShadow: "var(--ocean-shadow)",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <h4 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.title || "Untitled"}
                </h4>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="ghost" onClick={() => remove(n.id)} ariaLabel="Delete note">Delete</Button>
                </div>
              </div>
              <div style={{ color: "var(--ocean-muted)", fontSize: 13 }}>
                {new Date(n.created_at || Date.now()).toLocaleString()}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {String(n.content || "").slice(0, 400)}
                {String(n.content || "").length > 400 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
