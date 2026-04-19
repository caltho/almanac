import type { PageServerLoad, Actions } from './$types';
import { loadDefs, defsActions } from '$lib/custom-attrs/server';

export const load: PageServerLoad = async ({ locals }) => {
	const [transactions, categories] = await Promise.all([
		loadDefs(locals.supabase, locals.user!.id, 'transactions'),
		loadDefs(locals.supabase, locals.user!.id, 'categories')
	]);
	return { transactions, categories };
};

export const actions = defsActions(['transactions', 'categories']) satisfies Actions;
