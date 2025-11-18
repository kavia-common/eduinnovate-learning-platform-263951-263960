import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Loading from "../ui/Loading";
import { LMSClient } from "../api/client";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEnrollments } from "../enrollments/EnrollmentContext";
import { useToast } from "../ui/ToastContext";
import { useAuth } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * CourseDetail - shows syllabus, instructor info, and enroll/unenroll.
 */
export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const { enrolledIds, enroll, unenroll } = useEnrollments();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    LMSClient.getCourse(id)
      .then((c) => !ignore && setCourse(c))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id]);

  const isEnrolled = enrolledIds.has(id);

  const ensureAuth = () => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location.pathname + location.search } });
      return false;
    }
    return true;
  };

  const onToggle = async () => {
    try {
      if (!ensureAuth()) return;
      if (isEnrolled) {
        await unenroll(id);
        showToast("Unenrolled successfully", { tone: "success" });
      } else {
        await enroll(id);
        showToast("Enrolled successfully", { tone: "success" });
      }
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED")) {
        showToast("Enrollments not available yet. Using fallback if configured.", { tone: "warning" });
      } else if (msg.includes("AUTH_REQUIRED")) {
        showToast("Please login to manage enrollments.", { tone: "warning" });
      } else {
        showToast("Action failed. Please try again.", { tone: "error" });
      }
    }
  };

  if (loading) return <Loading label="Loading course..." />;
  if (!course) {
    return (
      <Card title="Course not found">
        <p>We couldn't find that course.</p>
        <Link to="/courses">
          <Button variant="secondary">Back to Courses</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card
      title={`📘 ${course.title}`}
      subtitle={`Instructor: ${course.instructor}`}
      headerRight={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to={`/courses/${course.id}/assignments`}>
            <Button variant="ghost">Assignments</Button>
          </Link>
          <Button onClick={onToggle} variant={isEnrolled ? "danger" : "primary"} ariaLabel={isEnrolled ? "Unenroll" : "Enroll"}>
            {isEnrolled ? "Unenroll" : "Enroll"}
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(course.tags || []).map((t) => (
          <Badge key={t} tone="info">
            {t}
          </Badge>
        ))}
      </div>
      <p style={{ marginTop: 0 }}>{course.description}</p>
      <h3 style={{ marginBottom: 8 }}>Syllabus</h3>
      <ol aria-label="Course syllabus" style={{ paddingLeft: 18, marginTop: 0 }}>
        {(course.syllabus || []).map((s) => (
          <li key={s.week} style={{ marginBottom: 6 }}>
            Week {s.week}: {s.title}
          </li>
        ))}
      </ol>
    </Card>
  );
}
