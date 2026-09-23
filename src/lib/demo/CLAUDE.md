# src/lib/demo/

Demo mode: portfolio visitors explore a populated Almanac without an account. Everything they see comes from generated fixtures; nothing is read from or written to the real Supabase project, and no paid API is called.

## How it fits together

- **Enter:** `GET /demo` (`src/routes/demo/+server.ts`) sets the `demo_mode` cookie (path `/`, SameSite=Lax, session-length, not httpOnly because it is only a flag) and redirects to `/`. The login page's "Try the demo" button links here, and it works as a deep link from the portfolio.
- **Exit:** `GET /demo/exit` clears the cookie and redirects to `/login`. The banner links here. "Sign out" (`/auth/signout`) and finishing a magic-link sign-in (`/auth/callback`) also leave the demo.
- **Server:** the `demo` handle in `src/hooks.server.ts` runs first. With the cookie it sets `locals.demo`, swaps `locals.supabase` for the in-memory client, makes `safeGetSession()` return a fixed demo user and session (Supabase Auth is never called), and refuses writes before any route runs. Without the cookie it does nothing.
- **Browser:** `getSupabaseBrowserClient()` returns an empty in-memory client when the cookie is present, so the browser never talks to Supabase either. Entering and leaving are full page loads (`data-sveltekit-reload`).
- **UI:** `(app)/+layout.svelte` renders `DemoBanner.svelte` when `data.demo` (from the root layout load). The banner sits in normal flow above the header and shows a short notice whenever a write is refused.

## Files

- `index.ts`: shared constants (cookie name, read-only message, blocked-write header, demo user id). Browser-safe.
- `client.ts`: `createDemoClient()`, the in-memory Supabase stand-in. Supports the query-builder surface the app uses (select with column lists, aliases, embedded relations and `{ count, head }`; eq/neq/gt/gte/lt/lte/like/ilike/is/in/not/match/filter/or; order/limit/range; single/maybeSingle; insert/update/upsert/delete; rpc) plus the `auth` calls the app makes. Browser-safe.
- `fixtures.server.ts`: `buildDemoTables()`, a fictional persona's data (Riley Morgan, Melbourne) generated relative to today. Server-only so it never ships to the browser.
- `server.ts`: the per-request client factory, the fixed session, the canned assistant reply and `refuseDemoWrite()`.
- `DemoBanner.svelte`: the banner and the refused-write notice.

## Rules

- **Never reach real data.** Demo requests only ever get `createDemoServerClient()`. Nothing in the demo path may import `$lib/db/service` (the service-role client) or create a real Supabase client. Today nothing in the app imports the service client at all; keep it that way or gate it on `!locals.demo`.
- **No external or paid calls.** `/api/ai` returns `DEMO_ASSISTANT_REPLY` when `locals.demo` and never builds the Anthropic client. Any new route that calls out (email, AI, webhooks) must check `locals.demo` first.
- **Writes are refused, not faked.** `refuseDemoWrite()` answers every non-GET request except the `WRITE_ALLOWED` routes: `use:enhance` form actions get a `failure` ActionResult with `{ error }` (pages render `form.error`), fetch calls get a plain-text 403, and no-JS form posts bounce back to the page. Every refusal carries `x-almanac-demo`, which `DemoBanner` watches to show its notice. As a second line of defence the in-memory client resolves every write to a read-only error. A new non-GET route that must work in the demo goes in `WRITE_ALLOWED` and handles `locals.demo` itself.
- **Nothing is shared between visitors.** Fixtures are rebuilt for each request's client and every query result is a deep copy, so there is no state to leak or persist.
- **Never cached.** Demo responses are sent with `cache-control: private, no-store`. The PWA service worker only precaches build assets (no HTML, no runtime caching of pages or `__data.json`). If that ever changes, exclude demo responses so a signed-in visit can never be served a demo page, or vice versa.
- **Fixtures stay fictional and deterministic.** Ids and "random" values are seeded from stable keys (usually the calendar date), so the same day renders the same data and detail links keep working. Keep text free of real people or private data. No em or en dashes.

## Extending

- **New table or column:** add rows in `fixtures.server.ts` with every column the UI selects (the client returns `null` for columns a row lacks). If the table has a foreign key used in an embedded select, add it to `FOREIGN_KEYS` in `client.ts`.
- **New query-builder method:** implement it on `DemoQuery`. Unsupported filter operators resolve to a `DEMO_UNSUPPORTED` error (empty data, no crash) so gaps show up quickly.
