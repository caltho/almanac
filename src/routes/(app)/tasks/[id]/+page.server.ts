import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: task }, defs] = await Promise.all([
		locals.supabase
			.from('tasks')
			.select(
				'id, owner_id, title, description, status, due_date, priority, completed_at, custom, updated_at'
			)
			.eq('id', params.id)
			.is('deleted_at', null)
			.maybeSingle(),
		loadDefs(locals.supabase, locals.user!.id, 'tasks')
	]);

	if (!task) throw error(404, 'Task not found');
	return { task, defs, canEdit: task.owner_id === locals.user!.id };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const status = String(form.get('status') ?? '') as 'todo' | 'doing' | 'done' | 'cancelled';
		const dueRaw = String(form.get('due_date') ?? '').trim();
		const due_date = dueRaw ? dueRaw : null;
		const priorityRaw = String(form.get('priority') ?? '').trim();
		const priority = priorityRaw ? Number(priorityRaw) : null;

		if (!title) return fail(400, { error: 'Title is required.' });
		if (!['todo', 'doing', 'done', 'cancelled'].includes(status)) {
			return fail(400, { error: 'Invalid status.' });
		}
		if (priority !== null && (priority < 1 || priority > 5)) {
			return fail(400, { error: 'Priority must be 1–5.' });
		}

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'tasks');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: updateError } = await locals.supabase
			.from('tasks')
			.update({
				title,
				description,
				status,
				due_date,
				priority,
				custom: custom as never
			})
			.eq('id', params.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		const { error: delError } = await locals.supabase
			.from('tasks')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', params.id);
		if (delError) return fail(500, { error: delError.message });
		throw redirect(303, '/tasks');
	}
};
