import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { currentYearMonth, monthRange } from '$lib/finance';

export const load: PageServerLoad = async ({ locals, url }) => {
	const yearMonth = url.searchParams.get('month') ?? currentYearMonth();
	const { start, end } = monthRange(yearMonth);

	const [{ data: budgets }, { data: categories }, { data: actuals }] = await Promise.all([
		locals.supabase.from('budgets').select('id, category_id, period, amount, currency'),
		locals.supabase.from('categories').select('id, name, parent_id, color'),
		locals.supabase
			.from('transactions')
			.select('category_id, amount')
			.gte('posted_at', start)
			.lte('posted_at', end)
			.is('deleted_at', null)
	]);

	// Total spend per category (positive absolute value of outgoing).
	const spendMap = new Map<string, number>();
	for (const t of actuals ?? []) {
		if (!t.category_id) continue;
		if (t.amount >= 0) continue; // income
		spendMap.set(t.category_id, (spendMap.get(t.category_id) ?? 0) + Math.abs(t.amount));
	}

	return {
		budgets: budgets ?? [],
		categories: categories ?? [],
		spendMap: Object.fromEntries(spendMap),
		yearMonth
	};
};

export const actions: Actions = {
	upsert: async ({ request, locals }) => {
		const form = await request.formData();
		const category_id = String(form.get('category_id') ?? '');
		const period = String(form.get('period') ?? 'monthly') as 'weekly' | 'monthly' | 'yearly';
		const amount = Number(form.get('amount'));

		if (!category_id) return fail(400, { error: 'Pick a category.' });
		if (!['weekly', 'monthly', 'yearly'].includes(period)) {
			return fail(400, { error: 'Bad period.' });
		}
		if (!Number.isFinite(amount) || amount < 0) {
			return fail(400, { error: 'Amount must be ≥ 0.' });
		}

		const { error } = await locals.supabase
			.from('budgets')
			.upsert(
				{ owner_id: locals.user!.id, category_id, period, amount },
				{ onConflict: 'owner_id,category_id,period' }
			);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase.from('budgets').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
