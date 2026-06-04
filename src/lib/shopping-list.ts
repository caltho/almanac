// Helpers for the one-shot shopping list (/food/shopping-list).
//
// `shopping_list_items` is the ephemeral "what to buy on the next shop" list,
// populated from the Supplies "Buy" section, from recipe ingredients, or by
// typing items in directly. See the SQL migration for the data model.

/** Canonical key for de-duping list entries — trimmed, lower-cased. */
export function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Pull discrete ingredient lines out of a recipe's `ingredients_html`.
 *
 * Recipe bodies come from the rich-text editor, so ingredients are usually a
 * bullet/numbered list (`<li>`), but may be loose paragraphs or `<br>`-broken
 * lines. We prefer list items when present, fall back to block elements, then
 * to newline-split text. Runs client-side (DOMParser); the SSR-safe fallback
 * keeps it from throwing if ever called during render.
 */
export function parseIngredientLines(html: string | null | undefined): string[] {
	if (!html) return [];

	let lines: string[];
	if (typeof DOMParser === 'undefined') {
		lines = html
			.replace(/<\/(li|p|div|h[1-6]|blockquote|tr)>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.split('\n');
	} else {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const lis = Array.from(doc.querySelectorAll('li'));
		if (lis.length) {
			lines = lis.map((li) => li.textContent ?? '');
		} else {
			const blocks = Array.from(doc.body.querySelectorAll('p, div, h1, h2, h3, h4, blockquote'));
			lines = blocks.length
				? blocks.map((b) => b.textContent ?? '')
				: (doc.body.textContent ?? '').split('\n');
		}
	}

	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of lines) {
		const clean = raw.replace(/\s+/g, ' ').trim();
		if (!clean) continue;
		const key = normalizeName(clean);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(clean);
	}
	return out;
}
