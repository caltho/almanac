import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

// Data flows through (app)/+layout.server.ts → userData store. Form action
// stays for progressive enhancement; on success, `enhance`'s `update()`
// invalidates the layout and the store re-hydrates.

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;
		const color = String(form.get('color') ?? '').trim() || null;
		if (!name) return fail(400, { error: 'Name required.' });

		const { error } = await locals.supabase.from('projects').insert({
			owner_id: locals.user!.id,
			name,
			parent_id,
			color
		});
		if (error) return fail(500, { error: error.message });
		return { created: true };
	}
};
