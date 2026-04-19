import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: project }, { data: items }, { data: subprojects }, { data: tasks }, defs] =
		await Promise.all([
			locals.supabase.from('projects').select('*').eq('id', params.id).maybeSingle(),
			locals.supabase
				.from('project_items')
				.select(
					'id, owner_id, project_id, parent_item_id, order_index, title, notes, done_at, custom'
				)
				.eq('project_id', params.id)
				.order('order_index'),
			locals.supabase
				.from('projects')
				.select('id, name, status, color')
				.eq('parent_id', params.id)
				.order('name'),
			locals.supabase
				.from('tasks')
				.select('id, title, status, due_date')
				.eq('project_id', params.id)
				.is('deleted_at', null)
				.order('status'),
			loadDefs(locals.supabase, locals.user!.id, 'projects')
		]);

	if (!project) throw error(404, 'Project not found');

	return {
		project,
		items: items ?? [],
		subprojects: subprojects ?? [],
		tasks: tasks ?? [],
		defs,
		canEdit: project.owner_id === locals.user!.id
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const status = String(form.get('status') ?? 'active');
		const color = String(form.get('color') ?? '').trim() || null;

		if (!name) return fail(400, { error: 'Name required.' });

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'projects');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: e } = await locals.supabase
			.from('projects')
			.update({ name, description, status, color, custom: custom as never })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		await locals.supabase.from('projects').delete().eq('id', params.id);
		throw redirect(303, '/projects');
	},

	addItem: async ({ request, params, locals }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Title required.' });

		const { data: last } = await locals.supabase
			.from('project_items')
			.select('order_index')
			.eq('project_id', params.id)
			.is('parent_item_id', null)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();

		const { error } = await locals.supabase.from('project_items').insert({
			owner_id: locals.user!.id,
			project_id: params.id,
			title,
			order_index: (last?.order_index ?? -1) + 1
		});
		if (error) return fail(500, { error: error.message });
		return { added: true };
	},

	toggleItem: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const done = form.get('done') === 'on';
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('project_items')
			.update({ done_at: done ? new Date().toISOString() : null })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { toggled: true };
	},

	deleteItem: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase.from('project_items').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
