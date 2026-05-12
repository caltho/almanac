import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaletteToken } from '$lib/palette';

const LIST_SELECT = 'id, owner_id, name, color, created_at, updated_at';
const ITEM_SELECT = 'id, list_id, title, checked, order_index';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'createList'; name: string; color?: string | null }
		| { op: 'renameList'; id: string; name: string }
		| { op: 'setListColor'; id: string; color: string | null }
		| { op: 'deleteList'; id: string }
		| { op: 'addItem'; list_id: string; title: string }
		| { op: 'toggleItem'; id: string; checked: boolean }
		| { op: 'renameItem'; id: string; title: string }
		| { op: 'deleteItem'; id: string }
		| { op: 'reopenList'; id: string };

	if (body.op === 'createList') {
		const name = (body.name ?? '').trim();
		if (!name) throw error(400, 'Name is required');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { data, error: e } = await locals.supabase
			.from('task_lists')
			.insert({ owner_id: locals.user.id, name, color })
			.select(LIST_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ list: data });
	}

	if (body.op === 'renameList') {
		const name = (body.name ?? '').trim();
		if (!body.id || !name) throw error(400, 'Bad input');
		const { data, error: e } = await locals.supabase
			.from('task_lists')
			.update({ name })
			.eq('id', body.id)
			.select(LIST_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ list: data });
	}

	if (body.op === 'setListColor') {
		if (!body.id) throw error(400, 'Missing id');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { error: e } = await locals.supabase
			.from('task_lists')
			.update({ color })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'deleteList') {
		if (!body.id) throw error(400, 'Missing id');
		// task_list_items cascade via FK.
		const { error: e } = await locals.supabase
			.from('task_lists')
			.delete()
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'addItem') {
		const title = (body.title ?? '').trim();
		if (!body.list_id || !title) throw error(400, 'Bad input');
		// Append to the end. One small extra round-trip; lists are short.
		const { data: last } = await locals.supabase
			.from('task_list_items')
			.select('order_index')
			.eq('list_id', body.list_id)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();
		const order_index = (last?.order_index ?? -1) + 1;
		const { data, error: e } = await locals.supabase
			.from('task_list_items')
			.insert({
				owner_id: locals.user.id,
				list_id: body.list_id,
				title,
				order_index
			})
			.select(ITEM_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ item: data });
	}

	if (body.op === 'toggleItem') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('task_list_items')
			.update({ checked: !!body.checked })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'renameItem') {
		const title = (body.title ?? '').trim();
		if (!body.id || !title) throw error(400, 'Bad input');
		const { error: e } = await locals.supabase
			.from('task_list_items')
			.update({ title })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'deleteItem') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('task_list_items')
			.delete()
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'reopenList') {
		// Uncheck every item in the list — flips a "done" list back to active.
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('task_list_items')
			.update({ checked: false })
			.eq('list_id', body.id)
			.eq('checked', true);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
