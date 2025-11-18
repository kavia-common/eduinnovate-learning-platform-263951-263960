import React from "react";
import { NavLink } from "react-router-dom";
import "../layout/layout.css";

/**
 * PUBLIC_INTERFACE
 * Sidebar - Left navigation menu linking to the main feature areas.
 */
export default function Sidebar() {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/courses", label: "Courses", icon: "📚" },
    { to: "/assignments", label: "Assignments", icon: "📝" },
    { to: "/forums", label: "Forums", icon: "💬" },
    { to: "/settings", label: "Settings", icon: "⚙️" },
  ];

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
