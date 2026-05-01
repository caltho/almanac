import type { PageServerLoad, Actions } from './$types';
import { loadDefs, defsActions } from '$lib/custom-attrs/server';

// Single source of truth for the per-domain custom-attribute editors. Every
// fixed-domain table that supports `custom jsonb` lives in this whitelist —
// adding a new domain means appending its table name here and rendering one
// more <DefsManager /> in the matching +page.svelte.
const TABLES = [
	'journal_entries',
	'sleep_logs',
	'tasks',
	'habits',
	'projects',
	'transactions',
	'categories',
	'assets'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const results = await Promise.all(TABLES.map((t) => loadDefs(locals.supabase, userId, t)));
	const defs = Object.fromEntries(TABLES.map((t, i) => [t, results[i]])) as Record<
		(typeof TABLES)[number],
		Awaited<ReturnType<typeof loadDefs>>
	>;
	return { defs };
};

export const actions = defsActions([...TABLES]) satisfies Actions;
