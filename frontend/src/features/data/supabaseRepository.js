//
// Supabase data repository for LMS data (courses, enrollments, assignments, submissions).
// Uses @supabase/supabase-js via the existing singleton client.
// If Supabase is not configured or tables are missing, functions throw a specific error
// so callers can fall back to mock/REST behaviors.
//
// PUBLIC_INTERFACE
import supabase from "../auth/supabaseClient";

/**
 * Utility to check if Supabase is configured.
 */
function isSupabaseReady() {
  return Boolean(supabase);
}

/**
 * Normalize arrays from DB that might be null.
 */
function arr(x) {
  return Array.isArray(x) ? x : x ? [x] : [];
}

/**
 * PUBLIC_INTERFACE
 * normalizeCourse - converts DB row to client course model.
 */
export function normalizeCourse(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    instructor: row.instructor,
    tags: arr(row.tags),
    description: row.description || "",
    syllabus: Array.isArray(row.syllabus) || typeof row.syllabus === "object" ? row.syllabus : [],
  };
}

/**
 * PUBLIC_INTERFACE
 * normalizeAssignment - converts DB row to client assignment model.
 */
export function normalizeAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date || row.dueDate || null,
    status: row.status || "Pending",
    type: row.type || "text",
    course_id: row.course_id,
  };
}

/**
 * PUBLIC_INTERFACE
 * normalizeSubmission - converts DB row to client submission model.
 */
export function normalizeSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    assignment_id: row.assignment_id,
    user_id: row.user_id,
    payload: row.payload || {},
    submitted_at: row.submitted_at,
    status: row.status || "submitted",
  };
}

/**
 * INTERNAL: returns current auth user id from Supabase session.
 */
async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

/**
 * PUBLIC_INTERFACE
 * listCourses - search, tags filter (basic), server-side pagination when possible.
 * @param {object} opts
 * @param {string} [opts.q]
 * @param {string[]} [opts.tags]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=10]
 * @returns {Promise<{items:any[], total:number, page:number, pageSize:number}>}
 */
export async function listCourses({ q = "", tags = [], page = 1, pageSize = 10 } = {}) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  // Attempt to query courses table
  // Tables: courses(id, title, instructor, tags (array), description, syllabus (json))
  const from = supabase.from("courses");

  // Supabase range is inclusive, end index is start + pageSize - 1
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Build base query
  let query = from.select("*", { count: "exact" });

  // Basic search across title, instructor, and tags (tags array overlaps q or direct filter)
  const trimmed = String(q || "").trim();
  if (trimmed) {
    // Use ilike for title/instructor; for tags, we'll include overlap with one-word queries
    query = query.or(`title.ilike.%${trimmed}%,instructor.ilike.%${trimmed}%`);
  }
  if (Array.isArray(tags) && tags.length) {
    // For Postgres array column, use overlaps operator
    // Supabase JS: .overlaps('tags', ['CS','Beginner'])
    query = query.overlaps("tags", tags);
  }

  // Pagination
  query = query.range(start, end);

  const { data, error, count } = await query;
  if (error) {
    // If the table does not exist or RLS prevents read, signal fallback
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  const items = (data || []).map(normalizeCourse);
  return { items, total: count || items.length, page, pageSize };
}

/**
 * PUBLIC_INTERFACE
 * getCourseById - gets a course with syllabus/sections if present.
 */
export async function getCourseById(courseId) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (error || !data) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return normalizeCourse(data);
}

/**
 * PUBLIC_INTERFACE
 * listAssignmentsByCourse - returns assignments for a course.
 */
export async function listAssignmentsByCourse(courseId) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return (data || []).map(normalizeAssignment);
}

/**
 * PUBLIC_INTERFACE
 * submitAssignment - inserts a submission record with status='submitted'.
 * payload can be text/url or other JSON.
 */
export async function submitAssignment({ assignmentId, payload }) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const user_id = await getUserId();
  if (!user_id) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  const row = {
    assignment_id: assignmentId,
    user_id,
    payload: payload || {},
    status: "submitted",
  };
  const { data, error } = await supabase.from("submissions").insert(row).select("*").single();
  if (error) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return normalizeSubmission(data);
}

/**
 * PUBLIC_INTERFACE
 * enroll - links current user to a course.
 */
export async function enroll(courseId) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const user_id = await getUserId();
  if (!user_id) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  const row = { user_id, course_id: courseId };
  const { error } = await supabase.from("enrollments").insert(row);
  if (error) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return { success: true };
}

/**
 * PUBLIC_INTERFACE
 * unenroll - removes link between current user and a course.
 */
export async function unenroll(courseId) {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const user_id = await getUserId();
  if (!user_id) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("user_id", user_id)
    .eq("course_id", courseId);
  if (error) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return { success: true };
}

/**
 * PUBLIC_INTERFACE
 * listMyCourses - returns courses joined by current user's enrollments.
 */
export async function listMyCourses() {
  if (!isSupabaseReady()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const user_id = await getUserId();
  if (!user_id) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  // First fetch enrollments
  const { data: enrolls, error: e1 } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user_id);

  if (e1) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  const ids = (enrolls || []).map((r) => r.course_id);
  if (!ids.length) return [];

  // Fetch those courses
  const { data: courses, error: e2 } = await supabase
    .from("courses")
    .select("*")
    .in("id", ids);

  if (e2) {
    throw new Error("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED");
  }
  return (courses || []).map(normalizeCourse);
}

// PUBLIC_INTERFACE
const SupabaseRepository = {
  listCourses,
  getCourseById,
  listAssignmentsByCourse,
  submitAssignment,
  enroll,
  unenroll,
  listMyCourses,
};

export default SupabaseRepository;
