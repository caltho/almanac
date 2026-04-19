import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	const next = url.searchParams.get('next') ?? '/';

	// New PKCE/magic-link flow returns ?code=...
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			throw redirect(303, next);
		}
		throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
	}

	// Legacy email-confirmation flow returns ?token_hash=&type=email
	if (tokenHash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({
			// @ts-expect-error — supabase-js accepts the string union
			type,
			token_hash: tokenHash
		});
		if (!error) {
			throw redirect(303, next);
		}
		throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
	}

	throw redirect(303, '/login?error=Missing%20auth%20code');
};
