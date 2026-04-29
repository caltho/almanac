import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { isPaletteToken } from '$lib/palette';

// Data flows through (app)/+layout.server.ts → userData store. Form action
// stays for progressive enhancement; we redirect into the new project so the
// user can drop straight into the rich-text body (no "select me, then click
// Edit" extra step).

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;
		const colorRaw = String(form.get('color') ?? '');
		const color = colorRaw && isPaletteToken(colorRaw) ? colorRaw : null;
		if (!name) return fail(400, { error: 'Name required.' });

		const { data, error } = await locals.supabase
			.from('projects')
			.insert({
				owner_id: locals.user!.id,
				name,
				parent_id,
				color
			})
			.select('id')
			.single();
		if (error) return fail(500, { error: error.message });
		throw redirect(303, `/projects/${data.id}`);
	}
};
