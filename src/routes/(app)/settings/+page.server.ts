import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, display_name, avatar_url, created_at, updated_at')
		.eq('id', locals.user!.id)
		.single();

	return { profile };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '').trim();

		if (displayName.length < 1 || displayName.length > 60) {
			return fail(400, {
				displayName,
				error: 'Display name must be 1–60 characters.'
			});
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ display_name: displayName })
			.eq('id', locals.user!.id);

		if (error) {
			return fail(500, { displayName, error: error.message });
		}

		return { displayName, saved: true };
	}
};
