// Date helpers for the user's *local* calendar — not UTC.
//
// Why this exists: `new Date().toISOString().slice(0, 10)` is UTC, so for any
// user in a positive offset (e.g. Sydney UTC+10) it rolls back to "yesterday"
// for the morning hours of their local day. That broke habit ticks, activity
// logs, calendar buckets, sleep-log defaults, and journal-entry defaults —
// any column that stores a calendar date from the user's perspective.
//
// Use these helpers anywhere we surface a date *to* the user or accept a
// date *from* the user. Server-side aggregations that genuinely care about
// UTC (e.g. "rows updated in the last 24 hours" via timestamptz comparison)
// should keep using UTC arithmetic — that's a different concept.

/**
 * `YYYY-MM-DD` from the Date's local fields (not UTC). Day rollover
 * matches the user's wall clock.
 */
export function localIso(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Local midnight for the given date (defaults to today). Useful as the
 * floor for "is this in the past?" comparisons against another Date.
 */
export function localMidnight(d: Date = new Date()): Date {
	const out = new Date(d);
	out.setHours(0, 0, 0, 0);
	return out;
}

/**
 * Parse a `YYYY-MM-DD` string into a Date pinned to *local* midnight on
 * that day. Avoids the `new Date('2026-05-04')` trap, which the V8 spec
 * parses as UTC midnight (one day earlier in positive offsets).
 */
export function dateFromIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/** Add `days` to `d` and return a new Date (local time preserved). */
export function addDays(d: Date, days: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}

/**
 * `dd/mm/yyyy` from a Date or YYYY-MM-DD ISO string. Locale-independent —
 * the app pins to AU-style dd/mm/yyyy regardless of the visitor's browser.
 */
export function fmtDate(d: Date | string): string {
	const date = typeof d === 'string' ? dateFromIso(d) : d;
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	return `${dd}/${mm}/${date.getFullYear()}`;
}

/** Short `dd/mm` for compact contexts (e.g. weekday columns). */
export function fmtDateShort(d: Date | string): string {
	const date = typeof d === 'string' ? dateFromIso(d) : d;
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	return `${dd}/${mm}`;
}
