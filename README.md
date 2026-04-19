# Almanac

Personal life-tracking PWA. Journal, sleep, tasks & habits, finance, assets & net worth, projects, Notion-lite pages, and an AI assistant — all behind magic-link auth with row-level granular sharing.

Designed to be fully AI-coded: every meaningful directory ships with a `CLAUDE.md` that states intent, constraints, and extension points. Read the nearest `CLAUDE.md` before editing anything in its subtree. See [CLAUDE.md](CLAUDE.md) for the root guide and [PLAN.md](PLAN.md) for milestone progression.

## Stack

- **Frontend:** SvelteKit (TypeScript), installable PWA via `@vite-pwa/sveltekit`
- **UI:** Tailwind CSS v4 + shadcn-svelte
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime) — RLS on every table
- **AI:** Anthropic Claude via server-only tool-use loop
- **Hosting:** Vercel (GitHub integration)

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in PUBLIC_SUPABASE_URL + keys
pnpm dev
```

Useful scripts:

```bash
pnpm check          # svelte-check + tsc
pnpm lint           # prettier + eslint
pnpm format         # prettier --write
pnpm db:types       # regenerate src/lib/db/types.ts from linked Supabase
pnpm db:push        # apply new migrations to the linked Supabase project
```

## Structure

```
supabase/            # migrations, RLS policies, config
src/lib/db/          # typed Supabase clients (browser, server, service)
src/lib/auth/        # session helpers
src/lib/shares/      # cross-user sharing primitives
src/lib/custom-attrs/# user-definable attribute engine
src/lib/journal/     # journal helpers
src/lib/finance/     # CSV import, rule engine, pg_trgm categoriser
src/lib/blocks/      # Notion-lite block registry (pages)
src/lib/ai/          # Anthropic tool-use loop
src/lib/sync/        # DEFERRED — offline-sync extension points
src/routes/(auth)/   # /login + magic-link callback
src/routes/(app)/    # authenticated app shell
src/routes/api/ai/   # AI chat endpoint
```

## Non-negotiables

- **RLS everywhere.** Default deny; policies added in the same migration that creates the table.
- **Service-role key is server-only.** Only `src/lib/db/service.ts` reads it.
- **Free tier only** — flag any change that would cost money before implementing.
- **AI-first workflow.** New features arrive with a `CLAUDE.md` sibling; scope changes edit the relevant `CLAUDE.md`.
