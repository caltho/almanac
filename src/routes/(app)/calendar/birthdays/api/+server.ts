import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/db/types';
import { isPaletteToken } from '$lib/palette';

type BirthdayUpdate = Database['public']['Tables']['birthdays']['Update'];

const SELECT = 'id, owner_id, name, month, day, year, notes, color, updated_at';

function validMonthDay(month: number, day: number): boolean {
	if (!Number.isInteger(month) || month < 1 || month > 12) return false;
	if (!Number.isInteger(day) || day < 1 || day > 31) return false;
	// Leap-friendly check via a leap year, so Feb 29 is allowed.
	const probe = new Date(2024, month - 1, day);
	return probe.getMonth() === month - 1 && probe.getDate() === day;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| {
				op: 'create';
				name: string;
				month: number;
				day: number;
				year?: number | null;
				notes?: string | null;
				color?: string | null;
		  }
		| {
				op: 'update';
				id: string;
				name?: string;
				month?: number;
				day?: number;
				year?: number | null;
				notes?: string | null;
				color?: string | null;
		  }
		| { op: 'delete'; id: string };

	if (body.op === 'create') {
		const name = (body.name ?? '').trim();
		if (!name) throw error(400, 'Name is required');
		if (!validMonthDay(body.month, body.day)) throw error(400, 'Invalid date');
		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const { data, error: e } = await locals.supabase
			.from('birthdays')
			.insert({
				owner_id: locals.user.id,
				name,
				month: body.month,
				day: body.day,
				year: body.year ?? null,
				notes: body.notes ?? null,
				color
			})
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ birthday: data });
	}

	if (body.op === 'update') {
		if (!body.id) throw error(400, 'Missing id');
		const patch: BirthdayUpdate = {};
		if (typeof body.name === 'string') {
			const n = body.name.trim();
			if (!n) throw error(400, 'Name is required');
			patch.name = n;
		}
		if (typeof body.month === 'number' || typeof body.day === 'number') {
			// If either is being updated we need both to validate the pair.
			const month = typeof body.month === 'number' ? body.month : undefined;
			const day = typeof body.day === 'number' ? body.day : undefined;
			if (month !== undefined && day !== undefined && !validMonthDay(month, day)) {
				throw error(400, 'Invalid date');
			}
			if (month !== undefined) patch.month = month;
			if (day !== undefined) patch.day = day;
		}
		if ('year' in body) patch.year = body.year ?? null;
		if ('notes' in body) patch.notes = body.notes ?? null;
		if ('color' in body) {
			patch.color = body.color && isPaletteToken(body.color) ? body.color : null;
		}
		if (Object.keys(patch).length === 0) return json({ ok: true });
		const { data, error: e } = await locals.supabase
			.from('birthdays')
			.update(patch)
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ birthday: data });
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('birthdays').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
