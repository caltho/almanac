import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/db/server';

/**
 * Auth guard:
 * - Memoise `safeGetSession()` result on the request so we call
 *   `supabase.auth.getUser()` at most once per request (it hits the Supabase
 *   Auth API — ~150-250ms of latency otherwise incurred on every nav).
 * - Static assets skip the guard entirely.
 */

const PUBLIC_PATHS = new Set(['/login']);
const AUTH_CALLBACKS = ['/auth/callback', '/auth/signout'];

function isStaticAsset(path: string) {
	return (
		path.startsWith('/_app/') ||
		path.startsWith('/favicon') ||
		path.endsWith('.png') ||
		path.endsWith('.svg') ||
		path.endsWith('.ico') ||
		path.endsWith('.webp') ||
		path.endsWith('.webmanifest')
	);
}

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);

	// Per-request cache of the validated session. `getUser()` is the only way
	// to trust the JWT — `getSession()` just reads the cookie. We call it once
	// and memoise for every subsequent caller inside the same request.
	let cached: { session: App.Locals['session']; user: App.Locals['user'] } | null = null;

	event.locals.safeGetSession = async () => {
		if (cached) return cached;

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			cached = { session: null, user: null };
			return cached;
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		cached = error ? { session: null, user: null } : { session, user };
		return cached;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Skip auth entirely for static assets — no need to hit Supabase.
	if (isStaticAsset(path)) return resolve(event);

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const isAuthed = !!user;
	const isPublic = PUBLIC_PATHS.has(path) || AUTH_CALLBACKS.some((p) => path.startsWith(p));

	if (!isPublic && !isAuthed) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(path)}`);
	}

	if (path === '/login' && isAuthed) {
		throw redirect(303, '/');
	}

	return resolve(event);
};

export const handle = sequence(supabase, authGuard);
