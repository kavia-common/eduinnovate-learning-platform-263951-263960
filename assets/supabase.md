# Supabase Integration - EduInnovate LMS Frontend

This document describes how the frontend integrates with Supabase for authentication and how to configure it.

## Configuration

Set the following environment variables in `frontend/.env` (or via deployment environment):

- REACT_APP_SUPABASE_URL: Your Supabase project URL
- REACT_APP_SUPABASE_ANON_KEY: Your Supabase anon key
- REACT_APP_FRONTEND_URL: The site URL used for email redirect (e.g., http://localhost:3000)

See `frontend/.env.example` for a template.

Do NOT commit actual secrets.

## Client Initialization

The client is created in `src/features/auth/supabaseClient.js`:

- Uses `createClient(url, key)` with auth options:
  - autoRefreshToken
  - persistSession
  - detectSessionInUrl

If required env variables are missing, the module returns `null` and the app falls back to mock/local flows.

## Authentication

The `AuthContext` (`src/features/auth/AuthContext.jsx`) has been updated to use Supabase when available:

- signUp: `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { name, role }}})`
- signInWithPassword: `supabase.auth.signInWithPassword({ email, password })`
- signOut: `supabase.auth.signOut()`
- Session persistence: `supabase.auth.getSession()` on load and `onAuthStateChange` subscription.
- Role handling: prefers `user.user_metadata.role` (defaults to `student` if absent). `setRole` updates `user_metadata.role`.

For environments without Supabase configuration, the app gracefully falls back to an in-memory mock auth client.

## Email Redirect

During signup, `emailRedirectTo` uses `REACT_APP_FRONTEND_URL` (or `window.location.origin` as a fallback) so email confirmation links return to the correct site URL.

## Data Access (Future Work)

The API client (`src/features/api/client.js`) includes stubs to integrate courses, enrollments, and assignments with Supabase tables. Current behavior remains unchanged (REST or local mocks). Future agents should:

- Create tables (suggested names):
  - courses (id, title, instructor, tags (array), description, syllabus (json))
  - enrollments (user_id, course_id, created_at)
  - assignments (id, course_id, title, due_date, type, status)
  - submissions (id, assignment_id, user_id, payload (json), submitted_at)
- Implement RLS policies based on `auth.uid()` and roles (student, educator).
- Replace mockDB calls in `LMSClient` with Supabase queries using `supabase.from(...).select(...)`.
- Keep REST fallback if needed.

## Notes

- Avoid logging PII or secrets.
- Keep environment-specific values external.
- Role defaults to `student` when metadata is not set.
