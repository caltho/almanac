import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DEMO_COOKIE } from '$lib/demo';

// Enter demo mode: sample data, no account. Linked from the login page and
// usable as a deep link (e.g. from the portfolio). See src/lib/demo/CLAUDE.md.
export const GET: RequestHandler = async ({ cookies }) => {
	cookies.set(DEMO_COOKIE, '1', {
		path: '/',
		sameSite: 'lax',
		// Read by getSupabaseBrowserClient(). It is only a flag; the server
		// decides what demo mode can do.
		httpOnly: false
	});
	throw redirect(303, '/');
};
