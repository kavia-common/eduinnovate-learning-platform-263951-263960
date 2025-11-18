//
//
// API client for LMS frontend.
// Reads REACT_APP_API_BASE via config; if not set OR unreachable, falls back to mock data.
// If Supabase is configured, future iterations can read/write via Supabase tables.
// No secrets are hardcoded; environment variables are used only.
 // PUBLIC_INTERFACE
import { apiUrl, getApiBase } from "../../config/config";
import supabase from "../auth/supabaseClient";
import SupabaseRepository from "../data/supabaseRepository";

// Simple in-memory mock store to simulate server state (courses, enrollments, assignments)
const mockDB = (() => {
  const courses = [
    {
      id: "c-101",
      title: "Introduction to Computer Science",
      instructor: "Dr. Alice Johnson",
      tags: ["CS", "Beginner", "Programming"],
      description:
        "Learn the fundamentals of computer science with a focus on problem solving and programming concepts.",
      syllabus: [
        { week: 1, title: "Algorithms & Problem Solving" },
        { week: 2, title: "Variables, Types, and Control Flow" },
        { week: 3, title: "Functions and Modularization" },
        { week: 4, title: "Data Structures Basics" },
      ],
    },
    {
      id: "c-202",
      title: "Data Structures and Algorithms",
      instructor: "Prof. Brian Smith",
      tags: ["CS", "Intermediate", "DSA"],
      description:
        "Study common data structures and algorithms used in technical interviews and real systems.",
      syllabus: [
        { week: 1, title: "Complexity Analysis" },
        { week: 2, title: "Arrays, Linked Lists" },
        { week: 3, title: "Stacks, Queues, Hash Maps" },
        { week: 4, title: "Trees and Graphs" },
      ],
    },
    {
      id: "c-303",
      title: "User Experience Design",
      instructor: "Dr. Carol Lee",
      tags: ["Design", "UX", "Beginner"],
      description:
        "Craft compelling user experiences with research-driven design and usability heuristics.",
      syllabus: [
        { week: 1, title: "Design Thinking" },
        { week: 2, title: "User Research" },
        { week: 3, title: "Interaction Design" },
        { week: 4, title: "Usability Testing" },
      ],
    },
  ];

  const assignments = {
    "c-101": [
      {
        id: "a-101-1",
        title: "Intro Coding Exercise",
        dueDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
        status: "Pending",
        type: "text",
      },
      {
        id: "a-101-2",
        title: "Algorithm Worksheet",
        dueDate: new Date(Date.now() - 86400000).toISOString(), // -1 day
        status: "Late",
        type: "upload",
      },
    ],
    "c-202": [
      {
        id: "a-202-1",
        title: "Time Complexity Quiz",
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        status: "Pending",
        type: "text",
      },
    ],
    "c-303": [
      {
        id: "a-303-1",
        title: "Heuristic Evaluation",
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        status: "Pending",
        type: "upload",
      },
    ],
  };

  // Persist enrollments in memory for session; a real app would use auth-bound storage
  let enrollments = new Set();

  return {
    listCourses: () => courses.slice(),
    getCourse: (id) => courses.find((c) => c.id === id) || null,
    searchCourses: ({ q = "", tags = [] }) => {
      const query = q.trim().toLowerCase();
      const tagSet = new Set(tags.map((t) => String(t).toLowerCase()));
      return courses.filter((c) => {
        const matchQ =
          !query ||
          c.title.toLowerCase().includes(query) ||
          c.instructor.toLowerCase().includes(query) ||
          c.tags.some((t) => t.toLowerCase().includes(query));
        const matchTags =
          tagSet.size === 0 ||
          c.tags.some((t) => tagSet.has(t.toLowerCase()));
        return matchQ && matchTags;
      });
    },
    getAssignments: (courseId) => assignments[courseId] || [],
    getEnrollments: () => Array.from(enrollments),
    enroll: (courseId) => {
      enrollments.add(courseId);
      return { success: true };
    },
    unenroll: (courseId) => {
      enrollments.delete(courseId);
      return { success: true };
    },
    submitAssignment: (courseId, assignmentId, payload) => {
      const list = assignments[courseId] || [];
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          status: "Submitted",
          submittedAt: new Date().toISOString(),
          // Avoid storing large text content; keep minimal metadata in mock
          payload: payload ? { ...payload, content: undefined } : undefined,
        };
        return { success: true };
      }
      return { success: false, error: "Assignment not found" };
    },
  };
})();

/**
 * PUBLIC_INTERFACE
 * apiFetch - wrapper around fetch that uses configured API base.
 * If base URL is unavailable or network/CORS fails, throws specific error codes
 * so callers can fall back to mock mode without causing uncaught TypeErrors.
 * @param {string} path - API path beginning with "/"
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} parsed JSON
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  if (!base) {
    // eslint-disable-next-line no-console
    console.warn(
      "[LMS API] API base not set; using mock data for:",
      path
    );
    throw new Error("NO_API_BASE");
  }

  let res;
  try {
    res = await fetch(apiUrl(path), {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    // Catch low-level fetch failures: CORS, network down, DNS, mixed content (HTTP on HTTPS)
    // eslint-disable-next-line no-console
    console.warn("[LMS API] Fetch failed; falling back to mock if supported:", {
      path,
      message: err?.message || String(err),
    });
    throw new Error("API_UNREACHABLE");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 401/403/5xx can be handled by callers as needed; not falling back to mock automatically here
    throw new Error(`API_ERROR ${res.status}: ${text || res.statusText}`);
  }

  if (res.status === 204) return null;

  // Robust JSON parse with guard
  try {
    return await res.json();
  } catch {
    // In case of invalid JSON
    throw new Error("API_INVALID_JSON");
  }
}

/**
 * PUBLIC_INTERFACE
 * LMSClient - high-level API with graceful mock fallback.
 */
