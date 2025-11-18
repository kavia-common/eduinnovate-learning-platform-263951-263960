import React from "react";
import { NavLink } from "react-router-dom";
import "../layout/layout.css";
import { useAuth } from "../../features/auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * Sidebar - Left navigation menu linking to the main feature areas.
 * Shows educator link when role=educator and My Courses only when logged in.
 */
export default function Sidebar() {
  const { isAuthenticated, role } = useAuth();

  const baseLinks = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/courses", label: "Courses", icon: "📚" },
    { to: "/forums", label: "Forums", icon: "💬" },
    { to: "/settings", label: "Settings", icon: "⚙️" },
  ];

  const authedLinks = isAuthenticated
    ? [{ to: "/my-courses", label: "My Courses", icon: "🎓" }]
    : [];

  const educatorLinks = isAuthenticated && role === "educator"
    ? [{ to: "/educator", label: "Educator Panel", icon: "🧑‍🏫" }]
    : [];

  const links = [...baseLinks.slice(0, 2), ...authedLinks, ...baseLinks.slice(2), ...educatorLinks];

  return (
    <nav className="lms-sidebar" aria-label="Sidebar">
      <div className="nav-group" role="list">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
            role="listitem"
          >
            <span aria-hidden="true">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
