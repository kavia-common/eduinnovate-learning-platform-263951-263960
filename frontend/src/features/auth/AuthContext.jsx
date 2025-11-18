import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthClient } from "./authClient";
import supabase from "./supabaseClient";

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
 * Persistent storage key for mock/local auth session (used only when Supabase is not configured).
 */
const STORAGE_KEY = "lms.auth.session";

function deriveRoleFromUser(user, fallbackRole = "student") {
  // Prefer Supabase user_metadata.role if available
  const metaRole =
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    user?.role; // compatibility with mock
  return typeof metaRole === "string" && metaRole.trim()
    ? metaRole.trim()
    : fallbackRole;
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider - React provider that manages authentication state with persistence.
 * Uses Supabase Auth if configured; otherwise falls back to mock/local AuthClient.
 */
export function AuthProvider({ children }) {
  const supabaseAvailable = Boolean(supabase);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(() => {
    // For mock/local fallback we keep previous behavior
    if (!supabaseAvailable) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const persist = useCallback(
    (next) => {
      if (!supabaseAvailable) {
        try {
          if (next) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // ignore storage errors silently to avoid blocking UX
        }
      }
    },
    [supabaseAvailable]
  );

  const login = useCallback(
    async (email, password) => {
      if (supabaseAvailable) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            // Normalize Supabase error to throw with message code for UI
            const err = new Error(error.message || "Login failed");
            err.code = error.status || error.code || "AUTH_LOGIN_FAILED";
            throw err;
          }
          const sbUser = data.user || null;
          const role = deriveRoleFromUser(sbUser, "student");
          const next = { user: sbUser, role, token: data.session?.access_token || null };
          setSession(next);
          return next;
        } catch (e) {
          // Rethrow a clean error with message only (no PII)
          const err = new Error(e?.message || "Login failed");
          err.code = e?.code || "AUTH_LOGIN_FAILED";
          throw err;
        }
      }
      // Fallback to mock
      const res = await AuthClient.login(email, password);
      const next = {
        user: res.user,
        token: res.token || null,
        role: res.user?.role || "student",
      };
      setSession(next);
      persist(next);
      return next;
    },
    [persist, supabaseAvailable]
  );

  const signup = useCallback(
    async ({ name, email, password, role }) => {
      const selectedRole = ["student", "educator"].includes(role) ? role : "student";
      if (supabaseAvailable) {
        try {
          // Include user_metadata.role so we can read it later without a separate roles table
          const emailRedirectTo =
            process.env.REACT_APP_FRONTEND_URL ||
            window.location.origin ||
            undefined;

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                name,
                role: selectedRole,
              },
            },
          });
          if (error) {
            const err = new Error(error.message || "Signup failed");
            err.code = error.status || error.code || "AUTH_SIGNUP_FAILED";
            throw err;
          }
          const sbUser = data.user || null;
          // Some projects require email confirmation. The session may be null until confirmed.
          const effectiveUser = sbUser
            ? { ...sbUser, user_metadata: { ...(sbUser.user_metadata || {}), name, role: selectedRole } }
            : null;
          const nextRole = deriveRoleFromUser(effectiveUser, selectedRole);
          const next = {
            user: effectiveUser,
            token: data.session?.access_token || null,
            role: nextRole,
          };
          setSession(next);
          return next;
        } catch (e) {
          const err = new Error(e?.message || "Signup failed");
          err.code = e?.code || "AUTH_SIGNUP_FAILED";
          throw err;
        }
      }
      // Fallback to mock
      const res = await AuthClient.signup({ name, email, password, role: selectedRole });
      const next = {
        user: res.user,
        token: res.token || null,
        role: res.user?.role || selectedRole,
      };
      setSession(next);
      persist(next);
      return next;
    },
    [persist, supabaseAvailable]
  );

  const logout = useCallback(
    async () => {
      try {
        if (supabaseAvailable) {
          await supabase.auth.signOut();
        } else {
          await AuthClient.logout();
        }
      } catch {
        // ignore
      }
      setSession(null);
      persist(null);
    },
    [persist, supabaseAvailable]
  );

  const setRole = useCallback(
    async (role) => {
      if (!session) return;
      const normalized = ["student", "educator"].includes(role) ? role : "student";
      if (supabaseAvailable) {
        try {
          // Update user metadata with new role
          const { data, error } = await supabase.auth.updateUser({
            data: { role: normalized },
          });
          if (error) throw error;
          const updatedUser = data.user || session.user;
          const next = { ...session, role: deriveRoleFromUser(updatedUser, normalized), user: updatedUser };
          setSession(next);
          return next;
        } catch {
          // If update fails, do not change local state
          return session;
        }
      }
      // Mock/local update
      const next = { ...session, role: normalized, user: { ...(session.user || {}), role: normalized } };
      setSession(next);
      persist(next);
      return next;
    },
    [session, persist, supabaseAvailable]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    if (!supabaseAvailable) {
      // Preserve previous local session behavior
      setLoading(false);
      return () => { ignore = true; };
    }

    // Supabase: fetch current session and subscribe to changes
    (async () => {
      try {
        const { data: { session: current } } = await supabase.auth.getSession();
        const currentUser = current?.user || null;
        if (!ignore) {
          if (currentUser) {
            const role = deriveRoleFromUser(currentUser, "student");
            setSession({ user: currentUser, role, token: current?.access_token || null });
          } else {
            setSession(null);
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (ignore) return;
      const sbUser = sbSession?.user || null;
      if (sbUser) {
        const role = deriveRoleFromUser(sbUser, "student");
        setSession({ user: sbUser, role, token: sbSession?.access_token || null });
      } else {
        setSession(null);
      }
    });

    return () => {
      ignore = true;
      try {
        subscription?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [supabaseAvailable]);

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
