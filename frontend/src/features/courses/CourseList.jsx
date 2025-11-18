import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";
import { LMSClient } from "../api/client";
import { useEnrollments } from "../enrollments/EnrollmentContext";
import { Link, useSearchParams } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * CourseList - fetches and displays paginated course catalog with search/filter.
 */
export default function CourseList() {
  const { enrolledIds } = useEnrollments();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 6);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    LMSClient.listCourses({ q, page, pageSize })
      .then((res) => {
        if (!ignore) setData(res);
      })
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [q, page, pageSize]);

  const pages = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
    return { totalPages };
  }, [data?.total, pageSize]);

  const onSearch = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextQ = String(form.get("q") || "").trim();
    setSearchParams({ q: nextQ, page: "1", pageSize: String(pageSize) });
  };

  const changePage = (next) => {
    setSearchParams({ q, page: String(next), pageSize: String(pageSize) });
  };

  return (
    <Card title="📚 Courses" subtitle="Browse and enroll in courses">
      <form onSubmit={onSearch} role="search" aria-label="Course search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          name="q"
          defaultValue={q}
          aria-label="Search courses"
          placeholder="Search by title, instructor, or tag"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(17,24,39,0.12)",
          }}
        />
        <Button type="submit" ariaLabel="Search">Search</Button>
      </form>

      {loading ? (
        <Loading label="Loading courses..." />
      ) : (data.items || []).length === 0 ? (
        <EmptyState title="No courses found" description="Try adjusting your search terms" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
            gap: 12,
          }}
          role="list"
        >
          {data.items.map((c) => {
            const isEnrolled = enrolledIds.has(c.id);
            return (
              <div
                role="listitem"
                key={c.id}
                style={{
                  border: "1px solid rgba(17,24,39,0.06)",
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                  boxShadow: "var(--ocean-shadow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ margin: 0 }}>{c.title}</h3>
                  {isEnrolled && <Badge tone="success">Enrolled</Badge>}
                </div>
                <div style={{ color: "var(--ocean-muted)", fontSize: 14 }}>
                  Instructor: {c.instructor}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="course tags">
                  {(c.tags || []).map((t) => (
                    <Badge key={t} tone="info">{t}</Badge>
                  ))}
                </div>
                <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                  <Link to={`/courses/${c.id}`} aria-label={`View details for ${c.title}`}>
                    <Button variant="secondary">View</Button>
                  </Link>
                  <Link to={`/courses/${c.id}/assignments`} aria-label={`View assignments for ${c.title}`}>
                    <Button variant="ghost">Assignments</Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data.total > pageSize && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div style={{ color: "var(--ocean-muted)", fontSize: 14 }}>
            Page {page} of {pages.totalPages}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1} ariaLabel="Previous page">
              Previous
            </Button>
            <Button onClick={() => changePage(Math.min(pages.totalPages, page + 1))} disabled={page >= pages.totalPages} ariaLabel="Next page">
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
