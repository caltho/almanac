import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';

const WEEK = 7;

function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
	const out: string[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	for (let i = 0; i < n; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		out.push(isoDate(d));
	}
	return out;
}

export const load: PageServerLoad = async ({ locals }) => {
	const ownerId = locals.user!.id;
	const days = lastNDays(WEEK);
	const oldest = days[days.length - 1];

	const [{ data: habits }, { data: checks }, defs] = await Promise.all([
		locals.supabase
			.from('habits')
			.select('id, owner_id, name, description, cadence, archived_at, custom, updated_at')
			.is('archived_at', null)
			.order('created_at', { ascending: true }),
		locals.supabase
			.from('habit_checks')
			.select('id, habit_id, check_date')
			.gte('check_date', oldest),
		loadDefs(locals.supabase, ownerId, 'habits')
	]);

	// Map habit_id -> set of dates checked in the window.
	const ticks = new Map<string, Set<string>>();
	for (const c of checks ?? []) {
		if (!ticks.has(c.habit_id)) ticks.set(c.habit_id, new Set());
		ticks.get(c.habit_id)!.add(c.check_date);
	}

	return {
		habits: habits ?? [],
		days,
		ticks: Object.fromEntries(Array.from(ticks.entries()).map(([k, v]) => [k, [...v]])),
		defs
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const cadence = String(form.get('cadence') ?? 'daily').trim() || 'daily';
		if (!name) return fail(400, { error: 'Name is required.' });
		const { error } = await locals.supabase.from('habits').insert({
			owner_id: locals.user!.id,
			name,
			cadence
		});
		if (error) return fail(500, { error: error.message });
		return { added: true };
	},

	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		const habit_id = String(form.get('habit_id') ?? '');
		const check_date = String(form.get('check_date') ?? '');
		if (!habit_id || !/^\d{4}-\d{2}-\d{2}$/.test(check_date)) {
			return fail(400, { error: 'Bad input.' });
		}

		// Attempt delete; if nothing removed, insert a check.
		const del = await locals.supabase
			.from('habit_checks')
			.delete()
			.eq('habit_id', habit_id)
			.eq('check_date', check_date)
			.select('id');

		if (del.error) return fail(500, { error: del.error.message });
		if ((del.data ?? []).length === 0) {
			const ins = await locals.supabase.from('habit_checks').insert({
				owner_id: locals.user!.id,
				habit_id,
				check_date
			});
			if (ins.error) return fail(500, { error: ins.error.message });
		}
		return { toggled: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('habits')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { archived: true };
	}
};
