import React from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { useAuth } from "./AuthContext";

/**
 * PUBLIC_INTERFACE
 * Profile page - displays basic user info and allows logout.
 */
export default function Profile() {
  const { user, role, logout } = useAuth();
  const displayName =
    user?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    "—";

  return (
    <Card
      title="👤 Profile"
      subtitle="Your account information"
      headerRight={<Badge tone="info">{role}</Badge>}
    >
      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Name</div>
          <div style={{ fontWeight: 600 }}>{displayName}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Email</div>
          <div style={{ fontWeight: 600 }}>{user?.email || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Role</div>
          <div style={{ fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
            <Badge tone="info">{role}</Badge>
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <Button variant="danger" onClick={logout} ariaLabel="Logout">
            Logout
          </Button>
        </div>
      </div>
    </Card>
  );
}
