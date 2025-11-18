import React from "react";
import "../layout/layout.css";

/**
 * PUBLIC_INTERFACE
 * TopNav - Displays brand, notifications button, and user avatar/menu placeholder.
 */
export default function TopNav() {
  return (
    <header className="lms-topnav" role="banner" aria-label="Top navigation">
      <div className="lms-brand" aria-label="Application brand">
        <div className="logo" aria-hidden="true" />
        <span>EduInnovate LMS</span>
      </div>
      <div className="lms-actions">
        <button
          className="icon-btn"
          aria-label="Notifications"
          title="Notifications"
          type="button"
        >
          {/* Simple bell icon via emoji for placeholder, accessible label provided */}
          <span role="img" aria-label="bell">
            🔔
          </span>
        </button>
        <div
          className="avatar"
          role="img"
          aria-label="User profile menu"
          title="User"
        >
          U
        </div>
      </div>
    </header>
  );
}
