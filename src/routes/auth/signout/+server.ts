import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DEMO_COOKIE } from '$lib/demo';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// In demo mode there is no real session, so "Sign out" just leaves the demo.
	if (locals.demo) cookies.delete(DEMO_COOKIE, { path: '/' });
	else await locals.supabase.auth.signOut();
	throw redirect(303, '/login');
};