export const LMSClient = {
  /**
   * INTERNAL NOTE: When Supabase is configured, future agents can implement:
   * - Courses table: select with ilike filters for q and tags join table
   * - Use RLS bound to auth user
   * For now, we keep REST/mocks behavior and only add placeholders.
   */

  /** List courses with optional search/filter and pagination (client-side for mock). */
  async listCourses({ q = "", tags = [], page = 1, pageSize = 10 } = {}) {
    // Prefer Supabase if configured
    if (supabase) {
      try {
        return await SupabaseRepository.listCourses({ q, tags, page, pageSize });
      } catch (e) {
        const errMsg = String(e?.message || e);
        // Fall back if tables are missing or not authorized or supabase not configured
        if (
          errMsg.includes("SUPABASE_NOT_CONFIGURED") ||
          errMsg.includes("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED")
        ) {
          // continue to REST/mock flow
        } else {
          // Unknown Supabase error -> continue to REST/mock
        }
      }
    }
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      tags.forEach((t) => params.append("tag", t));
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return await apiFetch(`/courses?${params.toString()}`);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("NO_API_BASE") || msg.includes("API_UNREACHABLE")) {
        const all = mockDB.searchCourses({ q, tags });
        const start = (page - 1) * pageSize;
        const items = all.slice(start, start + pageSize);
        return {
          items,
          total: all.length,
          page,
          pageSize,
        };
      }
      throw e;
    }
  },

  /** Get course detail by id. */
  async getCourse(id) {
    if (supabase) {
      try {
        return await SupabaseRepository.getCourseById(id);
      } catch (e) {
        const errMsg = String(e?.message || e);
        if (
          errMsg.includes("SUPABASE_NOT_CONFIGURED") ||
          errMsg.includes("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED")
        ) {
          // proceed to REST/mock
        } else {
          // proceed to REST/mock
        }
      }
    }
    try {
      return await apiFetch(`/courses/${encodeURIComponent(id)}`);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("NO_API_BASE") || msg.includes("API_UNREACHABLE")) {
        const c = mockDB.getCourse(id);
        if (!c) throw new Error("NOT_FOUND");
        return c;
      }
      throw e;
    }
  },

  /** Get assignments for a course. */
  async getAssignments(courseId) {
    if (supabase) {
      try {
        return await SupabaseRepository.listAssignmentsByCourse(courseId);
      } catch (e) {
        const errMsg = String(e?.message || e);
        if (
          errMsg.includes("SUPABASE_NOT_CONFIGURED") ||
          errMsg.includes("SUPABASE_TABLE_MISSING_OR_UNAUTHORIZED")
        ) {
          // fallback to REST/mock
        } else {
          // fallback
        }
      }
    }
    try {
      return await apiFetch(
        `/courses/${encodeURIComponent(courseId)}/assignments`
      );
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("NO_API_BASE") || msg.includes("API_UNREACHABLE")) {
        return mockDB.getAssignments(courseId);
      }
      throw e;
    }
  },

  /** Enroll in course. */
  async enroll(courseId) {
    if (supabase) {
      try {
        return await SupabaseRepository.enroll(courseId);
      } catch (e) {
        if (e?.code === "AUTH_REQUIRED") throw e;
        const errMsg = String(e?.message || e);
        if (errMsg.includes("SUPABASE_NOT_CONFIGURED")) {
          // If Supabase not configured, allow mock fallback below
        } else {
          // Table/policy missing -> surface to UI; do not call REST auth endpoints
          throw e;
        }
      }
    }
    // Supabase not configured: allow mock enrollment without REST
    return mockDB.enroll(courseId);
  },

  /** Unenroll from course. */
  async unenroll(courseId) {
    if (supabase) {
      try {
        return await SupabaseRepository.unenroll(courseId);
      } catch (e) {
        if (e?.code === "AUTH_REQUIRED") throw e;
        const errMsg = String(e?.message || e);
        if (errMsg.includes("SUPABASE_NOT_CONFIGURED")) {
          // allow mock fallback
        } else {
          throw e;
        }
      }
    }
    return mockDB.unenroll(courseId);
  },

  /** Get current enrollments for "user". In real app, bound to auth. */
  async myCourses() {
    if (supabase) {
      try {
        return await SupabaseRepository.listMyCourses();
      } catch (e) {
        if (e?.code === "AUTH_REQUIRED") throw e;
        const errMsg = String(e?.message || e);
        if (errMsg.includes("SUPABASE_NOT_CONFIGURED")) {
          // allow mock fallback
        } else {
          throw e;
        }
      }
    }
    const ids = mockDB.getEnrollments();
    return ids.map((id) => mockDB.getCourse(id)).filter(Boolean);
  },

  /** Submit an assignment (supports text or file metadata placeholder). */
  async submitAssignment(courseId, assignmentId, payload) {
    if (supabase) {
      try {
        const res = await SupabaseRepository.submitAssignment({
          assignmentId,
          payload: payload || {},
        });
        return { success: Boolean(res?.id) };
      } catch (e) {
        if (e?.code === "AUTH_REQUIRED") throw e;
        const errMsg = String(e?.message || e);
        if (errMsg.includes("SUPABASE_NOT_CONFIGURED")) {
          // allow mock fallback
        } else {
          throw e;
        }
      }
    }
    return mockDB.submitAssignment(courseId, assignmentId, payload);
  },
};
