# src/routes/

SvelteKit route tree. Two route groups: `(auth)` for pre-login screens, `(app)` for the authenticated shell.

## Groups (to be populated)

- `(auth)/` — `login`, magic-link callback, logout redirect. No layout chrome.
- `(app)/` — authenticated shell. Layout loads the session and redirects unauthenticated users to `/login`. Children: `journal`, `sleep`, `tasks`, `finance`, `assets`, `projects`, `pages`, `settings`.
- `api/ai/` — Anthropic tool-use endpoint (M7).

## Rules

- **Mutations use form actions.** Progressive-enhanced via `use:enhance`. Don't write client-only mutation paths when a form action exists.
- **Server-only code:** `+page.server.ts`, `+layout.server.ts`, `+server.ts`, or files in `src/lib/server/`. These can import the service-role Supabase client.
- **Auth check lives in `(app)/+layout.server.ts`.** Child routes don't repeat it.
- **Single-user-at-a-time UI.** All shells show "this is Callum's view" — switching to a friend's shared data is an explicit mode toggle, not an overlay.
