import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /food is a tabbed parent — land users on the Shopping sub-tab.
export const load: PageServerLoad = async () => {
	throw redirect(303, '/food/shopping');
};
