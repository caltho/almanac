import type { PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { listJournal } from '$lib/journal/server';

export const load: PageServerLoad = async ({ locals }) => {
	const ownerId = locals.user!.id;
	const [entries, defs] = await Promise.all([
		listJournal(locals.supabase, ownerId),
		loadDefs(locals.supabase, ownerId, 'journal_entries')
	]);
	return { entries, defs };
};
