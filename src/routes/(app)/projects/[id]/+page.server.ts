import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';
import { sanitizeHtml } from '$lib/server/sanitize-html';
import { isPaletteToken } from '$lib/palette';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: project }, { data: subprojects }, { data: tasks }, defs] = await Promise.all([
		locals.supabase.from('projects').select('*').eq('id', params.id).maybeSingle(),
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
		const colorRaw = String(form.get('color') ?? '');
		const color = colorRaw && isPaletteToken(colorRaw) ? colorRaw : null;
		const body_html = sanitizeHtml(String(form.get('body_html') ?? ''));

		if (!name) return fail(400, { error: 'Name required.' });

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'projects');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: e } = await locals.supabase
			.from('projects')
			.update({ name, description, status, color, body_html, custom: custom as never })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		await locals.supabase.from('projects').delete().eq('id', params.id);
		throw redirect(303, '/projects');
	}
};
