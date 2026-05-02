import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/db/types';
import { isPaletteToken } from '$lib/palette';

type EventUpdate = Database['public']['Tables']['events']['Update'];

const SELECT =
	'id, owner_id, title, description, start_at, end_at, all_day, location, color, custom, updated_at';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| {
				op: 'create';
				title: string;
				description?: string | null;
				start_at: string;
				end_at?: string | null;
				all_day?: boolean;
				location?: string | null;
				color?: string | null;
		  }
		| {
				op: 'update';
				id: string;
				title?: string;
				description?: string | null;
				start_at?: string;
				end_at?: string | null;
				all_day?: boolean;
				location?: string | null;
				color?: string | null;
		  }
		| { op: 'delete'; id: string };

	if (body.op === 'create') {
		const title = (body.title ?? '').trim();
		if (!title) throw error(400, 'Title is required');
		if (!body.start_at) throw error(400, 'Start time is required');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { data, error: e } = await locals.supabase
			.from('events')
			.insert({
				owner_id: locals.user.id,
				title,
				description: body.description ?? null,
				start_at: body.start_at,
				end_at: body.end_at ?? null,
				all_day: !!body.all_day,
				location: body.location ?? null,
				color
			})
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ event: data });
	}

	if (body.op === 'update') {
		if (!body.id) throw error(400, 'Missing id');
		const patch: EventUpdate = {};
		if (typeof body.title === 'string') {
			const t = body.title.trim();
			if (!t) throw error(400, 'Title is required');
			patch.title = t;
		}
		if ('description' in body) patch.description = body.description ?? null;
		if (typeof body.start_at === 'string') patch.start_at = body.start_at;
		if ('end_at' in body) patch.end_at = body.end_at ?? null;
		if (typeof body.all_day === 'boolean') patch.all_day = body.all_day;
		if ('location' in body) patch.location = body.location ?? null;
		if ('color' in body) {
			patch.color = body.color && isPaletteToken(body.color) ? body.color : null;
		}
		if (Object.keys(patch).length === 0) return json({ ok: true });
		const { data, error: e } = await locals.supabase
			.from('events')
			.update(patch)
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ event: data });
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('events').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
