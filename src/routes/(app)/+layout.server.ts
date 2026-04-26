import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { loadHotData } from '$lib/stores/server';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	// hooks.server.ts already redirects unauthed users; this is a defensive guard.
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// Tag the load so any mutation can request a re-hydration with
	// `invalidate('almanac:userData')` (or `invalidateAll()` via `enhance`'s
	// default `update()`).
	depends('almanac:userData');

	const userData = await loadHotData(locals.supabase, locals.user.id);

	return {
		userData,
		// Keep `profile` at the top level for the existing layout chrome.
		profile: userData.profile
	};
};
