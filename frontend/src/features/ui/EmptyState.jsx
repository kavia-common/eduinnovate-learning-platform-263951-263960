import React from "react";
import Button from "./Button";

/**
 * PUBLIC_INTERFACE
 * EmptyState - friendly 'no data' message with optional action.
 */
export default function EmptyState({ title = "Nothing here yet", description, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 8px", color: "var(--ocean-muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 6 }} aria-hidden="true">🌊</div>
      <h3 style={{ margin: "0 0 6px", color: "var(--ocean-text)" }}>{title}</h3>
      {description && <p style={{ margin: "0 0 12px" }}>{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" ariaLabel={actionLabel}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
