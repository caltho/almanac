import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';

export const load: PageServerLoad = async ({ locals }) => {
	const ownerId = locals.user!.id;
	const [{ data: tasks }, defs] = await Promise.all([
		locals.supabase
			.from('tasks')
			.select(
				'id, owner_id, title, description, status, due_date, priority, completed_at, custom, updated_at'
			)
			.is('deleted_at', null)
			.order('status', { ascending: true })
			.order('due_date', { ascending: true, nullsFirst: false })
			.order('created_at', { ascending: false }),
		loadDefs(locals.supabase, ownerId, 'tasks')
	]);
	return { tasks: tasks ?? [], defs };
};

export const actions: Actions = {
	quickAdd: async ({ request, locals }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Title is required.' });

		const { error } = await locals.supabase.from('tasks').insert({
			owner_id: locals.user!.id,
			title
		});
		if (error) return fail(500, { error: error.message });
		return { added: true };
	},

	setStatus: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		if (!['todo', 'doing', 'done', 'cancelled'].includes(status)) {
			return fail(400, { error: 'Invalid status.' });
		}
		const { error } = await locals.supabase
			.from('tasks')
			.update({ status: status as 'todo' | 'doing' | 'done' | 'cancelled' })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { updated: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		// Hard delete — soft-delete was tripping an RLS edge case (post-update
		// SELECT RLS blocked `deleted_at is not null`, which PostgREST reads as
		// a policy violation). Tasks don't need tombstones.
		const { error } = await locals.supabase.from('tasks').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
