import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";
import { NotesRepo } from "./notesRepository";
import { useParams, Link } from "react-router-dom";
import Button from "../ui/Button";

/**
 * PUBLIC_INTERFACE
 * ShareNotePage - Lightweight public view for a shared note at /share/:id
 * Works when Supabase is configured (share_id column). Local mode is best-effort via localStorage.
 */
export default function ShareNotePage() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const data = await NotesRepo.resolveShared(id);
        if (!ignore) setNote(data);
      } catch {
        if (!ignore) setNote(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) return <Loading label="Loading shared note..." />;

  if (!note) {
    return (
      <Card title="Shared Note">
        <EmptyState title="Not found" description="This shared note could not be loaded or no longer exists." />
        <Link to="/notes"><Button variant="ghost">Back to Notes</Button></Link>
      </Card>
    );
  }

  return (
    <Card title="Shared Note" subtitle={note.title || "Untitled"}>
      <div style={{ whiteSpace: "pre-wrap" }}>{note.content || ""}</div>
    </Card>
  );
}
