import React from "react";
import "../layout/layout.css";
import { Link } from "react-router-dom";
import Button from "../../features/ui/Button";
import Badge from "../../features/ui/Badge";
import { useAuth } from "../../features/auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * TopNav - Displays brand, auth-aware actions, and educator role badge if applicable.
 */
export default function TopNav() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const displayName = user?.name || user?.user_metadata?.name || user?.email || "U";
  const initials = String(displayName).slice(0, 1).toUpperCase();

  return (
    <header className="lms-topnav" role="banner" aria-label="Top navigation">
      <div className="lms-brand" aria-label="Application brand">
        <div className="logo" aria-hidden="true" />
        <span>EduInnovate LMS</span>
        {isAuthenticated && role === "educator" ? (
          <div style={{ marginLeft: 8 }}>
            <Badge tone="info">Educator</Badge>
          </div>
        ) : null}
      </div>
      <div className="lms-actions">
        <button
          className="icon-btn"
          aria-label="Notifications"
          title="Notifications"
          type="button"
        >
          <span role="img" aria-label="bell">
            🔔
          </span>
        </button>
        {isAuthenticated ? (
          <>
            <Link to="/profile" aria-label="Profile">
              <div
                className="avatar"
                role="img"
                aria-label="User profile"
                title={displayName}
              >
                {initials}
              </div>
            </Link>
            <Button variant="ghost" onClick={logout} ariaLabel="Logout">
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="secondary" ariaLabel="Login">Login</Button>
            </Link>
            <Link to="/signup">
              <Button ariaLabel="Signup">Sign Up</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
