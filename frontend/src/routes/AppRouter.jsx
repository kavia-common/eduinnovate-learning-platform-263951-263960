import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../ui/layout/AppLayout";
import Dashboard from "../pages/Dashboard";
import Forums from "../pages/Forums";
import Settings from "../pages/Settings";
import CourseList from "../features/courses/CourseList";
import CourseDetail from "../features/courses/CourseDetail";
import MyCourses from "../features/courses/MyCourses";
import CourseAssignments from "../features/assignments/CourseAssignments";

/**
 * PUBLIC_INTERFACE
 * AppRouter - Registers all routes and applies the shared AppLayout.
 * Includes LMS sections with catalog, details, enrollments, and assignments.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/courses/:id/assignments" element={<CourseAssignments />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
