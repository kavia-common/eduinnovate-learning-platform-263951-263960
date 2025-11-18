import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthClient } from "./authClient";

/**
 * PUBLIC_INTERFACE
 * AuthContext shape describing current user, role and auth actions.
 */
const AuthContext = createContext({
  user: null,
  role: "student",
  isAuthenticated: false,
  loading: true,
  login: async (_email, _password) => {},
  signup: async (_payload) => {},
  logout: async () => {},
  setRole: (_role) => {},
});

/**
 * Persistent storage key for auth session.
 */
const STORAGE_KEY = "lms.auth.session";

/**
 * PUBLIC_INTERFACE
 * AuthProvider - React provider that manages authentication state with persistence.
 */
export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  });

  const persist = useCallback((next) => {
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors silently to avoid blocking UX
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await AuthClient.login(email, password);
    const next = {
      user: res.user,
      token: res.token || null,
      role: res.user?.role || "student",
    };
    setSession(next);
    persist(next);
    return next;
  }, [persist]);

  const signup = useCallback(async ({ name, email, password, role }) => {
    const res = await AuthClient.signup({ name, email, password, role });
    const next = {
      user: res.user,
      token: res.token || null,
      role: res.user?.role || role || "student",
    };
    setSession(next);
    persist(next);
    return next;
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await AuthClient.logout();
    } catch {
      // ignore
    }
    setSession(null);
    persist(null);
  }, [persist]);

  const setRole = useCallback((role) => {
    if (!session) return;
    const next = { ...session, role, user: { ...(session.user || {}), role } };
    setSession(next);
    persist(next);
  }, [session, persist]);

  useEffect(() => {
    // Simulate silent session validation/restore
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        if (session && session.user) {
          // Optionally we could validate token here via AuthClient.me(); fall back if API is not present.
          // noop for now
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [session]);

  const value = useMemo(() => {
    return {
      user: session?.user || null,
      role: session?.role || "student",
      isAuthenticated: Boolean(session && session.user),
      loading,
      login,
      signup,
      logout,
      setRole,
    };
  }, [session, loading, login, signup, logout, setRole]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useAuth - Hook to access authentication context.
 */
export function useAuth() {
  return useContext(AuthContext);
}
