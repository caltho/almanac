import { z } from 'zod';

export const ruleSchema = z.object({
	kind: z.enum(['keyword', 'regex']),
	pattern: z.string().min(1),
	case_sensitive: z.boolean().optional().default(false)
});

export type Rule = z.infer<typeof ruleSchema>;

export const rulesSchema = z.array(ruleSchema);

/**
 * Check whether any rule in the list matches the given description.
 * - keyword: substring match
 * - regex: full-description regex match
 * Invalid regexes fail quietly (as if the rule didn't match).
 */
export function anyRuleMatches(rules: Rule[], description: string): boolean {
	for (const r of rules) {
		if (!r.pattern) continue;
		const d = r.case_sensitive ? description : description.toLowerCase();
		const p = r.case_sensitive ? r.pattern : r.pattern.toLowerCase();
		if (r.kind === 'keyword') {
			if (d.includes(p)) return true;
		} else {
			try {
				const re = new RegExp(r.pattern, r.case_sensitive ? '' : 'i');
				if (re.test(description)) return true;
			} catch {
				/* invalid regex -> skip */
			}
		}
	}
	return false;
}

/**
 * Parse rules from jsonb, dropping entries that don't validate.
 */
export function parseRules(raw: unknown): Rule[] {
	if (!Array.isArray(raw)) return [];
	const out: Rule[] = [];
	for (const r of raw) {
		const parsed = ruleSchema.safeParse(r);
		if (parsed.success) out.push(parsed.data);
	}
	return out;
}
