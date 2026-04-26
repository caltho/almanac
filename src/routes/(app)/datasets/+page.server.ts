import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

// Dataset metadata is loaded into the userData store by the (app) layout.
// This page only owns the create action; on success the layout invalidates
// and the list re-renders.

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });

		const { data, error } = await locals.supabase
			.from('datasets')
			.insert({
				owner_id: locals.user!.id,
				name,
				columns: [] as never
			})
			.select('id')
			.single();

		if (error) return fail(500, { error: error.message });
		throw redirect(303, `/datasets/${data.id}`);
	}
};
