import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/db/types';
import { anyRuleMatches, parseRules } from './rules';

export type CategoriseHit = {
	category_id: string | null;
	source: 'rule' | 'trgm' | 'unclassified';
};

// Only the fields we actually need — lets callers pass partial selects.
export type CategoryWithRules = {
	id: string;
	rules: Database['public']['Tables']['categories']['Row']['rules'];
};

/**
 * Given a set of user categories and a description, return the first matching
 * category_id by rule, or null if none match.
 */
export function categoriseByRules(
	categories: CategoryWithRules[],
	description: string
): string | null {
	for (const c of categories) {
		const rules = parseRules(c.rules);
		if (rules.length === 0) continue;
		if (anyRuleMatches(rules, description)) return c.id;
	}
	return null;
}

/**
 * Orchestrate: rules → pg_trgm similarity → null.
 * Note: pg_trgm lookup runs as the authenticated user (RLS-scoped).
 */
export async function categorise(
	supabase: SupabaseClient<Database>,
	categories: CategoryWithRules[],
	description: string
): Promise<CategoriseHit> {
	const ruleHit = categoriseByRules(categories, description);
	if (ruleHit) return { category_id: ruleHit, source: 'rule' };

	const { data: trgmMatch } = await supabase.rpc('suggest_category_by_similarity', {
		p_description: description
	});
	if (trgmMatch) return { category_id: trgmMatch, source: 'trgm' };

	return { category_id: null, source: 'unclassified' };
}
