import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { LMSClient } from "../api/client";
import { Link } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * MyCourses - displays user enrollments.
 */
export default function MyCourses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    LMSClient.myCourses()
      .then((cs) => setItems(cs || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card title="🎓 My Courses" subtitle="Your current enrollments" headerRight={<Button variant="ghost" onClick={load}>Refresh</Button>}>
      {loading ? (
        <Loading label="Loading your courses..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No enrollments yet"
          description="Browse the catalog and enroll in courses to get started."
          actionLabel="Browse Courses"
          onAction={() => {
            window.location.href = "/courses";
          }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
            gap: 12,
          }}
          role="list"
        >
          {items.map((c) => (
            <div key={c.id} role="listitem" style={{ border: "1px solid rgba(17,24,39,0.06)", borderRadius: 12, padding: 14, background: "white", boxShadow: "var(--ocean-shadow)" }}>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{c.title}</h3>
              <div style={{ color: "var(--ocean-muted)", fontSize: 14, marginBottom: 8 }}>
                Instructor: {c.instructor}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {(c.tags || []).map((t) => (
                  <Badge key={t} tone="info">{t}</Badge>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link to={`/courses/${c.id}`}>
                  <Button variant="secondary">Open</Button>
                </Link>
                <Link to={`/courses/${c.id}/assignments`}>
                  <Button variant="ghost">Assignments</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
