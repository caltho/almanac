import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/db/types';
import type { SupabaseServerClient } from '$lib/db/server';
import { isPaletteToken } from '$lib/palette';

type EventUpdate = Database['public']['Tables']['events']['Update'];

const SELECT =
	'id, owner_id, title, description, start_at, end_at, all_day, location, color, custom, updated_at';

// Replace the full set of person links for an event. Cheap because the
// event_people junction has no payload — diffs aren't worth the bookkeeping
// over a wholesale delete-then-insert, and RLS handles the boundary.
async function syncEventPeople(
	supabase: SupabaseServerClient,
	ownerId: string,
	eventId: string,
	personIds: string[]
): Promise<void> {
	const { error: delErr } = await supabase
		.from('event_people')
		.delete()
		.eq('event_id', eventId);
	if (delErr) throw error(500, delErr.message);
	if (personIds.length === 0) return;
	const rows = personIds.map((pid) => ({
		event_id: eventId,
		person_id: pid,
		owner_id: ownerId
	}));
	const { error: insErr } = await supabase.from('event_people').insert(rows);
	if (insErr) throw error(500, insErr.message);
}

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
				person_ids?: string[];
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
				person_ids?: string[];
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
		if (Array.isArray(body.person_ids) && body.person_ids.length > 0) {
			await syncEventPeople(locals.supabase, locals.user.id, data.id, body.person_ids);
		}
		return json({
			event: data,
			person_ids: Array.isArray(body.person_ids) ? body.person_ids : []
		});
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
		const peopleTouched = 'person_ids' in body;
		if (Object.keys(patch).length === 0 && !peopleTouched) return json({ ok: true });
		let updated;
		if (Object.keys(patch).length > 0) {
			const { data, error: e } = await locals.supabase
				.from('events')
				.update(patch)
				.eq('id', body.id)
				.select(SELECT)
				.single();
			if (e) throw error(500, e.message);
			updated = data;
		} else {
			const { data, error: e } = await locals.supabase
				.from('events')
				.select(SELECT)
				.eq('id', body.id)
				.single();
			if (e) throw error(500, e.message);
			updated = data;
		}
		if (peopleTouched) {
			await syncEventPeople(
				locals.supabase,
				locals.user.id,
				body.id,
				Array.isArray(body.person_ids) ? body.person_ids : []
			);
		}
		return json({
			event: updated,
			person_ids: peopleTouched ? (body.person_ids ?? []) : null
		});
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		// event_people junction rows cascade via the FK on event_id.
		const { error: e } = await locals.supabase.from('events').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
