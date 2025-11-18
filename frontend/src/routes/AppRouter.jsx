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
import Login from "../features/auth/Login";
import Signup from "../features/auth/Signup";
import Profile from "../features/auth/Profile";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import NotesListPage from "../features/notes/NotesListPage";
import ShareNotePage from "../features/notes/ShareNotePage";

/**
 * PUBLIC_INTERFACE
 * AppRouter - Registers all routes and applies the shared AppLayout.
 * Includes LMS sections with catalog, details, enrollments, and assignments.
 * Adds auth routes and protection for sensitive views.
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
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id/assignments"
            element={
              <ProtectedRoute>
                <CourseAssignments />
              </ProtectedRoute>
            }
          />
          <Route path="/forums" element={<Forums />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/notes" element={<NotesListPage />} />
          <Route path="/share/:id" element={<ShareNotePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
