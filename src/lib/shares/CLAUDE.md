# src/lib/shares/

Granular cross-user sharing primitives. The `shares` table + Postgres RLS helpers are the single source of truth for "can user X see row Y".

## Model (draft — refine in M1)
`shares(id, owner_id, grantee_id, resource_type, resource_id, scope jsonb, perms text[])`

- `resource_type` — one of: `journal_entry`, `sleep_log`, `task`, `habit`, `transaction`, `category`, `budget`, `asset`, `project`, `page`, or a coarse `*_all` for whole-domain shares.
- `resource_id` — nullable when `resource_type` ends in `_all` (domain-wide share).
- `scope jsonb` — optional filter, e.g. `{ "category_id": "..." }` to share only one finance category.
- `perms text[]` — subset of `read | comment | write`.

## Rules
- **No ad-hoc access checks in app code.** RLS policies on each domain table call a helper `can_access(resource_type, row)` that checks `owner_id = auth.uid() OR EXISTS (...shares...)`.
- Finance policies must be strict: default deny, explicit shares only, no implicit "everyone in my household" shortcuts.
- UI for managing shares lives under `src/routes/(app)/settings/shares/` (M1).
- Invite-by-email flow resolves the email → `profiles.id` via a server action before inserting into `shares`.
