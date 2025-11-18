import React, { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useAuth } from "./AuthContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useToast } from "../ui/ToastContext";

/**
 * PUBLIC_INTERFACE
 * Login page - email/password with validation and redirect handling.
 */
export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      e.email = "Please enter a valid email address";
    }
    if (!form.password || form.password.length < 4) {
      e.password = "Password must be at least 4 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (ev) => {
    setForm((f) => ({ ...f, [ev.target.name]: ev.target.value }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      showToast("Welcome back!", { tone: "success" });
      const from = location.state?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (e) {
      showToast("Login failed. Check your credentials.", { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="🔐 Login" subtitle="Access your account">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <div>
          <label htmlFor="email" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)" }}
          />
          {errors.email && <div style={{ color: "var(--ocean-error)", fontSize: 13 }}>{errors.email}</div>}
        </div>
        <div>
          <label htmlFor="password" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)" }}
          />
          {errors.password && <div style={{ color: "var(--ocean-error)", fontSize: 13 }}>{errors.password}</div>}
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </Button>
        <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>
          New here? <Link to="/signup">Create an account</Link>
        </div>
      </form>
    </Card>
  );
}
