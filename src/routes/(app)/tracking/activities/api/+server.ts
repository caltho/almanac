import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaletteToken } from '$lib/palette';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVITY_SELECT = 'id, owner_id, name, color, order_index, updated_at';

/**
 * JSON endpoints for the Activities page — paired with optimistic client-side
 * updates in +page.svelte. Toggle is idempotent thanks to the unique
 * (activity_id, log_date) index on activity_logs.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| { op: 'toggle'; activity_id: string; log_date: string; on: boolean }
		| { op: 'create'; name: string; color?: string | null }
		| { op: 'rename'; id: string; name: string }
		| { op: 'setColor'; id: string; color: string | null }
		| { op: 'archive'; id: string };

	if (body.op === 'toggle') {
		if (!body.activity_id || !DATE_RE.test(body.log_date)) {
			throw error(400, 'Bad input');
		}
		if (body.on) {
			const { data, error: e } = await locals.supabase
				.from('activity_logs')
				.insert({
					owner_id: locals.user.id,
					activity_id: body.activity_id,
					log_date: body.log_date
				})
				.select('id, activity_id, log_date')
				.single();
			if (e && e.code !== '23505') throw error(500, e.message);
			if (!data) {
				const { data: existing } = await locals.supabase
					.from('activity_logs')
					.select('id, activity_id, log_date')
					.eq('activity_id', body.activity_id)
					.eq('log_date', body.log_date)
					.maybeSingle();
				return json({ ok: true, log: existing });
			}
			return json({ ok: true, log: data });
		}
		const { error: e } = await locals.supabase
			.from('activity_logs')
			.delete()
			.eq('activity_id', body.activity_id)
			.eq('log_date', body.log_date);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'create') {
		const name = (body.name ?? '').trim();
		if (!name) throw error(400, 'Empty name');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { data: last } = await locals.supabase
			.from('activities')
			.select('order_index')
			.eq('owner_id', locals.user.id)
			.is('archived_at', null)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();
		const { data, error: e } = await locals.supabase
			.from('activities')
			.insert({
				owner_id: locals.user.id,
				name,
				color,
				order_index: (last?.order_index ?? -1) + 1
			})
			.select(ACTIVITY_SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, activity: data });
	}

	if (body.op === 'rename') {
		const name = (body.name ?? '').trim();
		if (!body.id || !name) throw error(400, 'Bad input');
		const { error: e } = await locals.supabase
			.from('activities')
			.update({ name })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'setColor') {
		if (!body.id) throw error(400, 'Missing id');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { error: e } = await locals.supabase
			.from('activities')
			.update({ color })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'archive') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('activities')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
