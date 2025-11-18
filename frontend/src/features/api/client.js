//
// API client for LMS frontend.
// Reads REACT_APP_API_BASE via config; if not set, falls back to mock data with console warning.
// No secrets are hardcoded; environment variables are used only.
// PUBLIC_INTERFACE
import { apiUrl, getApiBase } from "../../config/config";

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
        list[idx] = { ...list[idx], status: "Submitted", submittedAt: new Date().toISOString(), payload: payload ? { ...payload, content: undefined } : undefined };
        return { success: true };
      }
      return { success: false, error: "Assignment not found" };
    },
  };
})();

/**
 * PUBLIC_INTERFACE
 * apiFetch - wrapper around fetch that uses configured API base.
 * If base URL is unavailable, throws to allow mock fallback in higher-level functions.
 * @param {string} path - API path beginning with "/"
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} parsed JSON
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  if (!base) {
    // eslint-disable-next-line no-console
    console.warn(
      "[LMS API] REACT_APP_API_BASE not set; using mock data for:",
      path
    );
    throw new Error("NO_API_BASE");
  }
  const res = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API_ERROR ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * LMSClient - high-level API with graceful mock fallback.
 */
export const LMSClient = {
  /** List courses with optional search/filter and pagination (client-side for mock). */
  async listCourses({ q = "", tags = [], page = 1, pageSize = 10 } = {}) {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      tags.forEach((t) => params.append("tag", t));
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return await apiFetch(`/courses?${params.toString()}`);
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
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
    try {
      return await apiFetch(`/courses/${encodeURIComponent(id)}`);
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        const c = mockDB.getCourse(id);
        if (!c) throw new Error("NOT_FOUND");
        return c;
      }
      throw e;
    }
  },

  /** Get assignments for a course. */
  async getAssignments(courseId) {
    try {
      return await apiFetch(`/courses/${encodeURIComponent(courseId)}/assignments`);
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        return mockDB.getAssignments(courseId);
      }
      throw e;
    }
  },

  /** Enroll in course. */
  async enroll(courseId) {
    try {
      return await apiFetch(`/courses/${encodeURIComponent(courseId)}/enroll`, {
        method: "POST",
      });
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        return mockDB.enroll(courseId);
      }
      throw e;
    }
  },

  /** Unenroll from course. */
  async unenroll(courseId) {
    try {
      return await apiFetch(`/courses/${encodeURIComponent(courseId)}/unenroll`, {
        method: "POST",
      });
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        return mockDB.unenroll(courseId);
      }
      throw e;
    }
  },

  /** Get current enrollments for "user". In real app, bound to auth. */
  async myCourses() {
    try {
      return await apiFetch(`/me/courses`);
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        const ids = mockDB.getEnrollments();
        return ids
          .map((id) => mockDB.getCourse(id))
          .filter(Boolean);
      }
      throw e;
    }
  },

  /** Submit an assignment (supports text or file metadata placeholder). */
  async submitAssignment(courseId, assignmentId, payload) {
    try {
      return await apiFetch(
        `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions`,
        { method: "POST", body: JSON.stringify(payload || {}) }
      );
    } catch (e) {
      if (String(e.message).includes("NO_API_BASE")) {
        return mockDB.submitAssignment(courseId, assignmentId, payload);
      }
      throw e;
    }
  },
};
