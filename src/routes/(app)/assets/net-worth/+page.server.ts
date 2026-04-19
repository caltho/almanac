import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: snapshots }, { data: assets }] = await Promise.all([
		locals.supabase
			.from('net_worth_snapshots')
			.select('id, snapshot_date, total_value, breakdown, currency, note')
			.order('snapshot_date', { ascending: true })
			.limit(365),
		locals.supabase.from('assets').select('kind, value, currency').is('archived_at', null)
	]);

	// Current totals (right now) for the "take a snapshot" preview.
	const currentBreakdown: Record<string, number> = {};
	let currentTotal = 0;
	for (const a of assets ?? []) {
		const v = typeof a.value === 'number' ? a.value : 0;
		currentBreakdown[a.kind] = (currentBreakdown[a.kind] ?? 0) + v;
		currentTotal += v;
	}

	return {
		snapshots: snapshots ?? [],
		current: { total: currentTotal, breakdown: currentBreakdown }
	};
};

export const actions: Actions = {
	takeSnapshot: async ({ request, locals }) => {
		const form = await request.formData();
		const note = String(form.get('note') ?? '').trim() || null;

		const { data: assets } = await locals.supabase
			.from('assets')
			.select('kind, value')
			.is('archived_at', null);

		const breakdown: Record<string, number> = {};
		let total = 0;
		for (const a of assets ?? []) {
			const v = typeof a.value === 'number' ? a.value : 0;
			breakdown[a.kind] = (breakdown[a.kind] ?? 0) + v;
			total += v;
		}

		const { error } = await locals.supabase.from('net_worth_snapshots').upsert(
			{
				owner_id: locals.user!.id,
				snapshot_date: new Date().toISOString().slice(0, 10),
				total_value: total,
				breakdown: breakdown as never,
				note
			},
			{ onConflict: 'owner_id,snapshot_date' }
		);
		if (error) return fail(500, { error: error.message });
		return { created: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase.from('net_worth_snapshots').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
