import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { RequestEvent } from '@sveltejs/kit';
import type { Database } from './types';

export function createSupabaseServerClient(event: Pick<RequestEvent, 'cookies'>) {
	return createServerClient<Database, 'almanac'>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		// Every domain table lives in the `almanac` schema (see
		// 20260505200000_move_to_almanac_schema.sql). PostgREST exposes the
		// schema; the client just needs to address it by default so all
		// `.from('x')` calls resolve to almanac.x without per-call schema().
		db: { schema: 'almanac' },
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;
