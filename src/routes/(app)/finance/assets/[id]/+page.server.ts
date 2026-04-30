import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: asset }, defs] = await Promise.all([
		locals.supabase
			.from('assets')
			.select('*')
			.eq('id', params.id)
			.is('archived_at', null)
			.maybeSingle(),
		loadDefs(locals.supabase, locals.user!.id, 'assets')
	]);
	if (!asset) throw error(404, 'Asset not found');
	return { asset, defs, canEdit: asset.owner_id === locals.user!.id };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const kind = String(form.get('kind') ?? 'other');
		const value = form.get('value') ? Number(form.get('value')) : null;
		const location = String(form.get('location') ?? '').trim() || null;
		const notes = String(form.get('notes') ?? '').trim() || null;
		const tagsRaw = String(form.get('tags') ?? '').trim();
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		if (!name) return fail(400, { error: 'Name required.' });

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'assets');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: e } = await locals.supabase
			.from('assets')
			.update({
				name,
				kind: kind as never,
				value,
				location,
				notes,
				tags,
				custom: custom as never
			})
			.eq('id', params.id);

		if (e) return fail(500, { error: e.message });
		return { saved: true };
	},

	archive: async ({ params, locals }) => {
		await locals.supabase
			.from('assets')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', params.id);
		throw redirect(303, '/finance/assets');
	}
};
