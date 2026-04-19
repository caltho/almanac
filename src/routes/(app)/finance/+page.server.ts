import type { PageServerLoad } from './$types';
import { currentYearMonth, monthRange } from '$lib/finance';

export const load: PageServerLoad = async ({ locals, url }) => {
	const yearMonth = url.searchParams.get('month') ?? currentYearMonth();
	const { start, end } = monthRange(yearMonth);

	const [{ data: txs }, { data: categories }, { data: budgets }] = await Promise.all([
		locals.supabase
			.from('transactions')
			.select('category_id, amount')
			.gte('posted_at', start)
			.lte('posted_at', end)
			.is('deleted_at', null),
		locals.supabase.from('categories').select('id, name, parent_id, color'),
		locals.supabase.from('budgets').select('category_id, amount, period').eq('period', 'monthly')
	]);

	let income = 0;
	let expense = 0;
	const byCat = new Map<string | null, number>();
	for (const t of txs ?? []) {
		if (t.amount >= 0) income += t.amount;
		else expense += Math.abs(t.amount);
		const key = t.category_id ?? null;
		byCat.set(key, (byCat.get(key) ?? 0) + Math.abs(t.amount) * (t.amount < 0 ? 1 : 0));
	}

	const catMap = new Map((categories ?? []).map((c) => [c.id, c]));
	const budgetMap = new Map((budgets ?? []).map((b) => [b.category_id, b.amount]));

	const rows = Array.from(byCat.entries())
		.filter(([, v]) => v > 0)
		.map(([id, spent]) => ({
			category_id: id,
			name: id ? (catMap.get(id)?.name ?? '—') : 'Uncategorised',
			color: id ? (catMap.get(id)?.color ?? null) : null,
			spent,
			budget: id ? (budgetMap.get(id) ?? 0) : 0
		}))
		.sort((a, b) => b.spent - a.spent);

	return {
		yearMonth,
		income,
		expense,
		net: income - expense,
		rows
	};
};
