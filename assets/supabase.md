# Supabase Integration - EduInnovate LMS Frontend

This document describes how the frontend integrates with Supabase for authentication and how to configure it.

## Configuration

Set the following environment variables in `frontend/.env` (or via deployment environment):

- REACT_APP_SUPABASE_URL: Your Supabase project URL
- REACT_APP_SUPABASE_ANON_KEY: Your Supabase anon key
- REACT_APP_FRONTEND_URL: The site URL used for email redirect (e.g., http://localhost:3000)

See `frontend/.env.example` for a template.

Important:
- Use the exact names above. Do not use REACT_APP_SUPABASE_KEY. If you previously set REACT_APP_SUPABASE_KEY, rename it to REACT_APP_SUPABASE_ANON_KEY.
- Do NOT commit actual secrets.

## Client Initialization

The client is created in `src/features/auth/supabaseClient.js`:

- Uses `createClient(url, key)` with auth options:
  - autoRefreshToken
  - persistSession
  - detectSessionInUrl

If required env variables are missing, the module returns `null` and the app falls back to mock/local flows.

## Authentication

The `AuthContext` (`src/features/auth/AuthContext.jsx`) uses Supabase when available and includes robust error handling:

- signUp: `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { name, role }}})`; on success without a session, the UI prompts users to confirm email.
- signInWithPassword: `supabase.auth.signInWithPassword({ email, password })`
- signOut: `supabase.auth.signOut()`
- Session persistence: `supabase.auth.getSession()` on load and `onAuthStateChange` subscription.
- Role handling: prefers `user.user_metadata.role` (defaults to `student` if absent). `setRole` updates `user_metadata.role`.
- Errors from Supabase are normalized and surfaced in UI toasts.

For environments without Supabase configuration, the app gracefully falls back to an in-memory mock auth client.

## Email Redirect

During signup, `emailRedirectTo` uses `REACT_APP_FRONTEND_URL` (or `window.location.origin` as a fallback) so email confirmation links return to the correct site URL.

If Confirm Email is enabled in the Supabase Auth settings:
- Users must click the confirmation link before they can sign in.
- After signup, the app shows a toast prompting the user to check email and redirects to the login page.

## Troubleshooting

- If login/signup buttons always fail and you see a console warning like:
  `[Supabase] REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY missing. Falling back to mock/local flows.`
  then your environment variables are not set correctly. Ensure the names match exactly and the app is restarted.

- If you get "Email not confirmed" or "Invalid login credentials":
  - Confirm the user via the email link.
  - Ensure the redirect URL in the confirmation link matches `REACT_APP_FRONTEND_URL`.
  - Verify the Supabase project's Auth > URL configuration includes your site origin.

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
