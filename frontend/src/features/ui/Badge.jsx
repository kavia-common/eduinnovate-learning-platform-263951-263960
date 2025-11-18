import React from "react";

/**
 * PUBLIC_INTERFACE
 * Badge - Small status chip.
 * @param {"info"|"success"|"warning"|"error"} tone
 */
export default function Badge({ tone = "info", children }) {
  const styles = {
    info: {
      background: "rgba(37,99,235,0.12)",
      color: "#1e3a8a",
      border: "1px solid rgba(37,99,235,0.25)",
    },
    success: {
      background: "rgba(245,158,11,0.12)",
      color: "#92400e",
      border: "1px solid rgba(245,158,11,0.25)",
    },
    warning: {
      background: "rgba(245,158,11,0.12)",
      color: "#92400e",
      border: "1px solid rgba(245,158,11,0.25)",
    },
    error: {
      background: "rgba(239,68,68,0.12)",
      color: "#7f1d1d",
      border: "1px solid rgba(239,68,68,0.25)",
    },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 999,
        ...styles,
      }}
      aria-label={`Status: ${children}`}
    >
      {children}
    </span>
  );
}
