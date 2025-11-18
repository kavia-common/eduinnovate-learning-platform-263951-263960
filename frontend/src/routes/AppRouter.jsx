import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../ui/layout/AppLayout";
import Dashboard from "../pages/Dashboard";
import Courses from "../pages/Courses";
import Assignments from "../pages/Assignments";
import Forums from "../pages/Forums";
import Settings from "../pages/Settings";

/**
 * PUBLIC_INTERFACE
 * AppRouter - Registers all routes and applies the shared AppLayout.
 * Includes placeholders for LMS sections.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
