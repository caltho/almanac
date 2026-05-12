import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './types';

let client: ReturnType<typeof createBrowserClient<Database, 'almanac'>> | undefined;

export function getSupabaseBrowserClient() {
	if (!isBrowser()) {
		throw new Error('getSupabaseBrowserClient must be called in the browser');
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
