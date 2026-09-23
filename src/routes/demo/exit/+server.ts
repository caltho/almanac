import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DEMO_COOKIE } from '$lib/demo';

// Leave demo mode and head to sign-in. Linked from the demo banner.
export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete(DEMO_COOKIE, { path: '/' });
	throw redirect(303, '/login');
};
