import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * PUBLIC_INTERFACE
 * RoleProtected - Gated rendering for specific roles. Redirects to /dashboard if not allowed.
 */
export default function RoleProtected({ allow = ["student", "educator"], children }) {
  const { role, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
