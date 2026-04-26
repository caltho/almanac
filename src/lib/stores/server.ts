// Server-side hot-data loader.
//
// One `Promise.all` that fetches every "hot" table the authenticated shell
// needs to feel instant. Bounded windows on unbounded tables (habit_checks,
// transactions) keep first-paint cheap as the dataset grows.
//
// Adding a new hot table:
//   1. Add a typed field on `HotData` in `userData.svelte.ts`
//   2. Add the corresponding query + return mapping below
//   3. Add a reactive `$state` field in `UserData` and assign it in `hydrate`
//
// Don't widen this loader for cold/heavy data — keep finance history, page
// bodies (HTML can grow), asset photos, etc. on their per-route loads.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/db/types';
import type { HotData } from './userData.svelte';

const HABIT_CHECK_WINDOW_DAYS = 90;
const RECENT_TX_WINDOW_DAYS = 90;
const JOURNAL_LIMIT = 200;
const SLEEP_LIMIT = 200;

function isoDaysAgo(n: number): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

export async function loadHotData(
	supabase: SupabaseClient<Database>,
	ownerId: string
): Promise<HotData> {
	const checkSince = isoDaysAgo(HABIT_CHECK_WINDOW_DAYS);
	const txSince = isoDaysAgo(RECENT_TX_WINDOW_DAYS);

	const [
		{ data: profile },
		{ data: shares },
		{ data: defs },
		{ data: journalEntries },
		{ data: sleepLogs },
		{ data: tasks },
		{ data: habits },
		{ data: habitChecks },
		{ data: categories },
		{ data: budgets },
		{ data: recentTransactions },
		{ data: assets },
		{ data: projects },
		{ data: projectItems },
		{ data: datasets },
		{ data: shoppingItems }
	] = await Promise.all([
		supabase
			.from('profiles')
			.select('id, display_name, avatar_url')
			.eq('id', ownerId)
			.maybeSingle(),
		supabase.from('shares').select('*'),
		supabase
			.from('custom_attribute_defs')
			.select('*')
			.eq('owner_id', ownerId)
			.order('table_name', { ascending: true })
			.order('order_index', { ascending: true })
			.order('created_at', { ascending: true }),
		supabase
			.from('journal_entries')
			.select('id, owner_id, entry_date, title, body, mood, custom, updated_at')
			.is('deleted_at', null)
			.order('entry_date', { ascending: false })
			.order('created_at', { ascending: false })
			.limit(JOURNAL_LIMIT),
		supabase
			.from('sleep_logs')
			.select(
				'id, owner_id, log_date, went_to_bed, woke_up, hours_slept, quality, notes, custom, updated_at'
			)
			.is('deleted_at', null)
			.order('log_date', { ascending: false })
			.limit(SLEEP_LIMIT),
		supabase
			.from('tasks')
			.select(
				'id, owner_id, title, description, status, due_date, priority, completed_at, custom, updated_at'
			)
			.is('deleted_at', null)
			.order('status', { ascending: true })
			.order('due_date', { ascending: true, nullsFirst: false })
			.order('created_at', { ascending: false }),
		supabase
			.from('habits')
			.select('id, owner_id, name, description, cadence, archived_at, custom, updated_at')
			.is('archived_at', null)
			.order('created_at', { ascending: true }),
		supabase
			.from('habit_checks')
			.select('id, habit_id, check_date')
			.gte('check_date', checkSince),
		supabase.from('categories').select('id, name, parent_id, color').order('name'),
		supabase.from('budgets').select('category_id, amount, period'),
		supabase
			.from('transactions')
			.select(
				'id, posted_at, description, amount, currency, category_id, source, custom, updated_at'
			)
			.is('deleted_at', null)
			.gte('posted_at', txSince)
			.order('posted_at', { ascending: false })
			.order('created_at', { ascending: false }),
		supabase
			.from('assets')
			.select(
				'id, owner_id, name, kind, value, currency, acquired_on, location, tags, notes, custom, archived_at, updated_at'
			)
			.is('archived_at', null)
			.order('name', { ascending: true }),
		supabase
			.from('projects')
			.select('id, owner_id, parent_id, name, description, status, color, updated_at')
			.order('name', { ascending: true }),
		supabase
			.from('project_items')
			.select(
				'id, project_id, parent_item_id, order_index, title, notes, done_at, custom'
			)
			.order('order_index', { ascending: true }),
		supabase
			.from('datasets')
			.select('id, owner_id, name, columns, updated_at')
			.order('name', { ascending: true }),
		supabase
			.from('shopping_items')
			.select(
				'id, owner_id, name, status, restock_period, last_purchased_at, notes, custom, updated_at'
			)
			.is('archived_at', null)
			.order('name', { ascending: true })
	]);

	return {
		profile: profile ?? null,
		shares: shares ?? [],
		defs: defs ?? [],
		journalEntries: journalEntries ?? [],
		sleepLogs: sleepLogs ?? [],
		tasks: tasks ?? [],
		habits: habits ?? [],
		habitChecks: habitChecks ?? [],
		categories: categories ?? [],
		budgets: budgets ?? [],
		recentTransactions: recentTransactions ?? [],
		assets: assets ?? [],
		projects: projects ?? [],
		projectItems: projectItems ?? [],
		datasets: datasets ?? [],
		shoppingItems: shoppingItems ?? [],
		hydratedAt: Date.now()
	};
}
