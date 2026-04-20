import type { PageServerLoad } from './$types';

/**
 * Home dashboard — one round trip, one view of today.
 * All queries run in parallel via Promise.all so the page's TTFB is bounded
 * by the single slowest query (journal entries, usually).
 */

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
	const out: string[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	for (let i = 0; i < n; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		out.push(d.toISOString().slice(0, 10));
	}
	return out;
}

function currentYearMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(ym: string) {
	const [y, m] = ym.split('-').map(Number);
	return {
		start: new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10),
		end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const today = todayIso();
	const days = lastNDays(7);
	const ym = currentYearMonth();
	const { start, end } = monthRange(ym);

	const [
		{ data: recentJournal },
		{ data: openTasks },
		{ data: habits },
		{ data: habitChecksToday },
		{ data: lastSleep },
		{ data: monthTxs }
	] = await Promise.all([
		locals.supabase
			.from('journal_entries')
			.select('id, entry_date, title, mood')
			.is('deleted_at', null)
			.order('entry_date', { ascending: false })
			.order('created_at', { ascending: false })
			.limit(3),
		locals.supabase
			.from('tasks')
			.select('id, title, status, due_date, priority')
			.is('deleted_at', null)
			.in('status', ['todo', 'doing'])
			.order('due_date', { ascending: true, nullsFirst: false })
			.limit(5),
		locals.supabase
			.from('habits')
			.select('id, name, cadence')
			.is('archived_at', null)
			.order('name'),
		locals.supabase
			.from('habit_checks')
			.select('habit_id, check_date')
			.gte('check_date', days[days.length - 1]),
		locals.supabase
			.from('sleep_logs')
			.select('log_date, hours_slept, quality')
			.is('deleted_at', null)
			.order('log_date', { ascending: false })
			.limit(1),
		locals.supabase
			.from('transactions')
			.select('amount')
			.gte('posted_at', start)
			.lte('posted_at', end)
			.is('deleted_at', null)
	]);

	// Today's habit-tick state per habit, for the dashboard checkbox row.
	const tickedToday = new Set(
		(habitChecksToday ?? []).filter((c) => c.check_date === today).map((c) => c.habit_id)
	);

	// Finance KPIs
	let income = 0;
	let spend = 0;
	for (const t of monthTxs ?? []) {
		if (t.amount >= 0) income += t.amount;
		else spend += Math.abs(t.amount);
	}

	return {
		today,
		recentJournal: recentJournal ?? [],
		openTasks: openTasks ?? [],
		habits: habits ?? [],
		tickedToday: [...tickedToday],
		lastSleep: lastSleep?.[0] ?? null,
		finance: { income, spend, net: income - spend, yearMonth: ym }
	};
};
