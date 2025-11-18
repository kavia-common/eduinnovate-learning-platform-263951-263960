import React from "react";
import "../../ui/layout/layout.css";

/**
 * PUBLIC_INTERFACE
 * Card - Container with Ocean Professional surface style.
 */
export default function Card({ title, subtitle, children, className = "", headerRight = null }) {
  return (
    <section className={`page-card ${className}`} role="region" aria-label={title || "Card"}>
      {(title || subtitle || headerRight) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            {title && <h2 className="page-title" style={{ marginBottom: 4 }}>{title}</h2>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {headerRight ? <div>{headerRight}</div> : null}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
