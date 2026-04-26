## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, sveltekit-adapter

---

# Almanac — root CLAUDE.md

Personal life-tracking PWA. Single-user-at-a-time UI with granular cross-user data sharing. Designed to be fully AI-coded: every meaningful directory ships with a `CLAUDE.md` that states intent, constraints, and extension points. Read the nearest `CLAUDE.md` before editing anything in its subtree.

## Stack

- **Frontend:** SvelteKit (TypeScript), installable PWA via `@vite-pwa/sveltekit`
- **UI:** Tailwind CSS + shadcn-svelte components
- **Backend / DB / Auth / Storage:** Supabase (Postgres + Auth + Storage + Realtime). Row Level Security on every table.
- **AI:** Anthropic API with tool-use (server-side only; never call from the browser)
- **Hosting:** Vercel hobby
- **Repo:** `github.com/caltho/almanac` (private)

## Non-negotiables

- **RLS everywhere.** No table without policies. Default to deny-all; add policies deliberately.
- **Never expose the Supabase service-role key to the client.** It lives in SvelteKit server routes only.
- **Free tier only** — flag any change that would cost money before implementing.
- **No shipping until the whole MVP works** — see [PLAN.md](PLAN.md). Don't propose narrower MVPs.
- **Typed end-to-end.** Generate Supabase types (`supabase gen types typescript`) and use them.
- **AI-first workflow.** When you add a feature, add a `CLAUDE.md` alongside it. When you change direction, update the relevant `CLAUDE.md`.

## Directory map (see subtree CLAUDE.md files for detail)

```
supabase/            # migrations, RLS policies, seed data
src/lib/db/          # typed Supabase clients (browser + server)
src/lib/auth/        # session helpers
src/lib/shares/      # granular cross-user sharing primitives
src/lib/custom-attrs/# user-definable attribute system (powers "customizable from frontend")
src/lib/datasets/    # user-defined small tables (name + up to 7 typed columns)
src/lib/ai/          # Anthropic client, tools, chat loop
src/lib/finance/     # CSV import, rule engine, pg_trgm categoriser
src/lib/stores/      # client-side userData store hydrated from (app)/+layout.server.ts
src/lib/sync/        # STUB — deferred offline-sync extension points
src/routes/(auth)/   # auth screens
src/routes/(app)/    # authenticated app routes (journal, sleep, tasks, finance, assets, projects, datasets, settings)
src/routes/api/ai/   # AI chat endpoint (tool-use loop)
```

## Conventions

- **Hot data lives in the userData store.** `(app)/+layout.server.ts` runs one big `Promise.all` (`loadHotData`) on entry to the authenticated shell, and pages read reactive fields via `useUserData()` — no per-page server load for list views. See `src/lib/stores/CLAUDE.md` for what's hot vs. cold and the rules for adding new tables.
- **Forms:** use SvelteKit form actions for mutations. Client-only mutations go via typed helpers in `src/lib/db/`. After a form action's `enhance` calls `update()`, the layout re-runs and the userData store re-hydrates automatically — no extra invalidation needed.
- **Server-only code:** `*.server.ts` suffix or place in `src/lib/server/`. Never import these from `+page.svelte`.
- **Custom attrs:** every fixed-domain table has a `custom jsonb` column. UI for adding/removing keys is powered by `custom_attribute_defs` + `src/lib/custom-attrs/`. All defs are loaded once into the userData store; reach for `userData.defsFor('table_name')` instead of calling `loadDefs` from a page load.
- **Shares:** access control beyond "my own rows" goes through the `shares` table and its RLS helpers. Never write ad-hoc access checks in app code.
- **Deferred features:** live as CLAUDE.md stubs in their intended directories (e.g. `src/lib/sync/CLAUDE.md`). Don't delete these — they hold the extension-point design.

## Quick start

See [PLAN.md](PLAN.md) for milestone-by-milestone progression. Currently: **M0 — Kickoff** (scaffold + deploy preview).
