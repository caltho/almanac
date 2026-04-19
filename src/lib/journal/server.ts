import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/db/types';

export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];

export async function listJournal(
	supabase: SupabaseClient<Database>,
	ownerId: string,
	opts: { limit?: number } = {}
) {
	const { data } = await supabase
		.from('journal_entries')
		.select('id, entry_date, title, body, mood, custom, owner_id, updated_at')
		.eq('owner_id', ownerId)
		.is('deleted_at', null)
		.order('entry_date', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(opts.limit ?? 50);
	return data ?? [];
}
