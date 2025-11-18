import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { LMSClient } from "../api/client";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../ui/ToastContext";
import AIAssistantPanel from "../ai/components/AIAssistantPanel";

/**
 * Format a date string to a friendly readable format.
 */
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * PUBLIC_INTERFACE
 * CourseAssignments - lists assignments and supports basic submission UX.
 */
export default function CourseAssignments() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        LMSClient.getCourse(id).catch(() => null),
        LMSClient.getAssignments(id),
      ]);
      setCourse(c);
      setItems(a || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (assignment, type, inputRef) => {
    try {
      const payload =
        type === "text"
          ? { text: inputRef.current?.value || "" }
          : { fileName: inputRef.current?.files?.[0]?.name || "placeholder.txt" };
      const res = await LMSClient.submitAssignment(id, assignment.id, payload);
      if (res && res.success) {
        showToast("Submission successful", { tone: "success" });
        await load();
      } else {
        showToast("Submission failed", { tone: "error" });
      }
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("AUTH_REQUIRED")) {
        showToast("Please login to submit assignments.", { tone: "warning" });
      } else if (msg.includes("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED")) {
        showToast("Submissions not available yet. Using fallback if configured.", { tone: "warning" });
      } else {
        showToast("Submission failed", { tone: "error" });
      }
    }
  };

  if (loading) return <Loading label="Loading assignments..." />;

  return (
    <Card
      title="📝 Assignments"
      subtitle={
        course
          ? `Course: ${course.title}`
          : "Assignments for this course"
      }
      headerRight={
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/courses/${id}`}>
            <Button variant="ghost">Back to Course</Button>
          </Link>
          <Button variant="ghost" onClick={load}>Refresh</Button>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <AIAssistantPanel
          contextText={
            course
              ? `${course.title}\nAssignments:\n${(items || [])
                  .map((a) => `- ${a.title} (due ${fmtDate(a.dueDate)})`)
                  .join("\n")}`
              : ""
          }
          contentId={id}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No assignments" description="Check back later for new assignments." />
      ) : (
        <div role="list" style={{ display: "grid", gap: 10 }}>
          {items.map((a) => {
            const isLate = a.status === "Late";
            const tone = a.status === "Submitted" ? "success" : isLate ? "error" : "info";
            const inputRef = React.createRef();
            return (
              <div
                key={a.id}
                role="listitem"
                style={{
                  border: "1px solid rgba(17,24,39,0.06)",
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                  boxShadow: "var(--ocean-shadow)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <h4 style={{ margin: "0 0 2px" }}>{a.title}</h4>
                    <div style={{ color: "var(--ocean-muted)", fontSize: 14 }}>
                      Due: {fmtDate(a.dueDate)}
                    </div>
                  </div>
                  <Badge tone={tone}>{a.status}</Badge>
                </div>
                {a.status !== "Submitted" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {a.type === "text" ? (
                      <>
                        <label htmlFor={`entry-${a.id}`} style={{ fontSize: 14 }}>Text Entry</label>
                        <input
                          id={`entry-${a.id}`}
                          ref={inputRef}
                          type="text"
                          placeholder="Enter your response"
                          aria-label={`Text entry for ${a.title}`}
                          style={{
                            flex: 1,
                            minWidth: 240,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(17,24,39,0.12)",
                          }}
                        />
                        <Button onClick={() => onSubmit(a, "text", inputRef)}>Submit</Button>
                      </>
                    ) : (
                      <>
                        <label htmlFor={`file-${a.id}`} style={{ fontSize: 14 }}>Upload</label>
                        <input
                          id={`file-${a.id}`}
                          ref={inputRef}
                          type="file"
                          aria-label={`Upload file for ${a.title}`}
                          style={{ border: "1px dotted rgba(17,24,39,0.2)", padding: 6, borderRadius: 8 }}
                        />
                        <Button onClick={() => onSubmit(a, "upload", inputRef)}>Submit</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
