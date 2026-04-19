import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kindFilter = url.searchParams.get('kind') ?? '';
	const tagFilter = url.searchParams.get('tag') ?? '';
	const search = url.searchParams.get('q') ?? '';

	let query = locals.supabase
		.from('assets')
		.select(
			'id, owner_id, name, kind, value, currency, acquired_on, location, tags, notes, custom, archived_at, updated_at'
		)
		.is('archived_at', null)
		.order('name', { ascending: true });

	if (kindFilter) query = query.eq('kind', kindFilter as never);
	if (search) query = query.ilike('name', `%${search}%`);
	if (tagFilter) query = query.contains('tags', [tagFilter]);

	const [{ data: assets }, defs] = await Promise.all([
		query,
		loadDefs(locals.supabase, locals.user!.id, 'assets')
	]);

	// Pull unique tags for chip filter.
	const tagSet = new Set<string>();
	for (const a of assets ?? []) for (const t of a.tags ?? []) tagSet.add(t);

	return {
		assets: assets ?? [],
		defs,
		filters: { kind: kindFilter, tag: tagFilter, q: search },
		tags: [...tagSet].sort()
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const kind = String(form.get('kind') ?? 'other');
		const value = form.get('value') ? Number(form.get('value')) : null;
		const location = String(form.get('location') ?? '').trim() || null;
		const tagsRaw = String(form.get('tags') ?? '').trim();
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		if (!name) return fail(400, { error: 'Name is required.' });
		if (value !== null && !Number.isFinite(value)) {
			return fail(400, { error: 'Value must be a number.' });
		}

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'assets');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error } = await locals.supabase.from('assets').insert({
			owner_id: locals.user!.id,
			name,
			kind: kind as never,
			value,
			location,
			tags,
			custom: custom as never
		});
		if (error) return fail(500, { error: error.message });
		return { created: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('assets')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { archived: true };
	}
};
