# src/routes/

SvelteKit route tree. Two route groups: `(auth)` for pre-login screens, `(app)` for the authenticated shell.

## Groups (to be populated)

- `(auth)/` — `login`, magic-link callback, logout redirect. No layout chrome.
- `(app)/` — authenticated shell. Layout loads the session and redirects unauthenticated users to `/login`. Children: `journal`, `sleep`, `tasks`, `tracking`, `food`, `finance` (with `assets` sub-area for Stuff + Net worth), `projects` (with `datasets` sub-area), `assistant`, `settings`.
- `api/ai/` — Anthropic tool-use endpoint (M7).

## Rules

- **Hot data is loaded once in `(app)/+layout.server.ts`** via `loadHotData()` and exposed to every child page through the userData store (`useUserData()` from `$lib/stores/userData.svelte`). List pages should NOT have their own `+page.server.ts` `load`; read from the store. Only add a per-route load for cold/heavy data (finance month windows, page blocks, asset photos, full-row detail beyond the list select).
- **Mutations use form actions.** Progressive-enhanced via `use:enhance`. After `update()`, the layout re-runs and the store re-hydrates automatically. Use a fetch JSON endpoint + store helper (`userData.addTask` etc.) when you need instant optimistic feedback.
- **Server-only code:** `+page.server.ts`, `+layout.server.ts`, `+server.ts`, or files in `src/lib/server/`. These can import the service-role Supabase client.
- **Auth check lives in `(app)/+layout.server.ts`.** Child routes don't repeat it.
- **Single-user-at-a-time UI.** All shells show "this is Callum's view" — switching to a friend's shared data is an explicit mode toggle, not an overlay.
