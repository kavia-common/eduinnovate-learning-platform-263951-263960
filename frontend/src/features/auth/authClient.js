import { apiFetch } from "../api/client";
import { getApiBase } from "../../config/config";

/**
 * Local mock DB for auth when REACT_APP_API_BASE is not provided.
 * For demonstration only; stores users in memory and does NOT persist.
 */
const mockAuthDB = (() => {
  const users = [
    { id: "u-student", name: "Sam Student", email: "student@example.com", role: "student" },
    { id: "u-educator", name: "Eve Educator", email: "educator@example.com", role: "educator" },
  ];
  // In-memory tokens map token -> userId (for mock only)
  const tokens = new Map();

  function findByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  function issueToken(user) {
    const t = `mock-${user.id}-${Date.now()}`;
    tokens.set(t, user.id);
    return t;
  }

  return {
    async login(email, _password) {
      // Accept any password for mock
      let u = findByEmail(email);
      if (!u) {
        // Auto-create student for unknown email in mock
        u = { id: `u-${Math.random().toString(36).slice(2, 8)}`, name: email.split("@")[0], email, role: "student" };
        users.push(u);
      }
      const token = issueToken(u);
      return { user: u, token };
    },
    async signup({ name, email, role }) {
      let existing = findByEmail(email);
      if (existing) {
        return { user: existing, token: issueToken(existing) };
      }
      const u = { id: `u-${Math.random().toString(36).slice(2, 8)}`, name, email, role: role || "student" };
      users.push(u);
      const token = issueToken(u);
      return { user: u, token };
    },
    async logout() {
      // stateless in mock
      return { success: true };
    },
    async me(token) {
      if (!token) return null;
      const id = tokens.get(token);
      if (!id) return null;
      const user = users.find((u) => u.id === id) || null;
      return user;
    },
  };
})();

/**
 * PUBLIC_INTERFACE
 * AuthClient - Authentication API with graceful mock fallback if API base is not configured.
 */
export const AuthClient = {
  /**
   * PUBLIC_INTERFACE
   * Login with email and password.
   */
  async login(email, password) {
    const hasApi = Boolean(getApiBase());
    if (!hasApi) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] API base not set; using mock login");
      return mockAuthDB.login(email, password);
    }
    return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  /**
   * PUBLIC_INTERFACE
   * Signup with basic info and role.
   */
  async signup({ name, email, password, role }) {
    const hasApi = Boolean(getApiBase());
    if (!hasApi) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] API base not set; using mock signup");
      return mockAuthDB.signup({ name, email, password, role });
    }
    return apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
  },

  /**
   * PUBLIC_INTERFACE
   * Logout current session.
   */
  async logout() {
    const hasApi = Boolean(getApiBase());
    if (!hasApi) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] API base not set; using mock logout");
      return mockAuthDB.logout();
    }
    return apiFetch("/auth/logout", { method: "POST" });
  },

  /**
   * PUBLIC_INTERFACE
   * Retrieve current user using token if supported.
   */
  async me(token) {
    const hasApi = Boolean(getApiBase());
    if (!hasApi) {
      return mockAuthDB.me(token);
    }
    return apiFetch("/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  },
};
