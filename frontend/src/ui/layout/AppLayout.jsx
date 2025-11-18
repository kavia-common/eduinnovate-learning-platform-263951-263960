import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "../nav/TopNav";
import Sidebar from "../nav/Sidebar";
import "./layout.css";

/**
 * PUBLIC_INTERFACE
 * AppLayout - Provides top navigation, sidebar, and main content area.
 * Uses Ocean Professional theme styles and responsive behavior.
 */
export default function AppLayout() {
  return (
    <div className="lms-app">
      <TopNav />
      <div className="lms-body" role="region" aria-label="Main layout region">
        <Sidebar />
        <main className="lms-content" role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
