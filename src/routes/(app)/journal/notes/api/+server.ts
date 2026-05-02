import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaletteToken } from '$lib/palette';

const NOTE_SELECT =
	'id, owner_id, title, body, color, internalised, created_at, updated_at';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'create'; title: string; body?: string }
		| { op: 'update'; id: string; title?: string; body?: string }
		| { op: 'setColor'; id: string; color: string | null }
		| { op: 'setInternalised'; id: string; internalised: boolean }
		| { op: 'delete'; id: string };

	if (body.op === 'create') {
		const title = (body.title ?? '').trim();
		if (!title) throw error(400, 'Title is required');
		const noteBody = (body.body ?? '').trim();
		const { data, error: e } = await locals.supabase
			.from('quick_notes')
			.insert({ owner_id: locals.user.id, title, body: noteBody })
			.select(NOTE_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ note: data });
	}

	if (body.op === 'update') {
		if (!body.id) throw error(400, 'Missing id');
		const patch: { title?: string; body?: string } = {};
		if (typeof body.title === 'string') {
			const t = body.title.trim();
			if (!t) throw error(400, 'Title is required');
			patch.title = t;
		}
		if (typeof body.body === 'string') patch.body = body.body.trim();
		if (Object.keys(patch).length === 0) return json({ ok: true });
		const { data, error: e } = await locals.supabase
			.from('quick_notes')
			.update(patch)
			.eq('id', body.id)
			.select(NOTE_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ note: data });
	}

	if (body.op === 'setColor') {
		if (!body.id) throw error(400, 'Missing id');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { error: e } = await locals.supabase
			.from('quick_notes')
			.update({ color })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'setInternalised') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('quick_notes')
			.update({ internalised: !!body.internalised })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('quick_notes').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
