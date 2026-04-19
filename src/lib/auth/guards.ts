import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

/**
 * Assert there's an authenticated user. Redirects to /login on failure.
 * Use inside form actions / server loads where the route should be gated.
 */
export async function requireUser(event: RequestEvent): Promise<User> {
	const { user } = await event.locals.safeGetSession();
	if (!user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(event.url.pathname)}`);
	}
	return user;
}

/**
 * Like requireUser but throws a 401 JSON response instead of redirecting.
 * Use for +server.ts API endpoints (e.g. /api/ai).
 */
export async function requireUserApi(event: RequestEvent): Promise<User> {
	const { user } = await event.locals.safeGetSession();
	if (!user) {
		throw error(401, 'Not authenticated');
	}
	return user;
}
