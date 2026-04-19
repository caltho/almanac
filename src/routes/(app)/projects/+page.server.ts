import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: projects }, { data: itemCounts }] = await Promise.all([
		locals.supabase
			.from('projects')
			.select('id, parent_id, name, description, status, color, updated_at')
			.order('name'),
		locals.supabase.from('project_items').select('project_id, done_at')
	]);

	const stats = new Map<string, { total: number; done: number }>();
	for (const i of itemCounts ?? []) {
		const s = stats.get(i.project_id) ?? { total: 0, done: 0 };
		s.total++;
		if (i.done_at) s.done++;
		stats.set(i.project_id, s);
	}

	return {
		projects: projects ?? [],
		stats: Object.fromEntries(stats)
	};
};

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
