import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /tracking is a tabbed parent — land users on the Habits sub-tab.
export const load: PageServerLoad = async () => {
	throw redirect(303, '/tracking/habits');
};
