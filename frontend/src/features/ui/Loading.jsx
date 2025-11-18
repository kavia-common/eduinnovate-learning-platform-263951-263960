import React from "react";

/**
 * PUBLIC_INTERFACE
 * Loading - centered spinner placeholder.
 */
export default function Loading({ label = "Loading..." }) {
  return (
    <div role="status" aria-label={label} style={{ padding: 20, textAlign: "center" }}>
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid rgba(37,99,235,0.2)",
          borderTopColor: "var(--ocean-primary)",
          margin: "0 auto 8px",
          animation: "spin 1s linear infinite",
        }}
      />
      <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>{label}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
