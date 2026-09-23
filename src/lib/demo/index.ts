// Demo mode: shared constants. Browser-safe (no fixtures, no server imports).
// See ./CLAUDE.md for how the pieces fit together.

/** Cookie that switches a browser into demo mode. Set by /demo, cleared by /demo/exit. */
export const DEMO_COOKIE = 'demo_mode';

/** Shown wherever a write is refused. */
export const DEMO_READ_ONLY_MESSAGE = 'Demo mode: sign in to save changes.';

/** Response header on every write hooks.server.ts refuses. DemoBanner listens for it. */
export const DEMO_BLOCKED_HEADER = 'x-almanac-demo';

/** The fictional demo user. Every fixture row is owned by this id. */
export const DEMO_USER_ID = '6d656d6f-0000-4000-8000-000000000001';

/** Browser-only: is the demo cookie set? (It is deliberately not httpOnly.) */
export function isDemoBrowser(): boolean {
	return document.cookie.split(';').some((c) => c.trim().startsWith(`${DEMO_COOKIE}=`));
}
