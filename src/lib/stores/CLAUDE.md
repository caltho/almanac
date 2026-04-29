# src/lib/stores/

Centralized client-side store for the authenticated app shell. Lets pages render instantly off in-memory data instead of round-tripping the server on every navigation.

## How it works

- `(app)/+layout.server.ts` calls `loadHotData()` once per top-level navigation. One `Promise.all` fetches every hot table in parallel and returns it under `data.userData`.
- `(app)/+layout.svelte` calls `setUserData(data.userData)` to create a per-request `UserData` instance and stash it in Svelte context. An `$effect` re-hydrates the store whenever the layout's `data` changes (e.g. after `invalidate('almanac:userData')` or a form-action `update()`).
- Pages call `useUserData()` to read reactive fields (`tasks`, `habits`, `journalEntries`, …) and call mutation helpers (`addTask`, `removeTask`, `toggleHabitCheck`, …) for instant optimistic updates.

## Hot vs cold

The store loads only what the shell needs to feel instant. Bounded windows on unbounded tables.

- **Hot (in store):** profile, shares, all custom-attr defs (across every table), journal (200 most-recent), sleep (200 most-recent), tasks (all open + recent done), habits + habit_checks (last 90d), categories, budgets, recent transactions (last 90d), assets, projects (incl. body_html — Notion-style rich-text body replaces the old project_items model), datasets metadata (id/name/columns — no row data), shopping_items (active list), activities + activity_logs (last 90d), recipes (metadata + current ingredients/method bodies — versions load on detail route only), checklists + checklist_items.
- **Cold (per-route, on demand):** finance history beyond 90d, dataset rows, asset photos, full journal/task/sleep detail rows beyond what's in the list select, AI chat archive, import-batch staging.

## Rules

- **Never read or mutate the store on the server.** It's a Svelte 5 reactive class instance scoped to a single client/SSR render. Server code uses Supabase directly.
- **Never make `userData` a module singleton.** Concurrent SSR requests would clobber each other.
- **One source of truth per piece of data.** Don't copy `userData.tasks` into a local `$state` on a page — read directly. Optimistic mutations go through the store helpers so every page sees the same updated value.
- **Form actions auto-refresh the store.** `use:enhance` calls `update()` on success, which invalidates the layout, which re-runs `loadHotData`, which re-hydrates the store. No extra plumbing needed.
- **Fetch-based mutations call store helpers.** `userData.addTask(t)` etc. flips the UI synchronously; the network call runs in the background. Roll back on failure (the page owns the try/catch).
- **Keep the loader narrow.** Adding a new hot table means trading first-paint latency for navigation latency. Worth it for tiny/medium tables; not worth it for unbounded ones.

## Adding a new hot table

1. Add a typed field on `HotData` in `userData.svelte.ts`.
2. Add the query + return mapping in `server.ts`.
3. Add a `$state` field on `UserData` and assign it in `hydrate()`.
4. Add helper methods only if there's a fetch-based mutation path that needs optimistic updates; form-action paths don't.
