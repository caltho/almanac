# src/lib/sync/

**DEFERRED — extension-point stub.** Do not implement.

## Intent (when we return to this)

Offline-first editing + background sync. Today the app is online-only: every mutation is a SvelteKit form action that round-trips to Supabase.

## Shape (sketch)

- Local store per domain (IndexedDB via `idb` or `dexie`), schema-mirrored to Supabase tables.
- Outbox pattern: mutations write locally + enqueue; a sync worker replays the outbox against Supabase when online.
- Conflict resolution: last-writer-wins per row for v1, with a `version` column bumped server-side so the client can detect stale writes and surface a conflict UI.
- Realtime channel consumption updates local store in the background.

## Hooks to preserve in the current code

- Keep the typed query helpers in `src/lib/db/` thin — this layer will be swapped for a local-first adapter that presents the same call surface.
- Mutations go through form actions (not direct client-side supabase calls in components) so we have one server-side choke point to intercept.
- Every domain table has `created_at`, `updated_at`, `deleted_at` (soft delete) — required by the sync layer's reconciliation.

## Why deferred

Scope. Online-only is fine for personal use v1. Revisit after M8 ships.
