import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		redirectTo: url.searchParams.get('redirect') ?? '/'
	};
};

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const redirectTo = String(form.get('redirect') ?? '/');

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { email, error: 'Enter a valid email address.' });
		}

		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
			}
		});

		if (error) {
			return fail(500, { email, error: error.message });
		}

		return { email, sent: true };
	}
};
