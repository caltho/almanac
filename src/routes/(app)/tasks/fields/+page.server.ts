import type { PageServerLoad, Actions } from './$types';
import { loadDefs, defsActions } from '$lib/custom-attrs/server';

export const load: PageServerLoad = async ({ locals }) => {
	const defs = await loadDefs(locals.supabase, locals.user!.id, 'tasks');
	return { defs };
};

export const actions = defsActions(['tasks']) satisfies Actions;
