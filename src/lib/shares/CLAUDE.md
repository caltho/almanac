# src/lib/shares/

Granular cross-user sharing primitives. The `shares` table + Postgres RLS helpers are the single source of truth for "can user X see row Y".

## Model (live as of M1)

`shares(id, owner_id, grantee_id, resource_type, resource_id, scope jsonb, perms share_perm[])`

- `resource_type` — domain name: `journal`, `sleep`, `tasks`, `habits`, `finance`, `assets`, `projects`, `pages`. Free-form text so future domains don't require a schema migration.
- `resource_id` — nullable. **Null = whole-domain share** ("share all my journal with X"). Non-null = one row.
- `scope jsonb` — optional narrowing filter, e.g. `{ "category_id": "..." }` to share only one finance category. Compared against each row's attributes via `share.scope <@ row_extra` in `can_access()`: every key in share.scope must match in the row.
- `perms share_perm[]` — enum subset of `read | comment | write`.
- Duplicate grants on the same `(owner, grantee, resource_type, resource_id)` tuple are prevented by a unique index.

## Rules

- **No ad-hoc access checks in app code.** RLS policies on each domain table call a helper `can_access(resource_type, row)` that checks `owner_id = auth.uid() OR EXISTS (...shares...)`.
- Finance policies must be strict: default deny, explicit shares only, no implicit "everyone in my household" shortcuts.
- UI for managing shares lives under `src/routes/(app)/settings/shares/` (M1).
- Invite-by-email flow resolves the email → `profiles.id` via a server action before inserting into `shares`.
