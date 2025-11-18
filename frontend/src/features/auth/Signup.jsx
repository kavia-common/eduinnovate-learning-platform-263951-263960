import React, { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../ui/ToastContext";

/**
 * PUBLIC_INTERFACE
 * Signup page - create an account with role selection (student | educator).
 */
export default function Signup() {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) {
      e.name = "Please enter your name";
    }
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      e.email = "Please enter a valid email";
    }
    if (!form.password || form.password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }
    if (!["student", "educator"].includes(form.role)) {
      e.role = "Select a valid role";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (ev) => {
    const { name, value } = ev.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await signup(form);
      // If email confirmation is enabled, Supabase may not return a session
      if (!res?.token) {
        showToast("Account created. Please check your email to confirm before signing in.", { tone: "info", duration: 5000 });
        navigate("/login", { replace: true });
      } else {
        showToast("Account created!", { tone: "success" });
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      const msg = e?.message || "Signup failed. Try again.";
      showToast(msg, { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="🧭 Create Account" subtitle="Join EduInnovate LMS">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 480 }}>
        <div>
          <label htmlFor="name" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Full Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Jane Doe"
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)" }}
          />
          {errors.name && <div style={{ color: "var(--ocean-error)", fontSize: 13 }}>{errors.name}</div>}
        </div>
        <div>
          <label htmlFor="email" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
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
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)" }}
          />
          {errors.password && <div style={{ color: "var(--ocean-error)", fontSize: 13 }}>{errors.password}</div>}
        </div>
        <div>
          <label htmlFor="role" style={{ fontSize: 14, color: "var(--ocean-muted)" }}>Role</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={onChange}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,24,39,0.12)", background: "white" }}
          >
            <option value="student">Student</option>
            <option value="educator">Educator</option>
          </select>
          {errors.role && <div style={{ color: "var(--ocean-error)", fontSize: 13 }}>{errors.role}</div>}
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </Button>
        <div style={{ fontSize: 14, color: "var(--ocean-muted)" }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </Card>
  );
}
