import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// hooks.server.ts already redirects unauthed users; this is a defensive guard.
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, display_name, avatar_url')
		.eq('id', locals.user.id)
		.single();

	return {
		profile
	};
};
