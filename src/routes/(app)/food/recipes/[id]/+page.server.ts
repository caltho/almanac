import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sanitizeHtml } from '$lib/server/sanitize-html';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: recipe }, { data: versions }] = await Promise.all([
		locals.supabase
			.from('recipes')
			.select(
				'id, owner_id, name, description, ingredients_html, method_html, custom, archived_at, updated_at'
			)
			.eq('id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('recipe_versions')
			.select('id, recipe_id, ingredients_html, method_html, notes, created_at')
			.eq('recipe_id', params.id)
			.order('created_at', { ascending: false })
	]);

	if (!recipe) throw error(404, 'Recipe not found');

	return {
		recipe,
		versions: versions ?? [],
		canEdit: recipe.owner_id === locals.user!.id
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const ingredients_html = sanitizeHtml(String(form.get('ingredients_html') ?? ''));
		const method_html = sanitizeHtml(String(form.get('method_html') ?? ''));

		if (!name) return fail(400, { error: 'Name is required.' });

		const { error: e } = await locals.supabase
			.from('recipes')
			.update({ name, description, ingredients_html, method_html })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { saved: true };
	},

	saveVersion: async ({ request, params, locals }) => {
		const form = await request.formData();
		const notes = String(form.get('notes') ?? '').trim() || null;

		// Snapshot the recipe's current state.
		const { data: recipe, error: re } = await locals.supabase
			.from('recipes')
			.select('ingredients_html, method_html')
			.eq('id', params.id)
			.maybeSingle();
		if (re || !recipe) return fail(500, { error: re?.message ?? 'Recipe gone' });

		const { error: e } = await locals.supabase.from('recipe_versions').insert({
			owner_id: locals.user!.id,
			recipe_id: params.id,
			ingredients_html: recipe.ingredients_html,
			method_html: recipe.method_html,
			notes
		});
		if (e) return fail(500, { error: e.message });
		return { snapshotted: true };
	},

	deleteVersion: async ({ request, params, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error: e } = await locals.supabase
			.from('recipe_versions')
			.delete()
			.eq('id', id)
			.eq('recipe_id', params.id);
		if (e) return fail(500, { error: e.message });
		return { deleted: true };
	},

	delete: async ({ params, locals }) => {
		await locals.supabase.from('recipes').delete().eq('id', params.id);
		throw redirect(303, '/food/recipes');
	}
};
