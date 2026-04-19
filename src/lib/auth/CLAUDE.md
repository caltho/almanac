# src/lib/auth/

Session helpers for SvelteKit ↔ Supabase auth.

## Scope

- `hooks.server.ts` wires Supabase into `event.locals.supabase` and `event.locals.safeGetSession()`.
- Helpers here wrap `event.locals.safeGetSession()` and expose typed `user`/`session` to routes.
- Auth method (M1): magic-link email via Supabase Auth. No passwords.

## Rules

- Treat `locals.session` as untrusted until `safeGetSession()` validates via `supabase.auth.getUser()` (JWT check). Never trust `session.user` from a raw cookie.
- Route protection happens in `hooks.server.ts` / `+layout.server.ts` load functions, not scattered across routes.
- Client-side `supabase.auth` listeners are fine for UI reactivity but must not be the source of truth for "is the user allowed here?".
