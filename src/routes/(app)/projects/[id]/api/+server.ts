import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaletteToken } from '$lib/palette';

const STATUSES = new Set(['active', 'done', 'archived']);

/**
 * Quick-toggle endpoint for the project detail header — color and status are
 * direct-manipulation controls (click the dot, click the status pill) and
 * shouldn't require opening the full edit form.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'setColor'; color: string | null }
		| { op: 'setStatus'; status: string };

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

	throw error(400, 'Unknown op');
};
