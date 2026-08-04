import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaletteToken } from '$lib/palette';
import { sanitizeHtml } from '$lib/server/sanitize-html';

const STATUSES = new Set(['active', 'done', 'archived']);
const BLOCK_SELECT = 'id, owner_id, project_id, heading, body_html, order_index';
const HEADING_MAX = 200;

/**
 * JSON endpoint for the project detail page.
 *
 * Two direct-manipulation header controls (color + status) flip immediately
 * without opening the edit form, plus the project-blocks CRUD: notes are an
 * ordered list of rich-text blocks, edited optimistically via the userData
 * store. Block handlers echo the canonical row back so the page can swap temp
 * ids and pick up the server-sanitized HTML.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'setColor'; color: string | null }
		| { op: 'setStatus'; status: string }
		| { op: 'addBlock'; heading?: string | null; body_html?: string }
		| { op: 'updateBlock'; id: string; heading?: string | null; body_html?: string }
		| { op: 'deleteBlock'; id: string }
		| { op: 'reorderBlocks'; ids: string[] };

	if (body.op === 'setColor') {
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { error: e } = await locals.supabase
			.from('projects')
			.update({ color })
			.eq('id', params.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'setStatus') {
		if (!STATUSES.has(body.status)) throw error(400, 'Bad status');
		const { error: e } = await locals.supabase
			.from('projects')
			.update({ status: body.status })
			.eq('id', params.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'addBlock') {
		const heading = (body.heading ?? '').trim().slice(0, HEADING_MAX) || null;
		const body_html = sanitizeHtml(body.body_html ?? '');
		// New blocks land at the end of the list.
		const { data: last } = await locals.supabase
			.from('project_blocks')
			.select('order_index')
			.eq('project_id', params.id)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();
		const { data, error: e } = await locals.supabase
			.from('project_blocks')
			.insert({
				owner_id: locals.user.id,
				project_id: params.id,
				heading,
				body_html,
				order_index: (last?.order_index ?? -1) + 1
			})
			.select(BLOCK_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, block: data });
	}

	if (body.op === 'updateBlock') {
		if (!body.id) throw error(400, 'Missing id');
		const heading = (body.heading ?? '').trim().slice(0, HEADING_MAX) || null;
		const body_html = sanitizeHtml(body.body_html ?? '');
		const { data, error: e } = await locals.supabase
			.from('project_blocks')
			.update({ heading, body_html })
			.eq('id', body.id)
			.eq('project_id', params.id)
			.select(BLOCK_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, block: data });
	}

	if (body.op === 'deleteBlock') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('project_blocks')
			.delete()
			.eq('id', body.id)
			.eq('project_id', params.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'reorderBlocks') {
		if (!Array.isArray(body.ids)) throw error(400, 'Bad input');
		// Normalise order_index to the sent sequence. N is tiny (a handful of
		// blocks per project), so per-row updates are fine.
		for (let i = 0; i < body.ids.length; i++) {
			const { error: e } = await locals.supabase
				.from('project_blocks')
				.update({ order_index: i })
				.eq('id', body.ids[i])
				.eq('project_id', params.id);
			if (e) throw error(500, e.message);
		}
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
