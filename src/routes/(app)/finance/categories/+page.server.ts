import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { rulesSchema } from '$lib/finance';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: categories } = await locals.supabase
		.from('categories')
		.select('id, parent_id, name, color, rules, created_at')
		.order('name', { ascending: true });
	return { categories: categories ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;
		const color = String(form.get('color') ?? '').trim() || null;

		if (!name) return fail(400, { error: 'Name is required.' });

		const { error } = await locals.supabase.from('categories').insert({
			owner_id: locals.user!.id,
			name,
			parent_id,
			color
		});
		if (error) {
			if (error.code === '23505')
				return fail(409, { error: 'Duplicate category name under parent.' });
			return fail(500, { error: error.message });
		}
		return { created: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;
		const color = String(form.get('color') ?? '').trim() || null;

		if (!id || !name) return fail(400, { error: 'Missing fields.' });
		if (parent_id === id) return fail(400, { error: "A category can't be its own parent." });

		const { error } = await locals.supabase
			.from('categories')
			.update({ name, parent_id, color })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { updated: true };
	},

	updateRules: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const rulesText = String(form.get('rules') ?? '').trim();

		let rules: unknown = [];
		if (rulesText) {
			try {
				rules = JSON.parse(rulesText);
			} catch {
				return fail(400, { error: 'Rules must be valid JSON.' });
			}
			const parsed = rulesSchema.safeParse(rules);
			if (!parsed.success) {
				return fail(400, {
					error:
						'Each rule must be { kind: "keyword"|"regex", pattern: string, case_sensitive?: boolean }.'
				});
			}
			rules = parsed.data;
		}

		const { error } = await locals.supabase
			.from('categories')
			.update({ rules: rules as never })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { rulesSaved: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase.from('categories').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
