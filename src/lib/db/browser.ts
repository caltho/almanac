import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { isDemoBrowser } from '$lib/demo';
import { createDemoClient } from '$lib/demo/client';
import type { Database } from './types';

let client: ReturnType<typeof createBrowserClient<Database, 'almanac'>> | undefined;

export function getSupabaseBrowserClient() {
	if (!isBrowser()) {
		throw new Error('getSupabaseBrowserClient must be called in the browser');
	}
	// Demo mode: an empty in-memory client, so the browser never talks to
	// Supabase either. Entering or leaving the demo is a full page load.
	if (isDemoBrowser()) {
		return createDemoClient() as unknown as NonNullable<typeof client>;
	}
	if (!client) {
		// Default to the `almanac` schema so `.from('x')` resolves to
		// almanac.x — see src/lib/db/server.ts for the rationale.
		client = createBrowserClient<Database, 'almanac'>(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_ANON_KEY,
			{ db: { schema: 'almanac' } }
		);
	}
	return client;
}
