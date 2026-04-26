# Almanac — Plan

Living document. Update as milestones complete or scope shifts.

## Rules

- **No shipping until full MVP works.** All domains usable, full auth + sharing, PWA installs, AI assistant functional.
- **Free tier only.** Supabase free, Vercel hobby, Cloudflare if needed. Flag any cost.
- **Every new feature gets a CLAUDE.md** in its directory — intent, constraints, extension points.

## Architecture one-liner

SvelteKit PWA → SvelteKit server routes (Supabase + Anthropic) → Postgres (RLS on everything).

## Schema philosophy — hybrid

- **Fixed domains** with opinionated core columns + a `custom jsonb` column on every row. A `custom_attribute_defs` table drives the add/remove-attributes UI.
- **Pages** = Notion-lite (`pages` + `blocks` + block-type registry). Foundational, not feature-complete.

## Tables (first pass — refine in M0/M1)

**Identity / sharing**

- `profiles(id, display_name, ...)`
- `shares(id, owner_id, grantee_id, resource_type, resource_id, scope jsonb, perms text[])`

**Fixed domains (each with `custom jsonb` + row-level `owner_id`)**

- `journal_entries`, `sleep_logs`, `tasks`, `habits`, `habit_checks`
- `transactions`, `categories(rules jsonb)`, `budgets`
- `assets`, `net_worth_snapshots`
- `projects`, `project_items`

**Meta**

- `custom_attribute_defs(table_name, key, label, type, ui_hints)`

**Pages**

- `pages(id, owner_id, parent_id, title, icon, order_index)`
- `blocks(id, page_id, parent_block_id, order_index, type, content jsonb)`

## Milestones

### M0 — Kickoff

- Scaffold SvelteKit + TS + Tailwind + shadcn-svelte + PWA plugin
- Create Supabase project, link locally, wire env
- Create GitHub private repo `caltho/almanac`, push initial commit
- Deploy preview on Vercel (empty app)
- Root + key CLAUDE.md files in place

### M1 — Auth + sharing foundation

- Supabase auth (email magic link)
- `profiles`, `shares` tables + RLS
- Shared RLS helper functions in Postgres
- Settings page (profile, shares management, invite by email)

### M2 — Custom-attribute engine

- `custom_attribute_defs` schema
- Generic renderer/editor components in `src/lib/custom-attrs/`
- Attach to one domain (Journal) as proof

### M3 — Journal + Sleep + Tasks/Habits

- Fixed screens per domain using custom-attrs engine
- Basic lists, filters, day-view for journal

### M4 — Finance

- Schema: transactions, categories, budgets
- CSV importer (server-side parse, staging, confirm)
- Rule engine (keyword/regex) + pg_trgm similarity match against historical descriptions
- Seed Callum's historical categorised dataset
- Dashboards: spend by category, budget vs actual, trends

### M5 — Assets + Net worth + Projects

- `assets` (doubles as household inventory)
- `net_worth_snapshots` + charts
- `projects` + `project_items` with nesting

### M6 — Pages

- `pages(id, owner_id, parent_id, title, icon, body_html, archived_at)` — nestable
- Single rich-text body per page (`body_html`) edited via contenteditable + execCommand toolbar; sanitized server-side in `src/lib/server/sanitize-html.ts`
- (Earlier blocks-table model was scrapped — too fiddly. The table still exists in the DB but is unused; can be dropped in a later cleanup migration.)

### M7 — AI assistant

- `/api/ai` SvelteKit endpoint running Anthropic tool-use loop
- Tools: `create_journal_entry`, `log_sleep`, `add_task`, `add_page_block`, `query_*` getters
- Chat UI
- User-scoped tool authorisation (tools run as the current user; RLS does the rest)

### M8 — Polish + deploy

- PWA icons/manifest, iOS/Android install flow
- Mobile layout audit
- Production deploy, custom domain (optional)

## Deferred (stubs live in the codebase)

- Offline edits + sync (`src/lib/sync/CLAUDE.md`)
- Spreadsheet import (`src/lib/finance/csv-import/CLAUDE.md` notes the extension hooks)
- Real rich-text editor (Tiptap / ProseMirror) — current pages use contenteditable + execCommand
- Block-style page model (paragraph/heading/list/checklist/data-point) — parked; the `blocks` table still exists in the DB unused
- Multi-currency
- Native mobile (staying PWA)
