import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });
		const { data, error } = await locals.supabase
			.from('recipes')
			.insert({ owner_id: locals.user!.id, name })
			.select('id')
			.single();
		if (error) return fail(500, { error: error.message });
		throw redirect(303, `/food/recipes/${data.id}`);
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('recipes')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { archived: true };
	}
};
