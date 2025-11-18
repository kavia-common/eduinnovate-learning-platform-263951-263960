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

## Data Access

The frontend now includes a Supabase repository at `src/features/data/supabaseRepository.js`. When `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set, the app uses Supabase for:

- Courses
  - listCourses (search/tag filters/pagination)
  - getCourseById (syllabus/sections via `syllabus` JSON column)
- Assignments
  - listAssignmentsByCourse
  - submitAssignment (inserts into `submissions`, status=`submitted`)
- Enrollments
  - enroll/unenroll (links current user to a course)
  - listMyCourses (join enrollments -> courses)

Graceful fallback:
- If Supabase is not configured or tables/policies are missing, the UI shows a small warning toast and falls back to REST/mocks.

Expected tables (names only; schema not created here):
- courses (id, title, instructor, tags (array), description, syllabus (json))
- enrollments (user_id, course_id, created_at)
- assignments (id, course_id, title, due_date, type, status)
- submissions (id, assignment_id, user_id, payload (json), submitted_at, status)
- notes (id uuid default uuid_generate_v4(), user_id uuid, context_type text, context_id text, title text, content text, created_at timestamptz default now(), share_id text null)

Recommended RLS Policies:
- notes: users can insert/update/delete/select where user_id = auth.uid()
- For public sharing, add a policy to allow select for rows where share_id is not null.

Example SQL (adjust to your project):
```sql
alter table notes enable row level security;

create policy "Notes - owner can CRUD"
on notes as permissive
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Public read for shared notes (read-only)
create policy "Notes - public read shared"
on notes
for select
to anon, authenticated
using (share_id is not null);
```

Environment variables (frontend):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- REACT_APP_FRONTEND_URL (used for emailRedirectTo on signup)

No secrets are hardcoded; values are read from the environment.

## Notes Feature

- The Notes feature stores notes in `notes` table when Supabase is configured and user is authenticated.
- Fallback: stores notes in localStorage if Supabase is not configured.
- Share Links:
  - Supabase: generates a `share_id` and produces `/share/:id` URLs that render read-only content.
  - Local: copies content to clipboard (no server share).

## Accessibility & UX

- Notes and AI history lists are keyboard accessible and include ARIA labels.
- Toasts provide non-blocking feedback for save/share/delete actions.

## Troubleshooting

- If `/share/:id` shows "Not found", ensure the `notes` table has `share_id` populated for that note and the RLS policy allows public select of shared notes.

## Security Notes

- Do not expose secrets in the frontend.
- Avoid logging PII.
- Ensure RLS policies are in place for the `notes` table.
