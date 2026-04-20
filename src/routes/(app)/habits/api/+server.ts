import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Lightweight JSON endpoints for instant-feedback UI on the habits page.
 * Paired with optimistic client-side state — page.svelte mutates the local
 * tick map immediately, then posts here in the background.
 */

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as {
		op: 'toggle' | 'archive';
		habit_id?: string;
		check_date?: string;
		done?: boolean;
	};

	if (body.op === 'toggle') {
		if (!body.habit_id || !body.check_date) throw error(400, 'Missing habit_id / check_date');
		if (body.done) {
			const { error: e } = await locals.supabase.from('habit_checks').insert({
				owner_id: locals.user.id,
				habit_id: body.habit_id,
				check_date: body.check_date
			});
			if (e && e.code !== '23505') throw error(500, e.message);
		} else {
			const { error: e } = await locals.supabase
				.from('habit_checks')
				.delete()
				.eq('habit_id', body.habit_id)
				.eq('check_date', body.check_date);
			if (e) throw error(500, e.message);
		}
		return json({ ok: true });
	}

	if (body.op === 'archive') {
		if (!body.habit_id) throw error(400, 'Missing habit_id');
		const { error: e } = await locals.supabase
			.from('habits')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', body.habit_id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
