import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as {
		op: 'status' | 'delete' | 'create';
		id?: string;
		status?: 'todo' | 'doing' | 'done' | 'cancelled';
		title?: string;
	};

	if (body.op === 'status') {
		if (!body.id || !body.status) throw error(400, 'Missing id/status');
		if (!['todo', 'doing', 'done', 'cancelled'].includes(body.status)) {
			throw error(400, 'Invalid status');
		}
		const { error: e } = await locals.supabase
			.from('tasks')
			.update({ status: body.status })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('tasks').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'create') {
		const title = (body.title ?? '').trim();
		if (!title) throw error(400, 'Title required');
		const { data, error: e } = await locals.supabase
			.from('tasks')
			.insert({ owner_id: locals.user.id, title })
			.select('id, title, status, due_date, priority, description, custom, updated_at')
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, task: data });
	}

	throw error(400, 'Unknown op');
};
