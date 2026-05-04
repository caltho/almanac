import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/db/types';
import { isPaletteToken } from '$lib/palette';

type PersonUpdate = Database['public']['Tables']['people']['Update'];

const SELECT =
	'id, owner_id, name, email, phone, notes, color, avatar_url, birthday_month, birthday_day, birthday_year, tags, last_contacted_at, updated_at';

function normaliseTags(input: unknown): string[] | null {
	if (input === undefined) return null;
	if (input === null) return [];
	if (!Array.isArray(input)) return [];
	const seen = new Set<string>();
	for (const raw of input) {
		if (typeof raw !== 'string') continue;
		const t = raw.trim().toLowerCase();
		if (!t) continue;
		if (t.length > 32) continue;
		seen.add(t);
	}
	return [...seen];
}

function validMonthDay(month: number, day: number): boolean {
	if (!Number.isInteger(month) || month < 1 || month > 12) return false;
	if (!Number.isInteger(day) || day < 1 || day > 31) return false;
	// Leap-friendly via a leap year so Feb 29 is allowed.
	const probe = new Date(2024, month - 1, day);
	return probe.getMonth() === month - 1 && probe.getDate() === day;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as
		| {
				op: 'create';
				name: string;
				email?: string | null;
				phone?: string | null;
				notes?: string | null;
				color?: string | null;
				avatar_url?: string | null;
				birthday_month?: number | null;
				birthday_day?: number | null;
				birthday_year?: number | null;
				tags?: string[];
		  }
		| {
				op: 'update';
				id: string;
				name?: string;
				email?: string | null;
				phone?: string | null;
				notes?: string | null;
				color?: string | null;
				avatar_url?: string | null;
				birthday_month?: number | null;
				birthday_day?: number | null;
				birthday_year?: number | null;
				tags?: string[];
		  }
		| { op: 'markContacted'; id: string; at?: string | null }
		| { op: 'delete'; id: string };

	if (body.op === 'create') {
		const name = (body.name ?? '').trim();
		if (!name) throw error(400, 'Name is required');

		const month = body.birthday_month ?? null;
		const day = body.birthday_day ?? null;
		// Either both set or neither — matches the people_birthday_pair check.
		if ((month === null) !== (day === null)) {
			throw error(400, 'Birthday needs both month and day, or neither');
		}
		if (month !== null && day !== null && !validMonthDay(month, day)) {
			throw error(400, 'Invalid birthday date');
		}

		const color = body.color && isPaletteToken(body.color) ? body.color : null;
		const tags = normaliseTags(body.tags) ?? [];
		const { data, error: e } = await locals.supabase
			.from('people')
			.insert({
				owner_id: locals.user.id,
				name,
				email: body.email ?? null,
				phone: body.phone ?? null,
				notes: body.notes ?? null,
				color,
				avatar_url: body.avatar_url ?? null,
				birthday_month: month,
				birthday_day: day,
				birthday_year: body.birthday_year ?? null,
				tags
			})
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ person: data });
	}

	if (body.op === 'update') {
		if (!body.id) throw error(400, 'Missing id');
		const patch: PersonUpdate = {};

		if (typeof body.name === 'string') {
			const n = body.name.trim();
			if (!n) throw error(400, 'Name is required');
			patch.name = n;
		}
		if ('email' in body) patch.email = body.email ?? null;
		if ('phone' in body) patch.phone = body.phone ?? null;
		if ('notes' in body) patch.notes = body.notes ?? null;
		if ('avatar_url' in body) patch.avatar_url = body.avatar_url ?? null;
		if ('color' in body) {
			patch.color = body.color && isPaletteToken(body.color) ? body.color : null;
		}

		// Birthday update: month + day move together. Year is independent.
		const monthTouched = 'birthday_month' in body;
		const dayTouched = 'birthday_day' in body;
		if (monthTouched || dayTouched) {
			const month = body.birthday_month ?? null;
			const day = body.birthday_day ?? null;
			if ((month === null) !== (day === null)) {
				throw error(400, 'Birthday needs both month and day, or neither');
			}
			if (month !== null && day !== null && !validMonthDay(month, day)) {
				throw error(400, 'Invalid birthday date');
			}
			patch.birthday_month = month;
			patch.birthday_day = day;
		}
		if ('birthday_year' in body) patch.birthday_year = body.birthday_year ?? null;

		if ('tags' in body) {
			const tags = normaliseTags(body.tags);
			if (tags !== null) patch.tags = tags;
		}

		if (Object.keys(patch).length === 0) return json({ ok: true });

		const { data, error: e } = await locals.supabase
			.from('people')
			.update(patch)
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ person: data });
	}

	if (body.op === 'markContacted') {
		if (!body.id) throw error(400, 'Missing id');
		const at = body.at === null ? null : (body.at ?? new Date().toISOString());
		const { data, error: e } = await locals.supabase
			.from('people')
			.update({ last_contacted_at: at })
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ person: data });
	}

	if (body.op === 'delete') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase.from('people').delete().eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
