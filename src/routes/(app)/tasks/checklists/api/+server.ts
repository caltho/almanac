import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CHECKLIST_SELECT = 'id, owner_id, name, updated_at';
const ITEM_SELECT = 'id, checklist_id, title, checked, order_index';

/**
 * JSON endpoints for the Checklists tab. The page uses optimistic updates
 * via the userData store; these handlers persist and echo the canonical
 * row back so we can replace temp ids.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'createList'; name: string }
		| { op: 'renameList'; id: string; name: string }
		| { op: 'archiveList'; id: string }
		| { op: 'addItem'; checklist_id: string; title: string }
		| { op: 'toggleItem'; id: string; checked: boolean }
		| { op: 'deleteItem'; id: string }
		| { op: 'clearChecks'; checklist_id: string };

	if (body.op === 'createList') {
		const name = body.name?.trim();
		if (!name) throw error(400, 'Empty name');
		const { data, error: e } = await locals.supabase
			.from('checklists')
			.insert({ owner_id: locals.user.id, name })
			.select(CHECKLIST_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, list: data });
	}

	if (body.op === 'renameList') {
		const name = body.name?.trim();
		if (!body.id || !name) throw error(400, 'Bad input');
		const { error: e } = await locals.supabase
			.from('checklists')
			.update({ name })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'archiveList') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('checklists')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'addItem') {
		const title = body.title?.trim();
		if (!body.checklist_id || !title) throw error(400, 'Bad input');
		const { data: last } = await locals.supabase
			.from('checklist_items')
			.select('order_index')
			.eq('checklist_id', body.checklist_id)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();
		const { data, error: e } = await locals.supabase
			.from('checklist_items')
			.insert({
				owner_id: locals.user.id,
				checklist_id: body.checklist_id,
				title,
				order_index: (last?.order_index ?? -1) + 1
			})
			.select(ITEM_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, item: data });
	}

	if (body.op === 'toggleItem') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('checklist_items')
			.update({ checked: body.checked })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'deleteItem') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('checklist_items').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'clearChecks') {
		if (!body.checklist_id) throw error(400, 'Missing checklist_id');
		const { error: e } = await locals.supabase
			.from('checklist_items')
			.update({ checked: false })
			.eq('checklist_id', body.checklist_id)
			.eq('checked', true);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
