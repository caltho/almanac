import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/db/server';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);

	// Return session + user after validating the JWT with Supabase.
	// Use this instead of locals.supabase.auth.getSession() anywhere auth decisions
	// are made — getSession() alone trusts the cookie.
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const path = event.url.pathname;
	const isApp = path === '/' || path.startsWith('/app') || path.startsWith('/settings');
	const isAuthed = !!user;

	// Protected app area — bounce unauthenticated users to /login.
	if (isApp && !isAuthed) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(path)}`);
	}

	// Already signed in — don't linger on /login.
	if (path === '/login' && isAuthed) {
		throw redirect(303, '/');
	}

	return resolve(event);
};

export const handle = sequence(supabase, authGuard);
