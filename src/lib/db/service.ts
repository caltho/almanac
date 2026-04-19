// SERVER-ONLY. Never import from client code.
// Uses the service-role key and bypasses RLS — use sparingly and audit every call site.
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from './types';

let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseServiceClient() {
	if (!client) {
		client = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
	}
	return client;
}
