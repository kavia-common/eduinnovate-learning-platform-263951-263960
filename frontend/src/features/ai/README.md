# AI Study Assistant (Frontend)

This module provides a provider-agnostic AI client with three tools exposed via a React context and hook:

- summarize(text|contentId)
- generateQuiz(text|contentId, n=5)
- explainELI5(text|contentId)

UI entry points are added to:
- Course Detail page
- Course Assignments page

Configuration (environment variables only; no secrets hardcoded):
- REACT_APP_SUPABASE_URL: If set, the app prefers Supabase Edge Function at {SUPABASE_URL}/functions/v1/ai-tools
- REACT_APP_AI_PROVIDER: "openai" to enable OpenAI-compatible client
- REACT_APP_OPENAI_API_BASE, REACT_APP_OPENAI_API_KEY: Required for OpenAI-compatible client

If neither provider is configured, the app falls back to a safe, deterministic Mock AI client and shows a warning toast.

Auth required:
- Users must be authenticated to use AI tools; otherwise a toast prompts login.

Security:
- Never commit real keys. All configuration is via environment variables.
