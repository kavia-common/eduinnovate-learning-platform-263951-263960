import React from "react";
import "../ui/layout/layout.css";
import { useFeatureFlag } from "../hooks/useFeatureFlag";

/**
 * PUBLIC_INTERFACE
 * Dashboard page placeholder with feature flag example.
 */
export default function Dashboard() {
  const showWelcome = useFeatureFlag("showWelcome", true);

  return (
    <section className="page-card" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="page-title">
        📊 Dashboard
      </h1>
      <p className="page-subtitle">Overview of your learning activity</p>
      {showWelcome ? (
        <p>Welcome back! Explore your courses and track your assignments.</p>
      ) : (
        <p>Explore your courses and track your assignments.</p>
      )}
    </section>
  );
}
